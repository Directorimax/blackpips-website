import { describe, expect, it, vi } from "vitest";
import {
  cancelScheduledReturn,
  axisTicks,
  clientXToMinutes,
  flagForRegion,
  hourLabel,
  interactiveMinutesToPositionPercent,
  LAST_MINUTE_OF_DAY,
  markerBubbleCenter,
  markerConnectorGeometry,
  minutesToPositionPercent,
  offsetForDisplayMinutes,
  pointerToDayFraction,
  positionPercentToMinutes,
  requestFrameOnce,
  scheduleReturn,
} from "./market-hours-converter";
import { getZonedParts } from "./market-session-time";

describe("market hours converter interaction geometry", () => {
  it("accounts for the plotting viewport scroll position", () => {
    expect(pointerToDayFraction(170, 50, 240, 720)).toBe(0.5);
    expect(pointerToDayFraction(-100, 50, 0, 720)).toBe(0);
    expect(pointerToDayFraction(2_000, 50, 0, 720)).toBe(1);
  });

  it("calculates a preview offset in the selected IANA timezone", () => {
    const reference = new Date("2026-07-13T12:30:00Z");
    expect(offsetForDisplayMinutes(reference, "Africa/Dar_es_Salaam", 16 * 60)).toBe(30 * 60_000);
    expect(offsetForDisplayMinutes(reference, "America/New_York", 9 * 60)).toBe(30 * 60_000);
  });

  it("keeps both interactive boundaries on the selected calendar day", () => {
    const reference = new Date("2026-08-05T09:00:00Z");
    const left = new Date(
      reference.getTime() + offsetForDisplayMinutes(reference, "Africa/Dar_es_Salaam", 0),
    );
    const right = new Date(
      reference.getTime() +
        offsetForDisplayMinutes(reference, "Africa/Dar_es_Salaam", LAST_MINUTE_OF_DAY),
    );
    expect(getZonedParts(left, "Africa/Dar_es_Salaam")).toMatchObject({
      day: 5,
      hour: 0,
      minute: 0,
      weekday: 3,
    });
    expect(getZonedParts(right, "Africa/Dar_es_Salaam")).toMatchObject({
      day: 5,
      hour: 23,
      minute: 59,
      weekday: 3,
    });
  });

  it("formats both clock modes and local emoji flags without network assets", () => {
    expect(hourLabel(13, false)).toBe("1");
    expect(hourLabel(13, true)).toBe("13");
    expect(flagForRegion("AU")).toBe("🇦🇺");
  });

  it("uses one day geometry and clamps the marker bubble inside the plot", () => {
    expect(minutesToPositionPercent(0)).toBe(0);
    expect(minutesToPositionPercent(720)).toBe(50);
    expect(minutesToPositionPercent(1440)).toBe(100);
    expect(markerBubbleCenter(0, 720)).toBe(34);
    expect(markerBubbleCenter(719.5, 720)).toBe(360);
    expect(markerBubbleCenter(1439, 720)).toBe(686);
    expect(positionPercentToMinutes(0)).toBe(0);
    expect(positionPercentToMinutes(50)).toBe(719.5);
    expect(positionPercentToMinutes(100)).toBe(LAST_MINUTE_OF_DAY);
    expect(clientXToMinutes(100, 100, 300)).toBe(0);
    expect(clientXToMinutes(250, 100, 300)).toBe(719.5);
    expect(clientXToMinutes(400, 100, 300)).toBe(LAST_MINUTE_OF_DAY);
    expect(interactiveMinutesToPositionPercent(0)).toBe(0);
    expect(interactiveMinutesToPositionPercent(LAST_MINUTE_OF_DAY)).toBe(100);
  });

  it.each([
    [0, 0],
    [719.5, 360],
    [1439, 720],
  ])("keeps the pin connector attached at minute %s", (minutes, expectedTipX) => {
    const geometry = markerConnectorGeometry(minutes, 720);
    expect(geometry.tipX).toBe(expectedTipX);
    expect(geometry.bubbleCenter).toBeGreaterThanOrEqual(34);
    expect(geometry.bubbleCenter).toBeLessThanOrEqual(686);
  });

  it("builds the exact compact mobile and tablet axis sequences", () => {
    expect(axisTicks(false, true).map((tick) => tick.label)).toEqual([
      "•",
      "2",
      "4",
      "6",
      "8",
      "10",
      "12",
      "2",
      "4",
      "6",
      "8",
      "10",
      "12",
    ]);
    expect(axisTicks(true, true).map((tick) => tick.label)).toEqual([
      "•",
      "2",
      "4",
      "6",
      "8",
      "10",
      "12",
      "14",
      "16",
      "18",
      "20",
      "22",
      "24",
    ]);
  });

  it("builds every desktop hour from the bullet through the final boundary", () => {
    const twentyFour = axisTicks(true, false);
    const twelve = axisTicks(false, false);
    expect(twentyFour.map((tick) => tick.label)).toEqual([
      "•",
      ...Array.from({ length: 24 }, (_, index) => String(index + 1)),
    ]);
    expect(twelve.map((tick) => tick.label)).toEqual([
      "•",
      ...Array.from({ length: 24 }, (_, index) => String((index + 1) % 12 || 12)),
    ]);
    expect(twentyFour[0].minutes).toBe(0);
    expect(twentyFour[24]).toMatchObject({ minutes: 1440, label: "24" });
  });

  it("cancels a pending elastic return when interaction starts again", () => {
    vi.useFakeTimers();
    const returned = vi.fn();
    let timer = scheduleReturn(null, returned, 350);
    timer = scheduleReturn(timer, returned, 350);
    vi.advanceTimersByTime(349);
    expect(returned).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(returned).toHaveBeenCalledTimes(1);
    cancelScheduledReturn(timer);
    vi.useRealTimers();
  });

  it("schedules at most one visual update per animation frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    const request = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    let frame: number | null = null;
    frame = requestFrameOnce(frame, vi.fn(), request);
    frame = requestFrameOnce(frame, vi.fn(), request);
    frame = requestFrameOnce(frame, vi.fn(), request);
    expect(frame).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
