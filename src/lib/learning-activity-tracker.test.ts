import { describe, expect, it } from "vitest";
import { LearningActivityTracker } from "./learning-activity-tracker";

describe("LearningActivityTracker", () => {
  it("counts only active monotonic time and flushes bounded chunks", async () => {
    let now = 0;
    const recorded: { eventId: string; activeSeconds: number }[] = [];
    const tracker = new LearningActivityTracker({
      timezone: "UTC",
      now: () => now,
      createId: () => `event-${recorded.length + 1}`,
      activityDate: () => "2026-08-30",
      record: async (event) => {
        recorded.push(event);
      },
    });
    now = 20_000;
    tracker.pulse();
    tracker.setActive(true);
    now = 40_400;
    tracker.setActive(false);
    now = 90_000;
    tracker.pulse();
    await tracker.flush();
    expect(recorded).toEqual([
      { eventId: "event-1", activeSeconds: 20, activityDate: "2026-08-30" },
    ]);
  });

  it("retains one UUID and payload after a failed write", async () => {
    let now = 0;
    let attempts = 0;
    const ids: string[] = [];
    const tracker = new LearningActivityTracker({
      timezone: "UTC",
      now: () => now,
      createId: () => "stable-event-id",
      activityDate: () => "2026-08-30",
      record: async (event) => {
        attempts += 1;
        ids.push(event.eventId);
        if (attempts === 1) throw new Error("offline");
      },
    });
    tracker.setActive(true);
    now = 12_000;
    tracker.setActive(false);
    await Promise.resolve();
    await tracker.flush();
    expect(ids).toEqual(["stable-event-id", "stable-event-id"]);
  });
});
