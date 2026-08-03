import { describe, expect, it } from "vitest";
import { SESSION_CONFIG } from "./market-session.config";
import {
  getAllSessionSnapshots,
  getGlobalMarketStatus,
  getSessionIntervals,
  getTimelineSegments,
} from "./market-session-engine";

const config = (id: (typeof SESSION_CONFIG)[number]["id"]) => {
  const value = SESSION_CONFIG.find((session) => session.id === id);
  if (!value) throw new Error(`${id} config is required.`);
  return value;
};

describe("IANA session intervals", () => {
  it.each([
    ["london", "2026-01-12T12:00:00Z", "2026-01-12T08:00:00.000Z"],
    ["london", "2026-07-13T12:00:00Z", "2026-07-13T07:00:00.000Z"],
    ["new-york", "2026-01-12T12:00:00Z", "2026-01-12T13:00:00.000Z"],
    ["new-york", "2026-07-13T12:00:00Z", "2026-07-13T12:00:00.000Z"],
    ["sydney", "2026-01-12T12:00:00Z", "2026-01-11T21:00:00.000Z"],
    ["sydney", "2026-07-13T12:00:00Z", "2026-07-12T22:00:00.000Z"],
    ["tokyo", "2026-01-12T12:00:00Z", "2026-01-12T00:00:00.000Z"],
    ["tokyo", "2026-07-13T12:00:00Z", "2026-07-13T00:00:00.000Z"],
  ] as const)("converts %s correctly around %s", (id, reference, expectedOpen) => {
    const intervals = getSessionIntervals(config(id), new Date(reference));
    expect(
      intervals.find((interval) => interval.open.toISOString() === expectedOpen),
    ).toBeDefined();
  });

  it("formats every snapshot in the selected viewer timezone", () => {
    const now = new Date("2026-07-13T12:30:00Z");
    const dar = getAllSessionSnapshots(now, "Africa/Dar_es_Salaam", "24h");
    const newYork = getAllSessionSnapshots(now, "America/New_York", "12h");
    expect(dar.find((session) => session.config.id === "london")?.displayOpenTime).toBe("10:00");
    expect(newYork.find((session) => session.config.id === "london")?.displayOpenTime).toBe(
      "3:00 AM",
    );
  });

  it("wraps a session across midnight in the viewer timezone", () => {
    const segments = getTimelineSegments(
      config("new-york"),
      new Date("2026-07-14T12:00:00Z"),
      "Asia/Tokyo",
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].startMinutes).toBe(0);
    expect(segments[1].endMinutes).toBe(1440);
  });

  it("changes only display text between 12-hour and 24-hour formats", () => {
    const now = new Date("2026-07-13T12:30:00Z");
    const london24 = getAllSessionSnapshots(now, "Africa/Dar_es_Salaam", "24h").find(
      (session) => session.config.id === "london",
    );
    const london12 = getAllSessionSnapshots(now, "Africa/Dar_es_Salaam", "12h").find(
      (session) => session.config.id === "london",
    );

    expect(london24?.displayOpenTime).toBe("10:00");
    expect(london12?.displayOpenTime).toBe("10:00 AM");
    expect(london12?.activeInterval?.open.getTime()).toBe(london24?.activeInterval?.open.getTime());
    expect(getTimelineSegments(config("london"), now, "Africa/Dar_es_Salaam")).toMatchObject([
      { startMinutes: 600, endMinutes: 1140 },
    ]);
  });
});

describe("Forex week status", () => {
  it("is open before the widely used Friday 17:00 New York boundary", () => {
    const status = getGlobalMarketStatus(new Date("2026-08-07T20:59:00Z"));
    expect(status.isOpen).toBe(true);
  });

  it("is closed on Saturday", () => {
    const status = getGlobalMarketStatus(new Date("2026-08-08T12:00:00Z"));
    expect(status.label).toBe("Weekend Closed");
  });

  it("is closed before the Sunday reopening", () => {
    const status = getGlobalMarketStatus(new Date("2026-08-09T20:00:00Z"));
    expect(status.isOpen).toBe(false);
    expect(status.nextOpen.toISOString()).toBe("2026-08-09T21:00:00.000Z");
  });

  it("recomputes cleanly when an injected time jumps across an opening", () => {
    expect(getGlobalMarketStatus(new Date("2026-08-09T20:59:59Z")).isOpen).toBe(false);
    expect(getGlobalMarketStatus(new Date("2026-08-09T21:00:01Z")).isOpen).toBe(true);
  });
});
