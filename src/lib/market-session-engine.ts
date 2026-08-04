import { SESSION_CONFIG, type MarketSessionConfig, type SessionId } from "./market-session.config";
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
