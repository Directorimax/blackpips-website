import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acceptNewerLifecycleState,
  adaptStateToRole,
  applyMeaningfulActivity,
  createSessionLifecycleState,
  extendDeadlineForLessonPlayback,
  getSessionLifecyclePhase,
  parseSessionLifecycleState,
  shouldSuspendInactivityForLessonVideo,
} from "./session-lifecycle";

const MINUTE = 60_000;

describe("session lifecycle deadlines", () => {
  afterEach(() => vi.useRealTimers());

  it("warns learners at 55 minutes and expires them at 60 minutes", () => {
    const state = createSessionLifecycleState(0, "learner");
    expect(getSessionLifecyclePhase(state, 54 * MINUTE + 59_999, "learner")).toBe("active");
    expect(getSessionLifecyclePhase(state, 55 * MINUTE, "learner")).toBe("warning");
    expect(getSessionLifecyclePhase(state, 60 * MINUTE, "learner")).toBe("expired");
  });

  it("warns administrators at 25 minutes and expires them at 30 minutes", () => {
    const state = createSessionLifecycleState(0, "admin");
    expect(getSessionLifecyclePhase(state, 25 * MINUTE, "admin")).toBe("warning");
    expect(getSessionLifecyclePhase(state, 30 * MINUTE, "admin")).toBe("expired");
  });

  it("uses the conservative administrator deadline while the role loads", () => {
    expect(createSessionLifecycleState(0, "unknown").deadlineAt).toBe(30 * MINUTE);
  });

  it("meaningful activity replaces the absolute deadline", () => {
    const initial = createSessionLifecycleState(0, "learner");
    expect(applyMeaningfulActivity(initial, 20 * MINUTE, "learner")).toEqual({
      lastActivityAt: 20 * MINUTE,
      deadlineAt: 80 * MINUTE,
      updatedAt: 20 * MINUTE,
    });
  });

  it("rejects stale tab activity", () => {
    const current = createSessionLifecycleState(20 * MINUTE, "learner");
    const stale = createSessionLifecycleState(10 * MINUTE, "learner");
    expect(acceptNewerLifecycleState(current, stale)).toBe(current);
    expect(applyMeaningfulActivity(current, 10 * MINUTE, "learner")).toBe(current);
  });

  it("shortens an unresolved admin deadline and extends a resolved learner deadline", () => {
    const conservative = createSessionLifecycleState(0, "unknown");
    expect(adaptStateToRole(conservative, "learner", MINUTE).deadlineAt).toBe(60 * MINUTE);
    expect(adaptStateToRole(conservative, "admin", MINUTE).deadlineAt).toBe(30 * MINUTE);
  });

  it("rejects malformed or non-positive stored deadlines", () => {
    expect(parseSessionLifecycleState("not-json")).toBeNull();
    expect(
      parseSessionLifecycleState(
        JSON.stringify({ lastActivityAt: 20, deadlineAt: 10, updatedAt: 20 }),
      ),
    ).toBeNull();
  });

  it("uses the current wall clock after suspended browser timers resume", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T00:00:00Z"));
    const state = createSessionLifecycleState(Date.now(), "learner");
    vi.setSystemTime(new Date("2026-08-05T01:00:01Z"));
    expect(getSessionLifecyclePhase(state, Date.now(), "learner")).toBe("expired");
  });

  it("suspends only for a playing lesson in a visible tab", () => {
    expect(shouldSuspendInactivityForLessonVideo(true, "visible")).toBe(true);
    expect(shouldSuspendInactivityForLessonVideo(false, "visible")).toBe(false);
    expect(shouldSuspendInactivityForLessonVideo(true, "hidden")).toBe(false);
  });

  it("extends the deadline by genuine lesson playback and resumes on pause", () => {
    const state = createSessionLifecycleState(0, "learner");
    const resumed = extendDeadlineForLessonPlayback(state, 20 * MINUTE, 20 * MINUTE);
    expect(resumed.deadlineAt).toBe(80 * MINUTE);
    expect(getSessionLifecyclePhase(resumed, 79 * MINUTE + 59_999, "learner")).toBe("warning");
    expect(getSessionLifecyclePhase(resumed, 80 * MINUTE, "learner")).toBe("expired");
  });
});
