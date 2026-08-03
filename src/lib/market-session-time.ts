export type TimeFormatPreference = "12h" | "24h";

export const MARKET_SESSION_TIME_FORMAT_STORAGE_KEY = "blackpips.marketSessions.timeFormat";
export const MARKET_SESSION_TIME_ZONE_STORAGE_KEY = "blackpips.marketSessions.timeZone";

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
};

export function getVisitorTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function getSupportedTimeZones() {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  return (
    intl.supportedValuesOf?.("timeZone") ?? [
      "UTC",
      "Africa/Dar_es_Salaam",
      "America/New_York",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Europe/London",
    ]
  );
}

export function formatTimeZoneLabel(timeZone: string) {
  return timeZone.replaceAll("_", " ");
}

export function formatTimeZoneOffset(date: Date, timeZone: string) {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      timeZone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
    return offset === "GMT" ? "GMT+0" : (offset ?? "GMT+0");
  } catch {
    return "GMT+0";
  }
}

function timeFormatOptions(
  timeFormat: TimeFormatPreference,
  includeSeconds: boolean,
): Intl.DateTimeFormatOptions {
  return {
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    ...(timeFormat === "12h" ? { hour12: true } : { hourCycle: "h23" }),
  };
}

export function formatTime(
  date: Date,
  timeZone: string,
  timeFormat: TimeFormatPreference,
  includeSeconds = false,
) {
  return new Intl.DateTimeFormat("en-US", {
    ...timeFormatOptions(timeFormat, includeSeconds),
    timeZone,
  }).format(date);
}

export function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  }).format(date);
}

export function formatHourLabel(hour: number, timeFormat: TimeFormatPreference, concise = false) {
  if (timeFormat === "24h") {
    return concise ? String(hour).padStart(2, "0") : `${String(hour).padStart(2, "0")}:00`;
  }
  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? "AM" : "PM";
  return concise ? `${displayHour}${period[0]}` : `${displayHour}:00 ${period}`;
}

export function formatCountdown(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function getZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    minute: "numeric",
    month: "numeric",
    second: "numeric",
    timeZone,
    weekday: "short",
    year: "numeric",
  }).formatToParts(date);
  const numeric = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: numeric("year"),
    month: numeric("month"),
    day: numeric("day"),
    weekday: Math.max(0, weekdays.indexOf(weekdayName)),
    hour: numeric("hour"),
    minute: numeric("minute"),
    second: numeric("second"),
  };
}

export function addCalendarDays(
  date: Pick<ZonedDateParts, "year" | "month" | "day">,
  days: number,
) {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

export function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const representedAsUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUTC - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedDateTimeToDate(
  date: Pick<ZonedDateParts, "year" | "month" | "day">,
  minutes: number,
  timeZone: string,
) {
  const wallClock = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    Math.floor(minutes / 60),
    minutes % 60,
  );
  let result = new Date(wallClock);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    result = new Date(wallClock - getTimeZoneOffsetMilliseconds(result, timeZone));
  }
  return result;
}

export function getZonedMinutes(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}
