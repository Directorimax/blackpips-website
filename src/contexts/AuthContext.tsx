import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import {
  adaptStateToRole,
  clearUserSpecificClientState,
  createSessionLifecycleState,
  readSessionLifecycleState,
  SESSION_LIFECYCLE_CHANNEL,
  writeLifecycleSyncMessage,
  writeSessionLifecycleState,
} from "@/lib/session-lifecycle";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let restorationPending = true;
    const validateRestoredSession = async (
      candidate: Session | null,
      { conservativeRole }: { conservativeRole: boolean },
    ) => {
      if (!candidate || typeof window === "undefined") return candidate;
      const now = Date.now();
      const lifecycle = readSessionLifecycleState(window.localStorage);
      // The trusted profile role is not available during restoration. Cap an
      // older learner deadline to the administrator policy until it resolves;
      // this avoids briefly giving an administrator a longer client timeout.
      const effectiveLifecycle =
        conservativeRole && lifecycle ? adaptStateToRole(lifecycle, "unknown", now) : lifecycle;
      if (effectiveLifecycle && now >= effectiveLifecycle.deadlineAt) {
        await supabase.auth.signOut({ scope: "local" });
        clearUserSpecificClientState(window.localStorage, window.sessionStorage);
        queryClient.clear();
        const message = { type: "logout" as const, at: now };
        writeLifecycleSyncMessage(window.localStorage, message);
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel(SESSION_LIFECYCLE_CHANNEL);
          channel.postMessage(message);
          channel.close();
        }
        return null;
      }
      if (!effectiveLifecycle) {
        writeSessionLifecycleState(
          window.localStorage,
          createSessionLifecycleState(now, "unknown"),
        );
      } else {
        writeSessionLifecycleState(window.localStorage, effectiveLifecycle);
      }
      return candidate;
    };
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Could not load the authentication session:", error);
      const restoredSession = await validateRestoredSession(data.session, {
        conservativeRole: true,
      });
      if (!active) return;
      setSession(restoredSession);
      restorationPending = false;
      setLoading(false);
    };

    void loadSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // getSession is the restoration gate. Ignoring its duplicate initial
      // event prevents protected UI from rendering before the deadline check.
      if (restorationPending) return;
      void validateRestoredSession(nextSession, { conservativeRole: false }).then(
        (validatedSession) => {
          if (!active) return;
          setSession(validatedSession);
          setLoading(false);
        },
      );
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async ({ scope = "local", broadcast = true } = {}) => {
        const { error } = await supabase.auth.signOut({ scope });
        if (error) throw error;
        setSession(null);
        queryClient.clear();
        if (typeof window !== "undefined") {
          clearUserSpecificClientState(window.localStorage, window.sessionStorage);
          if (broadcast) {
            const message = { type: "logout" as const, at: Date.now() };
            writeLifecycleSyncMessage(window.localStorage, message);
            if ("BroadcastChannel" in window) {
              const channel = new BroadcastChannel(SESSION_LIFECYCLE_CHANNEL);
              channel.postMessage(message);
              channel.close();
            }
          }
        }
      },
    }),
    [loading, queryClient, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
