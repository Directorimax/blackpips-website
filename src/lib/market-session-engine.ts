import {
  FOREX_WEEK_CONFIG,
  OVERLAP_CONFIG,
  SESSION_CONFIG,
  type MarketSessionConfig,
  type SessionId,
} from "./market-session.config";
import {
  addCalendarDays,
  formatCountdown,
  formatTime,
  formatTimeZoneLabel,
  getZonedMinutes,
  getZonedParts,
  zonedDateTimeToDate,
  type TimeFormatPreference,
} from "./market-session-time";

export type SessionInterval = {
  sessionId: SessionId;
  open: Date;
  close: Date;
};

export type SessionSnapshot = {
  config: MarketSessionConfig;
  isOpen: boolean;
  localOpenTime: string;
  localCloseTime: string;
  displayOpenTime: string;
  displayCloseTime: string;
  nextOpen: Date;
  nextClose: Date;
  countdown: string;
  countdownMilliseconds: number;
  progressPercentage: number;
  timeZoneLabel: string;
  activeInterval?: SessionInterval;
  nextInterval: SessionInterval;
};

export type OverlapSnapshot = {
  id: string;
  sessionIds: readonly [SessionId, SessionId];
  sessionNames: readonly [string, string];
  description: string;
  isActive: boolean;
  isUpcoming: boolean;
  start: Date;
  end: Date;
  displayStart: string;
  displayEnd: string;
  countdown: string;
  countdownMilliseconds: number;
  durationMinutes: number;
};

export function getSessionIntervals(
  config: MarketSessionConfig,
  reference: Date,
  daysBefore = 3,
  daysAfter = 9,
) {
  const localReference = getZonedParts(reference, config.timeZone);
  const intervals: SessionInterval[] = [];
  for (let offset = -daysBefore; offset <= daysAfter; offset += 1) {
    const localDate = addCalendarDays(localReference, offset);
    if (!config.weekdays.includes(localDate.weekday)) continue;
    const closeDate =
      config.closeMinutes <= config.openMinutes ? addCalendarDays(localDate, 1) : localDate;
    intervals.push({
      sessionId: config.id,
      open: zonedDateTimeToDate(localDate, config.openMinutes, config.timeZone),
      close: zonedDateTimeToDate(closeDate, config.closeMinutes, config.timeZone),
    });
  }
  return intervals.sort((first, second) => first.open.getTime() - second.open.getTime());
}

export function getSessionSnapshot(
  config: MarketSessionConfig,
  now: Date,
  displayTimeZone: string,
  timeFormat: TimeFormatPreference,
): SessionSnapshot {
  const intervals = getSessionIntervals(config, now);
  const activeInterval = intervals.find(
    (interval) =>
      interval.open.getTime() <= now.getTime() && now.getTime() < interval.close.getTime(),
  );
  const nextInterval = intervals.find((interval) => interval.open.getTime() > now.getTime());
  if (!nextInterval) throw new Error(`Unable to calculate the next ${config.name} session.`);
  const displayInterval = activeInterval ?? nextInterval;
  const transition = activeInterval?.close ?? nextInterval.open;
  const countdownMilliseconds = transition.getTime() - now.getTime();
  const duration = displayInterval.close.getTime() - displayInterval.open.getTime();
  const elapsed = activeInterval ? now.getTime() - activeInterval.open.getTime() : 0;

  return {
    config,
    isOpen: Boolean(activeInterval),
    localOpenTime: formatTime(displayInterval.open, config.timeZone, timeFormat),
    localCloseTime: formatTime(displayInterval.close, config.timeZone, timeFormat),
    displayOpenTime: formatTime(displayInterval.open, displayTimeZone, timeFormat),
    displayCloseTime: formatTime(displayInterval.close, displayTimeZone, timeFormat),
    nextOpen: nextInterval.open,
    nextClose: activeInterval?.close ?? nextInterval.close,
    countdown: formatCountdown(countdownMilliseconds),
    countdownMilliseconds,
    progressPercentage: activeInterval ? Math.min(100, Math.max(0, (elapsed / duration) * 100)) : 0,
    timeZoneLabel: formatTimeZoneLabel(config.timeZone),
    activeInterval,
    nextInterval,
  };
}

export function getAllSessionSnapshots(
  now: Date,
  displayTimeZone: string,
  timeFormat: TimeFormatPreference,
) {
  return SESSION_CONFIG.map((config) =>
    getSessionSnapshot(config, now, displayTimeZone, timeFormat),
  );
}

function getForexWeekWindows(reference: Date) {
  const local = getZonedParts(reference, FOREX_WEEK_CONFIG.timeZone);
  const currentSunday = addCalendarDays(local, -local.weekday);
  return [-7, 0, 7].map((offset) => {
    const sunday = addCalendarDays(currentSunday, offset);
    const friday = addCalendarDays(sunday, 5);
    return {
      open: zonedDateTimeToDate(sunday, FOREX_WEEK_CONFIG.openMinutes, FOREX_WEEK_CONFIG.timeZone),
      close: zonedDateTimeToDate(
        friday,
        FOREX_WEEK_CONFIG.closeMinutes,
        FOREX_WEEK_CONFIG.timeZone,
      ),
    };
  });
}

