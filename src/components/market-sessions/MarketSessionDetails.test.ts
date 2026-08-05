import { describe, expect, it } from "vitest";
import {
  ALERT_LEADS,
  DEFAULT_ALERTS,
  MARKET_DETAIL_SECTION_ORDER,
  readAlertPreferences,
  WATCHED_PAIRS,
  writeAlertPreferences,
  type AlertPreferences,
} from "@/lib/market-session-details";

describe("market session detail sections", () => {
  it("uses the required section order", () => {
    expect(MARKET_DETAIL_SECTION_ORDER).toEqual(["alerts", "overlaps", "sessions"]);
  });

  it("supports the three compact alert lead times", () => {
    expect(ALERT_LEADS).toEqual([5, 15, 30]);
  });

  it("uses the approved commonly watched pairs", () => {
    expect(WATCHED_PAIRS).toEqual({
      Sydney: ["AUDUSD", "NZDUSD", "AUDJPY"],
      Tokyo: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY"],
      London: ["EURUSD", "GBPUSD", "EURGBP", "XAUUSD"],
      "New York": ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "XAUUSD"],
    });
  });

  it("persists enabled state and selected lead time", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const preferences: AlertPreferences = {
      ...DEFAULT_ALERTS,
      "london-open": { enabled: true, leadMinutes: 30 },
    };
    writeAlertPreferences(storage, preferences);
    expect(readAlertPreferences(storage)).toEqual(preferences);
  });

  it("rejects invalid stored lead times", () => {
    const storage = {
      getItem: () => JSON.stringify({ "london-open": { enabled: true, leadMinutes: 99 } }),
    };
    expect(readAlertPreferences(storage)["london-open"]).toEqual({
      enabled: true,
      leadMinutes: 15,
    });
  });
});
