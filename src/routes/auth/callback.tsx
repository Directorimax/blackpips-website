import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  consumeAuthRedirect,
  DEFAULT_AUTH_DESTINATION,
  getSafeRedirect,
} from "@/lib/auth-redirect";
import { sendNotification } from "@/services/email/notification.functions";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Signing in — BlackPips" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const startedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Recovering your sign-in session...");

  useEffect(() => {
    // Prevent React Strict Mode or rerenders from executing the callback twice.
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    let active = true;

    const recoverSession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash,
        );

        const code = searchParams.get("code");

        const callbackError =
          searchParams.get("error_description") ??
          searchParams.get("error") ??
          hashParams.get("error_description") ??
          hashParams.get("error");

        console.log("[auth] OAuth callback reached", {
          hasCode: Boolean(code),
          hasHashAccessToken: Boolean(hashParams.get("access_token")),
          pathname: window.location.pathname,
        });

        if (callbackError) {
          throw new Error(callbackError);
        }

        setStatus("Exchanging your secure sign-in code...");

        if (code) {
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          console.log("[auth] OAuth provider response", {
            hasSession: Boolean(exchangeData.session),
            error: exchangeError?.message ?? null,
          });

          if (exchangeError) {
            throw exchangeError;
          }
        }

        setStatus("Confirming your account...");

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error("We could not recover your sign-in session. Please try again.");
        }

        const user = data.session.user;
        const provider = user.app_metadata.provider ?? "unknown";

        console.log("[auth] OAuth session established", {
          provider,
          userId: user.id,
        });

        setStatus("Preparing your BlackPips account...");

        try {
          console.log("[auth] Calling welcome notification server function", {
            provider,
            userId: user.id,
          });

          const notificationResult = await sendNotification({
            data: {
              type: "welcome",
              resourceId: user.id,
            },
          });

          console.log("[auth] Welcome notification requested", {
            provider,
            userId: user.id,
            delivered: notificationResult.delivered,
          });
        } catch (notificationError) {
          // Email failure must never prevent successful authentication.
          console.error("[auth] Welcome notification request failed", notificationError);
        }

        const callbackRedirect = getSafeRedirect(searchParams.get("redirect"));

        const destination = callbackRedirect ?? consumeAuthRedirect() ?? DEFAULT_AUTH_DESTINATION;

        console.log("[auth] Redirecting after OAuth", {
          destination,
        });

        if (active) {
          navigate({
            to: destination,
            replace: true,
          });
        }
      } catch (callbackError) {
        console.error("[auth] OAuth callback error", callbackError);

        if (active) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : "We could not complete your sign-in. Please try again.",
          );
        }
      }
    };

    void recoverSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16">
      <div className="glass w-full rounded-3xl p-8 text-center shadow-elegant">
        {error ? (
          <>
            <h1 className="font-display text-2xl font-bold">Sign-in could not be completed</h1>

            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />

            <h1 className="mt-4 font-display text-2xl font-bold">Completing sign-in</h1>

            <p className="mt-2 text-sm text-muted-foreground">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