export function getGlobalMarketStatus(now: Date) {
  const windows = getForexWeekWindows(now);
  const activeWindow = windows.find(
    (window) => window.open.getTime() <= now.getTime() && now.getTime() < window.close.getTime(),
  );
  const nextWindow = windows.find((window) => window.open.getTime() > now.getTime());
  if (!nextWindow && !activeWindow) throw new Error("Unable to calculate the next Forex week.");
  const transition = activeWindow?.close ?? nextWindow!.open;
  return {
    isOpen: Boolean(activeWindow),
    label: activeWindow ? "Market Open" : "Weekend Closed",
    nextOpen: nextWindow?.open ?? windows[windows.length - 1].open,
    nextClose: activeWindow?.close ?? nextWindow!.close,
    countdownMilliseconds: transition.getTime() - now.getTime(),
    countdown: formatCountdown(transition.getTime() - now.getTime()),
  };
}

function intersectIntervals(first: SessionInterval, second: SessionInterval) {
  const start = new Date(Math.max(first.open.getTime(), second.open.getTime()));
  const end = new Date(Math.min(first.close.getTime(), second.close.getTime()));
  return start.getTime() < end.getTime() ? { start, end } : null;
}

export function getOverlapSnapshots(
  now: Date,
  displayTimeZone: string,
  timeFormat: TimeFormatPreference,
): OverlapSnapshot[] {
  return OVERLAP_CONFIG.flatMap((overlap) => {
    const firstConfig = SESSION_CONFIG.find((session) => session.id === overlap.sessionIds[0]);
    const secondConfig = SESSION_CONFIG.find((session) => session.id === overlap.sessionIds[1]);
    if (!firstConfig || !secondConfig) return [];
    const intersections = getSessionIntervals(firstConfig, now)
      .flatMap((first) =>
        getSessionIntervals(secondConfig, now)
          .map((second) => intersectIntervals(first, second))
          .filter((value): value is { start: Date; end: Date } => Boolean(value)),
      )
      .filter((interval) => interval.end.getTime() > now.getTime())
      .sort((first, second) => first.start.getTime() - second.start.getTime());
    const current = intersections.find(
      (interval) =>
        interval.start.getTime() <= now.getTime() && now.getTime() < interval.end.getTime(),
    );
    const selected = current ?? intersections[0];
    if (!selected) return [];
    const transition = current?.end ?? selected.start;
    return [
      {
        id: overlap.id,
        sessionIds: overlap.sessionIds,
        sessionNames: [firstConfig.name, secondConfig.name] as const,
        description: overlap.description,
        isActive: Boolean(current),
        isUpcoming: !current,
        start: selected.start,
        end: selected.end,
        displayStart: formatTime(selected.start, displayTimeZone, timeFormat),
        displayEnd: formatTime(selected.end, displayTimeZone, timeFormat),
        countdown: formatCountdown(transition.getTime() - now.getTime()),
        countdownMilliseconds: transition.getTime() - now.getTime(),
        durationMinutes: Math.round((selected.end.getTime() - selected.start.getTime()) / 60_000),
      },
    ];
  });
}

export function getMarketActivity(
  sessions: readonly SessionSnapshot[],
  overlaps: readonly OverlapSnapshot[],
) {
  const active = sessions.filter((session) => session.isOpen);
  const londonNewYork = overlaps.find(
    (overlap) => overlap.id === "london-new-york" && overlap.isActive,
  );
  const level =
    active.length === 0
      ? "Closed"
      : londonNewYork
        ? "High"
        : active.length >= 2
          ? "Medium"
          : active[0].config.id === "sydney"
            ? "Very Low"
            : "Low";
  const reason =
    active.length === 0
      ? "No configured weekday session is open."
      : active.length === 1
        ? `${active[0].config.name} is the only configured session open.`
        : `${active.map((session) => session.config.name).join(" + ")} overlap.`;
  return { level, reason, activeSessions: active };
}

export function getTimelineSegments(
  config: MarketSessionConfig,
  reference: Date,
  displayTimeZone: string,
) {
  const displayDate = getZonedParts(reference, displayTimeZone);
  const dayStart = zonedDateTimeToDate(displayDate, 0, displayTimeZone);
  const nextDate = addCalendarDays(displayDate, 1);
  const dayEnd = zonedDateTimeToDate(nextDate, 0, displayTimeZone);
  return getSessionIntervals(config, dayStart, 3, 3)
    .map((interval) => ({
      start: new Date(Math.max(interval.open.getTime(), dayStart.getTime())),
      end: new Date(Math.min(interval.close.getTime(), dayEnd.getTime())),
    }))
    .filter((interval) => interval.start.getTime() < interval.end.getTime())
    .map((interval) => {
      const beginsAtDayStart = interval.start.getTime() === dayStart.getTime();
      const endsAtDayEnd = interval.end.getTime() === dayEnd.getTime();
      const startMinutes = beginsAtDayStart ? 0 : getZonedMinutes(interval.start, displayTimeZone);
      const endMinutes = endsAtDayEnd ? 1440 : getZonedMinutes(interval.end, displayTimeZone);
      return {
        startMinutes,
        endMinutes,
        left: (startMinutes / 1440) * 100,
        width: ((endMinutes - startMinutes) / 1440) * 100,
      };
    });
}

export function getInstantForDisplayMinutes(
  reference: Date,
  displayTimeZone: string,
  minutes: number,
) {
  return zonedDateTimeToDate(getZonedParts(reference, displayTimeZone), minutes, displayTimeZone);
}
