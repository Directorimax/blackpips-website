import { describe, expect, it, vi } from "vitest";
import {
  cancelScheduledReturn,
  axisTicks,
  clientXToMinutes,
  flagForRegion,
  hourLabel,
  markerBubbleCenter,
  markerBubblePointerX,
  minutesToPositionPercent,
  offsetForDisplayMinutes,
  pointerToDayFraction,
  positionPercentToMinutes,
  requestFrameOnce,
  scheduleReturn,
} from "./market-hours-converter";

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

  it("formats both clock modes and local emoji flags without network assets", () => {
    expect(hourLabel(13, false)).toBe("1");
    expect(hourLabel(13, true)).toBe("13");
    expect(flagForRegion("AU")).toBe("🇦🇺");
  });

  it("uses one day geometry and clamps the marker bubble inside the plot", () => {
    expect(minutesToPositionPercent(0)).toBe(0);
    expect(minutesToPositionPercent(720)).toBe(50);
    expect(minutesToPositionPercent(1440)).toBe(100);
    expect(markerBubbleCenter(0, 720)).toBe(44);
    expect(markerBubbleCenter(720, 720)).toBe(360);
    expect(markerBubbleCenter(1440, 720)).toBe(676);
    expect(positionPercentToMinutes(0)).toBe(0);
    expect(positionPercentToMinutes(50)).toBe(720);
    expect(positionPercentToMinutes(100)).toBe(1440);
    expect(clientXToMinutes(100, 100, 300)).toBe(0);
    expect(clientXToMinutes(250, 100, 300)).toBe(720);
    expect(clientXToMinutes(400, 100, 300)).toBe(1440);
  });

  it("keeps the bubble pointer attached while the bubble body is clamped", () => {
    expect(markerBubblePointerX(0, 720)).toBe(0);
    expect(markerBubblePointerX(720, 720)).toBe(44);
    expect(markerBubblePointerX(1440, 720)).toBe(88);
  });

  it("builds unambiguous minute-based day boundaries", () => {
    const twentyFour = axisTicks(true);
    const twelve = axisTicks(false);
    expect(twentyFour).toHaveLength(25);
    expect(twentyFour[0]).toMatchObject({ minutes: 0, label: "00" });
    expect(twentyFour[24]).toMatchObject({ minutes: 1440, label: "24" });
    expect(twelve[0].label).toBe("12A");
    expect(twelve[12].label).toBe("12P");
    expect(twelve[24]).toMatchObject({ minutes: 1440, label: "12A" });
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
