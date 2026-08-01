export const CONTACT_SCHEDULE = {
  timeZone: "Africa/Dar_es_Salaam",
  openingHour: 7,
  closingHour: 20,
  openWeekdays: [1, 2, 3, 4, 5, 6] as const,
  scheduleLabel: "Mon–Sat • 07:00–20:00 EAT",
} as const;

export const CONTACT_UNAVAILABLE_MESSAGE = "Contact is available Mon–Sat, 07:00–20:00 EAT.";

export type ContactAvailability = {
  isOpen: boolean;
  currentStatus: "open" | "closed";
  nextTransition: Date;
  countdownMilliseconds: number;
  statusLabel: "Available now" | "Currently closed";
  transitionLabel: string;
  scheduleLabel: string;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const zonedPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONTACT_SCHEDULE.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

function getZonedParts(date: Date): ZonedParts {
  const parts = Object.fromEntries(
    zonedPartsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

function getTimeZoneOffsetMilliseconds(date: Date) {
  const parts = getZonedParts(date);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedDateTimeToUtc(parts: Omit<ZonedParts, "weekday">) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let timestamp = utcGuess - getTimeZoneOffsetMilliseconds(new Date(utcGuess));
  timestamp = utcGuess - getTimeZoneOffsetMilliseconds(new Date(timestamp));
  return new Date(timestamp);
}

function addLocalDays(parts: ZonedParts, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

function nextOpening(parts: ZonedParts) {
  if (parts.weekday >= 1 && parts.weekday <= 6 && parts.hour < CONTACT_SCHEDULE.openingHour) {
    return zonedDateTimeToUtc({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: CONTACT_SCHEDULE.openingHour,
      minute: 0,
      second: 0,
    });
  }

  let daysAhead = 1;
  while (daysAhead <= 7) {
    const candidate = addLocalDays(parts, daysAhead);
    if (candidate.weekday >= 1 && candidate.weekday <= 6) {
      return zonedDateTimeToUtc({
        year: candidate.year,
        month: candidate.month,
        day: candidate.day,
        hour: CONTACT_SCHEDULE.openingHour,
        minute: 0,
        second: 0,
      });
    }
    daysAhead += 1;
  }

  throw new Error("Unable to calculate the next contact opening time.");
}

export function getContactAvailability(now: Date = new Date()): ContactAvailability {
  const parts = getZonedParts(now);
  const isScheduledDay = parts.weekday >= 1 && parts.weekday <= 6;
  const isOpen =
    isScheduledDay &&
    parts.hour >= CONTACT_SCHEDULE.openingHour &&
    parts.hour < CONTACT_SCHEDULE.closingHour;

  if (isOpen) {
    const nextTransition = zonedDateTimeToUtc({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: CONTACT_SCHEDULE.closingHour,
      minute: 0,
      second: 0,
    });
    return {
      isOpen: true,
      currentStatus: "open",
      nextTransition,
      countdownMilliseconds: Math.max(0, nextTransition.getTime() - now.getTime()),
      statusLabel: "Available now",
      transitionLabel: "We are available until 20:00 EAT",
      scheduleLabel: CONTACT_SCHEDULE.scheduleLabel,
    };
  }

  const nextTransition = nextOpening(parts);
  const openingParts = getZonedParts(nextTransition);
  return {
    isOpen: false,
    currentStatus: "closed",
    nextTransition,
    countdownMilliseconds: Math.max(0, nextTransition.getTime() - now.getTime()),
    statusLabel: "Currently closed",
    transitionLabel: `Next available ${WEEKDAY_LABELS[openingParts.weekday]} at 07:00 EAT`,
    scheduleLabel: CONTACT_SCHEDULE.scheduleLabel,
  };
}

export function formatContactCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}
