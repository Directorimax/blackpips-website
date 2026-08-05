import { getZonedParts } from "./market-session-time";

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = 1440;
export const MARKER_BUBBLE_WIDTH = 88;

export const MARKET_TIMEZONES = [
  ["Midway", "Pacific/Midway"],
  ["Hawaii", "Pacific/Honolulu"],
  ["Alaska", "America/Anchorage"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Denver", "America/Denver"],
  ["Chicago", "America/Chicago"],
  ["New York", "America/New_York"],
  ["Buenos Aires", "America/Argentina/Buenos_Aires"],
  ["São Paulo", "America/Sao_Paulo"],
  ["UTC", "UTC"],
  ["Accra", "Africa/Accra"],
  ["London", "Europe/London"],
  ["Lagos", "Africa/Lagos"],
  ["Berlin", "Europe/Berlin"],
  ["Johannesburg", "Africa/Johannesburg"],
  ["Cairo", "Africa/Cairo"],
  ["Nairobi", "Africa/Nairobi"],
  ["Dar es Salaam", "Africa/Dar_es_Salaam"],
  ["Moscow", "Europe/Moscow"],
  ["Dubai", "Asia/Dubai"],
  ["Karachi", "Asia/Karachi"],
  ["Kolkata", "Asia/Kolkata"],
  ["Dhaka", "Asia/Dhaka"],
  ["Bangkok", "Asia/Bangkok"],
  ["Singapore", "Asia/Singapore"],
  ["Tokyo", "Asia/Tokyo"],
  ["Darwin", "Australia/Darwin"],
  ["Adelaide", "Australia/Adelaide"],
  ["Brisbane", "Australia/Brisbane"],
  ["Sydney", "Australia/Sydney"],
  ["Fiji", "Pacific/Fiji"],
  ["Auckland", "Pacific/Auckland"],
] as const;

export function pointerToDayFraction(
  clientX: number,
  viewportLeft: number,
  scrollLeft: number,
  plotWidth: number,
) {
  if (plotWidth <= 0) return 0;
  return Math.min(1, Math.max(0, (clientX - viewportLeft + scrollLeft) / plotWidth));
}

export function minutesToPositionPercent(minutes: number) {
  return (Math.min(MINUTES_PER_DAY, Math.max(0, minutes)) / MINUTES_PER_DAY) * 100;
}

export function positionPercentToMinutes(percent: number) {
  return (Math.min(100, Math.max(0, percent)) / 100) * MINUTES_PER_DAY;
}

export function clientXToMinutes(clientX: number, plotLeft: number, plotWidth: number) {
  return positionPercentToMinutes(((clientX - plotLeft) / Math.max(1, plotWidth)) * 100);
}

export function markerBubbleCenter(
  minutes: number,
  plotWidth: number,
  bubbleWidth = MARKER_BUBBLE_WIDTH,
) {
  const halfBubble = bubbleWidth / 2;
  const markerX = (minutesToPositionPercent(minutes) / 100) * plotWidth;
  return Math.min(plotWidth - halfBubble, Math.max(halfBubble, markerX));
}

export function markerBubblePointerX(
  minutes: number,
  plotWidth: number,
  bubbleWidth = MARKER_BUBBLE_WIDTH,
) {
  const markerX = (minutesToPositionPercent(minutes) / 100) * plotWidth;
  const bubbleCenter = markerBubbleCenter(minutes, plotWidth, bubbleWidth);
  return bubbleWidth / 2 + markerX - bubbleCenter;
}

export function axisTicks(use24: boolean) {
  return Array.from({ length: HOURS_PER_DAY + 1 }, (_, hour) => {
    const minutes = hour * 60;
    const period = hour < 12 || hour === 24 ? "A" : "P";
    return {
      minutes,
      major: hour % 2 === 0,
      label: use24
        ? hour === 24
          ? "24"
          : String(hour).padStart(2, "0")
        : `${hour % 12 || 12}${period}`,
    };
  });
}

export function cancelScheduledReturn(timer: ReturnType<typeof setTimeout> | null) {
  if (timer !== null) clearTimeout(timer);
}

export function scheduleReturn(
  timer: ReturnType<typeof setTimeout> | null,
  callback: () => void,
  delay = 350,
) {
  cancelScheduledReturn(timer);
  return setTimeout(callback, delay);
}

export function requestFrameOnce(
  activeFrame: number | null,
  callback: FrameRequestCallback,
  requestFrame: (callback: FrameRequestCallback) => number = requestAnimationFrame,
) {
  return activeFrame ?? requestFrame(callback);
}

export function offsetForDisplayMinutes(reference: Date, timeZone: string, targetMinutes: number) {
  const parts = getZonedParts(reference, timeZone);
  const currentMinutes = parts.hour * 60 + parts.minute + parts.second / 60;
  return (targetMinutes - currentMinutes) * 60_000;
}

export function hourLabel(hour: number, use24: boolean) {
  if (use24) return String(hour % 24).padStart(2, "0");
  const value = hour % 12;
  return String(value === 0 ? 12 : value);
}

export function flagForRegion(regionCode: string) {
  return String.fromCodePoint(
    ...regionCode
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0)),
  );
}
