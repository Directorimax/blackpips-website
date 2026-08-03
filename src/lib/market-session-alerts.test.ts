import { describe, expect, it } from "vitest";
import {
  createDefaultAlertPreferences,
  getAlertTiming,
  getFiredAlertKey,
  parseAlertPreferences,
  serializeAlertPreferences,
} from "./market-session-alerts";

describe("market session alert preferences", () => {
  it("defaults every alert to disabled and 15 minutes", () => {
    expect(createDefaultAlertPreferences()).toEqual({
      "london-open": { enabled: false, leadMinutes: 15 },
      "new-york-open": { enabled: false, leadMinutes: 15 },
      "london-new-york-overlap": { enabled: false, leadMinutes: 15 },
    });
  });

  it("migrates the previous enabled-alert array without losing state", () => {
    expect(parseAlertPreferences('["london-open","london-new-york-overlap"]')).toEqual({
      "london-open": { enabled: true, leadMinutes: 15 },
      "new-york-open": { enabled: false, leadMinutes: 15 },
      "london-new-york-overlap": { enabled: true, leadMinutes: 15 },
    });
  });

  it("round-trips independent enabled and lead-time settings", () => {
    const preferences = createDefaultAlertPreferences();
    preferences["new-york-open"] = { enabled: true, leadMinutes: 30 };
    expect(parseAlertPreferences(serializeAlertPreferences(preferences))).toEqual(preferences);
  });

  it("falls back to 15 minutes for an unsupported stored lead time", () => {
    const stored = JSON.stringify({
      "london-open": { enabled: true, leadMinutes: 45 },
    });
    expect(parseAlertPreferences(stored)["london-open"]).toEqual({
      enabled: true,
      leadMinutes: 15,
    });
  });
});

describe("market session alert timing", () => {
  it("uses the current occurrence while its alert instant is still ahead", () => {
    const timing = getAlertTiming(
      new Date("2026-08-03T10:00:00Z"),
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-04T11:00:00Z"),
      30,
    );
    expect(timing.occurrence.toISOString()).toBe("2026-08-03T11:00:00.000Z");
    expect(timing.trigger.toISOString()).toBe("2026-08-03T10:30:00.000Z");
  });

  it("advances to the next occurrence when this occurrence's alert instant passed", () => {
    const timing = getAlertTiming(
      new Date("2026-08-03T10:45:00Z"),
      new Date("2026-08-03T11:00:00Z"),
      new Date("2026-08-04T11:00:00Z"),
      30,
    );
    expect(timing.occurrence.toISOString()).toBe("2026-08-04T11:00:00.000Z");
    expect(timing.trigger.toISOString()).toBe("2026-08-04T10:30:00.000Z");
  });

  it("deduplicates an occurrence independently of its selected lead time", () => {
    const occurrence = new Date("2026-08-03T11:00:00Z");
    expect(getFiredAlertKey("london-open", occurrence)).toBe(
      "london-open:2026-08-03T11:00:00.000Z",
    );
  });
});
