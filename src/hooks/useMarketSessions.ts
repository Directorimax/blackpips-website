import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSupportedTimeZones,
  getVisitorTimeZone,
  isValidTimeZone,
  MARKET_SESSION_TIME_FORMAT_STORAGE_KEY,
  MARKET_SESSION_TIME_ZONE_STORAGE_KEY,
  type TimeFormatPreference,
} from "@/lib/market-session-time";

const isTimeFormat = (value: string | null): value is TimeFormatPreference =>
  value === "12h" || value === "24h";

function getLocaleTimeFormat(): TimeFormatPreference {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12
      ? "12h"
      : "24h";
  } catch {
    return "24h";
  }
}

export function useMarketSessionPreferences() {
  const [timeFormat, setTimeFormatState] = useState<TimeFormatPreference>("24h");
  const [timeZone, setTimeZoneState] = useState("UTC");
  const [visitorTimeZone, setVisitorTimeZone] = useState("UTC");

  useEffect(() => {
    const detected = getVisitorTimeZone();
    setVisitorTimeZone(detected);
    try {
      const storedFormat = window.localStorage.getItem(MARKET_SESSION_TIME_FORMAT_STORAGE_KEY);
      const storedTimeZone = window.localStorage.getItem(MARKET_SESSION_TIME_ZONE_STORAGE_KEY);
      setTimeFormatState(isTimeFormat(storedFormat) ? storedFormat : getLocaleTimeFormat());
      setTimeZoneState(
        storedTimeZone && isValidTimeZone(storedTimeZone) ? storedTimeZone : detected,
      );
    } catch {
      setTimeFormatState(getLocaleTimeFormat());
      setTimeZoneState(detected);
    }
  }, []);

  const setTimeFormat = useCallback((value: TimeFormatPreference) => {
    setTimeFormatState(value);
    try {
      window.localStorage.setItem(MARKET_SESSION_TIME_FORMAT_STORAGE_KEY, value);
    } catch {
      // Preference still applies for the current visit.
    }
  }, []);

  const setTimeZone = useCallback((value: string) => {
    if (!isValidTimeZone(value)) return false;
    setTimeZoneState(value);
    try {
      window.localStorage.setItem(MARKET_SESSION_TIME_ZONE_STORAGE_KEY, value);
    } catch {
      // Preference still applies for the current visit.
    }
    return true;
  }, []);

  return {
    commonTimeZones: [
      ["East Africa Time", "Africa/Dar_es_Salaam"],
      ["UTC", "UTC"],
      ["London", "Europe/London"],
      ["New York", "America/New_York"],
      ["Tokyo", "Asia/Tokyo"],
      ["Sydney", "Australia/Sydney"],
    ] as const,
    supportedTimeZones: useMemo(() => getSupportedTimeZones(), []),
    timeFormat,
    timeZone,
    visitorTimeZone,
    setTimeFormat,
    setTimeZone,
  };
}

function useReliableNow(injectedNow?: Date) {
  const [now, setNow] = useState<Date | null>(injectedNow ?? null);

  useEffect(() => {
    if (injectedNow) {
      setNow(injectedNow);
      return;
    }
    const sync = () => setNow(new Date());
    const handleVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    sync();
    const interval = window.setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", sync);
    };
  }, [injectedNow]);

  return now;
}

export function useMarketSessions(injectedNow?: Date) {
  const preferences = useMarketSessionPreferences();
  const now = useReliableNow(injectedNow);
  const calculationNow = useMemo(() => now ?? new Date("2026-01-05T12:00:00Z"), [now]);

  return {
    ...preferences,
    isReady: Boolean(now),
    now: calculationNow,
  };
}
