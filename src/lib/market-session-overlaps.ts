import { getSessionIntervals } from "./market-session-engine";
import { SESSION_CONFIG, type SessionId } from "./market-session.config";
import { formatCountdown, formatTime, type TimeFormatPreference } from "./market-session-time";

export type OverlapId = "sydney-tokyo" | "tokyo-london" | "london-new-york";

export type OverlapDefinition = {
  id: OverlapId;
  first: SessionId;
  second: SessionId;
  name: string;
  description: string;
};

export const OVERLAP_DEFINITIONS: readonly OverlapDefinition[] = [
  {
    id: "sydney-tokyo",
    first: "sydney",
    second: "tokyo",
    name: "Sydney–Tokyo",
    description: "A shared window for the Australian and Japanese trading days.",
  },
  {
    id: "tokyo-london",
    first: "tokyo",
    second: "london",
    name: "Tokyo–London",
    description: "A brief handover between the Asian and European sessions.",
  },
  {
    id: "london-new-york",
    first: "london",
    second: "new-york",
    name: "London–New York",
    description: "The main shared window for European and North American market hours.",
  },
] as const;

function configFor(id: SessionId) {
  const config = SESSION_CONFIG.find((session) => session.id === id);
  if (!config) throw new Error(`Unknown market session: ${id}`);
  return config;
}

export function getOverlapIntervals(definition: OverlapDefinition, reference: Date) {
  const first = getSessionIntervals(configFor(definition.first), reference, 3, 9);
  const second = getSessionIntervals(configFor(definition.second), reference, 3, 9);
  return first
    .flatMap((firstInterval) =>
      second.map((secondInterval) => ({
        start: new Date(Math.max(firstInterval.open.getTime(), secondInterval.open.getTime())),
        end: new Date(Math.min(firstInterval.close.getTime(), secondInterval.close.getTime())),
      })),
    )
    .filter((interval) => interval.start.getTime() < interval.end.getTime())
    .sort(
      (firstInterval, secondInterval) =>
        firstInterval.start.getTime() - secondInterval.start.getTime(),
    );
}

export function getOverlapSnapshot(
  definition: OverlapDefinition,
  now: Date,
  displayTimeZone: string,
  timeFormat: TimeFormatPreference,
) {
  const intervals = getOverlapIntervals(definition, now);
  const active = intervals.find(
    (interval) =>
      interval.start.getTime() <= now.getTime() && now.getTime() < interval.end.getTime(),
  );
  const next = intervals.find((interval) => interval.start.getTime() > now.getTime());
  if (!next) throw new Error(`Unable to calculate the next ${definition.name} overlap.`);
  const shown = active ?? next;
  const transition = active?.end ?? next.start;
  return {
    definition,
    isActive: Boolean(active),
    start: shown.start,
    end: shown.end,
    nextStart: next.start,
    displayStart: formatTime(shown.start, displayTimeZone, timeFormat),
    displayEnd: formatTime(shown.end, displayTimeZone, timeFormat),
    countdown: formatCountdown(transition.getTime() - now.getTime()),
    durationMinutes: Math.round((shown.end.getTime() - shown.start.getTime()) / 60_000),
  };
}
