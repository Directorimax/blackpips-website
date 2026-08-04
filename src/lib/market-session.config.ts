export type SessionId = "sydney" | "tokyo" | "london" | "new-york";

export type MarketSessionConfig = {
  id: SessionId;
  name: "Sydney" | "Tokyo" | "London" | "New York";
  region: string;
  regionCode: string;
  timeZone: string;
  openMinutes: number;
  closeMinutes: number;
  weekdays: readonly number[];
};

const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export const SESSION_CONFIG: readonly MarketSessionConfig[] = [
  {
    id: "sydney",
    name: "Sydney",
    region: "Australia",
    regionCode: "AU",
    timeZone: "Australia/Sydney",
    openMinutes: 8 * 60,
    closeMinutes: 17 * 60,
    weekdays: WEEKDAYS,
  },
  {
    id: "tokyo",
    name: "Tokyo",
    region: "Japan",
    regionCode: "JP",
    timeZone: "Asia/Tokyo",
    openMinutes: 9 * 60,
    closeMinutes: 18 * 60,
    weekdays: WEEKDAYS,
  },
  {
    id: "london",
    name: "London",
    region: "United Kingdom",
    regionCode: "GB",
    timeZone: "Europe/London",
    openMinutes: 8 * 60,
    closeMinutes: 17 * 60,
    weekdays: WEEKDAYS,
  },
  {
    id: "new-york",
    name: "New York",
    region: "United States",
    regionCode: "US",
    timeZone: "America/New_York",
    openMinutes: 8 * 60,
    closeMinutes: 17 * 60,
    weekdays: WEEKDAYS,
  },
] as const;
