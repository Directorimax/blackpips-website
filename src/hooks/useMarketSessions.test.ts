import { describe, expect, it, vi } from "vitest";
import {
  LIVE_CLOCK_RESYNC_EVENTS,
  millisecondsUntilNextSecond,
  readWallClock,
} from "./useMarketSessions";

describe("market sessions wall clock", () => {
  it("aligns the next update to an exact second boundary", () => {
    expect(millisecondsUntilNextSecond(10_250)).toBe(750);
    expect(millisecondsUntilNextSecond(11_000)).toBe(1000);
  });

  it("reads the current wall clock on every tick instead of accumulating time", () => {
    const now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(63_250);
    expect(readWallClock(now).getTime()).toBe(1_000);
    expect(readWallClock(now).getTime()).toBe(63_250);
    expect(now).toHaveBeenCalledTimes(2);
  });

  it("declares focus and pageshow as immediate resynchronization events", () => {
    expect(LIVE_CLOCK_RESYNC_EVENTS).toEqual(["focus", "pageshow"]);
  });
});
