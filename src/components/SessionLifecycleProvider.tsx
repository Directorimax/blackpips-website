import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SessionExpiryDialog } from "@/components/SessionExpiryDialog";
import { SessionLifecycleContext } from "@/contexts/session-lifecycle-context";
import { useAuth } from "@/contexts/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptNewerLifecycleState,
  adaptStateToRole,
  applyMeaningfulActivity,
  createSessionLifecycleState,
  extendDeadlineForLessonPlayback,
  getSessionLifecyclePhase,
  parseLifecycleSyncMessage,
  readSessionLifecycleState,
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_LIFECYCLE_CHANNEL,
  SESSION_LIFECYCLE_SYNC_KEY,
  shouldSuspendInactivityForLessonVideo,
  type SessionLifecycleMessage,
  type SessionLifecycleState,
  writeLifecycleSyncMessage,
  writeSessionLifecycleState,
} from "@/lib/session-lifecycle";
import { getInactivityPolicy, type SessionLifecycleRole } from "@/lib/session-policy";
import { buildInternalLocationPath } from "@/lib/auth-redirect";

export function SessionLifecycleProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const role: SessionLifecycleRole = adminLoading ? "unknown" : isAdmin ? "admin" : "learner";
  const roleRef = useRef(role);
  const stateRef = useRef<SessionLifecycleState | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const lastHandledActivityRef = useRef(0);
  const videoPlayingRef = useRef(false);
  const videoPlaybackStartedAtRef = useRef<number | null>(null);
  const routeInitializedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const logoutInProgressRef = useRef(false);
  const evaluateRef = useRef<() => void>(() => undefined);
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  roleRef.current = role;

  const clearTimers = useCallback(() => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
    transitionTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  const redirectAfterInactivity = useCallback(async () => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;
    clearTimers();
    setWarningOpen(false);
    const returnPath = buildInternalLocationPath({
      pathname: location.pathname,
      searchStr: location.searchStr,
      hash: location.hash,
    });
    try {
      await signOut({ scope: "local" });
    } finally {
      toast.error("You were signed out due to inactivity.");
      void navigate({ to: "/auth", search: { redirect: returnPath } });
    }
  }, [clearTimers, location.hash, location.pathname, location.searchStr, navigate, signOut]);

  const evaluate = useCallback(() => {
    clearTimers();
    if (!user || authLoading || !stateRef.current) {
      setWarningOpen(false);
      return;
    }
    if (shouldSuspendInactivityForLessonVideo(videoPlayingRef.current, document.visibilityState))
      return;
    const now = Date.now();
    const state = stateRef.current;
    const phase = getSessionLifecyclePhase(state, now, roleRef.current);
    if (phase === "expired") {
      void redirectAfterInactivity();
      return;
    }
    if (phase === "warning") {
      setWarningOpen(true);
      const updateCountdown = () =>
        setSecondsRemaining(Math.max(0, Math.ceil((state.deadlineAt - Date.now()) / 1000)));
      updateCountdown();
      countdownTimerRef.current = window.setInterval(updateCountdown, 1_000);
      transitionTimerRef.current = window.setTimeout(
        () => void redirectAfterInactivity(),
        Math.max(0, state.deadlineAt - now),
      );
      return;
    }
    setWarningOpen(false);
    const warningAt = state.deadlineAt - getInactivityPolicy(roleRef.current).warningMs;
    transitionTimerRef.current = window.setTimeout(
      () => evaluateRef.current(),
      Math.max(0, warningAt - now),
    );
  }, [authLoading, clearTimers, redirectAfterInactivity, user]);
  evaluateRef.current = evaluate;

  const publishActivity = useCallback((state: SessionLifecycleState) => {
    const message: SessionLifecycleMessage = { type: "activity", state };
    writeSessionLifecycleState(window.localStorage, state);
    writeLifecycleSyncMessage(window.localStorage, message);
    channelRef.current?.postMessage(message);
  }, []);

  const recordActivity = useCallback(
    (force = false) => {
      if (!user || document.visibilityState !== "visible" || warningOpen) return;
      const now = Date.now();
      if (!force && now - lastHandledActivityRef.current < SESSION_ACTIVITY_THROTTLE_MS) return;
      lastHandledActivityRef.current = now;
      const current = stateRef.current ?? createSessionLifecycleState(now, roleRef.current);
      const next = applyMeaningfulActivity(current, now, roleRef.current);
      stateRef.current = next;
      publishActivity(next);
      evaluate();
    },
    [evaluate, publishActivity, user, warningOpen],
  );

  useEffect(() => {
    if (!user || authLoading) {
      stateRef.current = null;
      videoPlayingRef.current = false;
      videoPlaybackStartedAtRef.current = null;
      clearTimers();
      setWarningOpen(false);
      logoutInProgressRef.current = false;
      return;
    }
    const now = Date.now();
    const stored = readSessionLifecycleState(window.localStorage);
    stateRef.current = stored ?? createSessionLifecycleState(now, role);
    stateRef.current = adaptStateToRole(stateRef.current, role, now);
    writeSessionLifecycleState(window.localStorage, stateRef.current);
    logoutInProgressRef.current = false;
    evaluate();
    return clearTimers;
  }, [authLoading, clearTimers, evaluate, role, user]);

  useEffect(() => {
    if (!user) return;
    const meaningfulActivity = () => recordActivity(false);
    const onResume = () => {
      if (document.visibilityState === "hidden") {
        // A backgrounded player is not approved active playback. Account for
        // only the visible portion before resuming ordinary idle tracking.
        const now = Date.now();
        const startedAt = videoPlaybackStartedAtRef.current;
        if (videoPlayingRef.current && startedAt !== null && stateRef.current) {
          const next = extendDeadlineForLessonPlayback(
            stateRef.current,
            Math.max(0, now - startedAt),
            now,
          );
          stateRef.current = next;
          publishActivity(next);
        }
        videoPlayingRef.current = false;
        videoPlaybackStartedAtRef.current = null;
        evaluate();
        return;
      }
      evaluate();
    };
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "touchstart",
      "keydown",
      "scroll",
      "input",
      "change",
    ];
    events.forEach((event) =>
      window.addEventListener(event, meaningfulActivity, { passive: true, capture: true }),
    );
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    return () => {
      events.forEach((event) => window.removeEventListener(event, meaningfulActivity, true));
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, [evaluate, publishActivity, recordActivity, user]);

  useEffect(() => {
    if (!user) return;
    if (!routeInitializedRef.current) routeInitializedRef.current = true;
    else recordActivity(true);
  }, [location.href, recordActivity, user]);

  useEffect(() => {
    if (!user) return;
    const receive = (message: SessionLifecycleMessage) => {
      if (message.type === "logout") {
        void signOut({ scope: "local", broadcast: false }).finally(() =>
          navigate({ to: "/auth", search: { redirect: undefined } }),
        );
        return;
      }
      if (!stateRef.current) stateRef.current = message.state;
      else stateRef.current = acceptNewerLifecycleState(stateRef.current, message.state);
      writeSessionLifecycleState(window.localStorage, stateRef.current);
      evaluate();
    };
    if ("BroadcastChannel" in window) {
      channelRef.current = new BroadcastChannel(SESSION_LIFECYCLE_CHANNEL);
      channelRef.current.onmessage = (event: MessageEvent<SessionLifecycleMessage>) =>
        receive(event.data);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_LIFECYCLE_SYNC_KEY) return;
      const message = parseLifecycleSyncMessage(event.newValue);
      if (message) receive(message);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
      window.removeEventListener("storage", onStorage);
    };
  }, [evaluate, navigate, signOut, user]);

  const setLessonVideoPlaying = useCallback(
    (playing: boolean) => {
      const now = Date.now();
      if (playing === videoPlayingRef.current) return;

      if (playing) {
        // Starting an approved lesson player is meaningful activity. From this
        // point the deadline is paused until playback stops or the tab hides.
        recordActivity(true);
        videoPlayingRef.current = true;
        videoPlaybackStartedAtRef.current = now;
        clearTimers();
        return;
      }

      videoPlayingRef.current = false;
      const startedAt = videoPlaybackStartedAtRef.current;
      videoPlaybackStartedAtRef.current = null;
      if (startedAt !== null && stateRef.current) {
        const next = extendDeadlineForLessonPlayback(
          stateRef.current,
          Math.max(0, now - startedAt),
          now,
        );
        stateRef.current = next;
        publishActivity(next);
      }
      evaluate();
    },
    [clearTimers, evaluate, publishActivity, recordActivity],
  );

  const staySignedIn = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      await redirectAfterInactivity();
      return;
    }
    setWarningOpen(false);
    const next = createSessionLifecycleState(Date.now(), roleRef.current);
    stateRef.current = next;
    publishActivity(next);
    evaluate();
  }, [evaluate, publishActivity, redirectAfterInactivity]);

  const value = useMemo(() => ({ setLessonVideoPlaying }), [setLessonVideoPlaying]);
  return (
    <SessionLifecycleContext.Provider value={value}>
      {children}
      <SessionExpiryDialog
        open={warningOpen}
        secondsRemaining={secondsRemaining}
        onStaySignedIn={() => void staySignedIn()}
        onLogout={() =>
          void signOut({ scope: "local" }).then(() =>
            navigate({ to: "/auth", search: { redirect: undefined } }),
          )
        }
      />
    </SessionLifecycleContext.Provider>
  );
}
