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
  currencies: readonly string[];
  instruments: readonly string[];
  activity: string;
  knownFor: string;
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
    currencies: ["AUD", "NZD"],
    instruments: ["AUDUSD", "NZDUSD", "AUDJPY"],
    activity: "Early Asia-Pacific liquidity",
    knownFor: "The transition into the Asia-Pacific trading day.",
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
    currencies: ["JPY", "AUD", "NZD"],
    instruments: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY"],
    activity: "Asia-session liquidity",
    knownFor: "JPY-focused activity and established Asian trading flows.",
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
    currencies: ["EUR", "GBP", "CHF"],
    instruments: ["EURUSD", "GBPUSD", "EURGBP", "XAUUSD"],
    activity: "Broad European liquidity",
    knownFor: "A major liquidity handoff from Asia into Europe.",
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
    currencies: ["USD", "CAD"],
    instruments: ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "XAUUSD"],
    activity: "North American liquidity",
    knownFor: "USD and CAD participation and the European-session overlap.",
  },
] as const;

export const OVERLAP_CONFIG = [
  {
    id: "sydney-tokyo",
    sessionIds: ["sydney", "tokyo"] as const,
    description: "Asia-Pacific sessions operating at the same time.",
  },
  {
    id: "tokyo-london",
    sessionIds: ["tokyo", "london"] as const,
    description: "The Asian close meeting the European open when their schedules intersect.",
  },
  {
    id: "london-new-york",
    sessionIds: ["london", "new-york"] as const,
    description: "A commonly watched overlap between European and North American liquidity.",
  },
] as const;

export const FOREX_WEEK_CONFIG = {
  timeZone: "America/New_York",
  openWeekday: 0,
  openMinutes: 17 * 60,
  closeWeekday: 5,
  closeMinutes: 17 * 60,
} as const;
