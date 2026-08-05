import { getInactivityPolicy, type SessionLifecycleRole } from "./session-policy";

export const SESSION_LIFECYCLE_STATE_KEY = "blackpips.sessionLifecycle.state.v1";
export const SESSION_LIFECYCLE_SYNC_KEY = "blackpips.sessionLifecycle.sync.v1";
export const SESSION_LIFECYCLE_CHANNEL = "blackpips.sessionLifecycle.v1";
export const SESSION_ACTIVITY_THROTTLE_MS = 15_000;

export type SessionLifecycleState = {
  lastActivityAt: number;
  deadlineAt: number;
  updatedAt: number;
};

export type SessionLifecyclePhase = "active" | "warning" | "expired";

export type SessionLifecycleMessage =
  { type: "activity"; state: SessionLifecycleState } | { type: "logout"; at: number };

export function shouldSuspendInactivityForLessonVideo(
  playing: boolean,
  visibility: DocumentVisibilityState,
) {
  return playing && visibility === "visible";
}

export function createSessionLifecycleState(
  now: number,
  role: SessionLifecycleRole,
): SessionLifecycleState {
  return {
    lastActivityAt: now,
    deadlineAt: now + getInactivityPolicy(role).timeoutMs,
    updatedAt: now,
  };
}

export function applyMeaningfulActivity(
  current: SessionLifecycleState,
  activityAt: number,
  role: SessionLifecycleRole,
) {
  if (activityAt <= current.lastActivityAt) return current;
  return createSessionLifecycleState(activityAt, role);
}

export function adaptStateToRole(
  current: SessionLifecycleState,
  role: SessionLifecycleRole,
  now: number,
) {
  const deadlineAt = current.lastActivityAt + getInactivityPolicy(role).timeoutMs;
  return {
    ...current,
    deadlineAt,
    updatedAt: Math.max(current.updatedAt, now),
  };
}

/**
 * Video playback is an approved form of activity, but it is not a stream of
 * synthetic input events. Keep the existing absolute deadline and move it by
 * the amount of time the visible lesson was actually playing when playback
 * stops. This preserves the remaining idle time after a pause.
 */
export function extendDeadlineForLessonPlayback(
  current: SessionLifecycleState,
  playbackDurationMs: number,
  now: number,
): SessionLifecycleState {
  if (playbackDurationMs <= 0) return current;
  return {
    ...current,
    deadlineAt: current.deadlineAt + playbackDurationMs,
    updatedAt: Math.max(current.updatedAt, now),
  };
}

export function getSessionLifecyclePhase(
  state: SessionLifecycleState,
  now: number,
  role: SessionLifecycleRole,
): SessionLifecyclePhase {
  if (now >= state.deadlineAt) return "expired";
  if (now >= state.deadlineAt - getInactivityPolicy(role).warningMs) return "warning";
  return "active";
}

export function acceptNewerLifecycleState(
  current: SessionLifecycleState,
  incoming: SessionLifecycleState,
) {
  if (incoming.lastActivityAt < current.lastActivityAt) return current;
  if (incoming.lastActivityAt === current.lastActivityAt && incoming.updatedAt <= current.updatedAt)
    return current;
  return incoming;
}

export function parseSessionLifecycleState(value: string | null): SessionLifecycleState | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<SessionLifecycleState>;
    if (
      !Number.isFinite(candidate.lastActivityAt) ||
      !Number.isFinite(candidate.deadlineAt) ||
      !Number.isFinite(candidate.updatedAt) ||
      candidate.deadlineAt! <= candidate.lastActivityAt!
    )
      return null;
    return {
      lastActivityAt: candidate.lastActivityAt!,
      deadlineAt: candidate.deadlineAt!,
      updatedAt: candidate.updatedAt!,
    };
  } catch {
    return null;
  }
}

export function readSessionLifecycleState(storage: Pick<Storage, "getItem">) {
  return parseSessionLifecycleState(storage.getItem(SESSION_LIFECYCLE_STATE_KEY));
}

export function writeSessionLifecycleState(
  storage: Pick<Storage, "setItem">,
  state: SessionLifecycleState,
) {
  storage.setItem(SESSION_LIFECYCLE_STATE_KEY, JSON.stringify(state));
}

export function clearSessionLifecycleStorage(
  storage: Pick<Storage, "removeItem" | "length" | "key">,
) {
  storage.removeItem(SESSION_LIFECYCLE_STATE_KEY);
  storage.removeItem(SESSION_LIFECYCLE_SYNC_KEY);
  const removable: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith("blackpips:lesson-notes:")) removable.push(key);
  }
  removable.forEach((key) => storage.removeItem(key));
}

export function clearUserSpecificClientState(
  local: Pick<Storage, "removeItem" | "length" | "key">,
  session?: Pick<Storage, "removeItem">,
) {
  clearSessionLifecycleStorage(local);
  session?.removeItem("blackpips-journal-view");
}

export function writeLifecycleSyncMessage(
  storage: Pick<Storage, "setItem">,
  message: SessionLifecycleMessage,
) {
  storage.setItem(SESSION_LIFECYCLE_SYNC_KEY, JSON.stringify(message));
}

export function parseLifecycleSyncMessage(value: string | null): SessionLifecycleMessage | null {
  if (!value) return null;
  try {
    const message = JSON.parse(value) as SessionLifecycleMessage;
    if (message.type === "logout" && Number.isFinite(message.at)) return message;
    if (message.type === "activity" && parseSessionLifecycleState(JSON.stringify(message.state)))
      return message;
    return null;
  } catch {
    return null;
  }
}
