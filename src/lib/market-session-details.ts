const ALERT_STORAGE_KEY = "blackpips.marketSessions.alerts";

export const ALERT_LEADS = [5, 15, 30] as const;
export const MARKET_DETAIL_SECTION_ORDER = ["alerts", "overlaps", "sessions"] as const;

export const WATCHED_PAIRS = {
  Sydney: ["AUDUSD", "NZDUSD", "AUDJPY"],
  Tokyo: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY"],
  London: ["EURUSD", "GBPUSD", "EURGBP", "XAUUSD"],
  "New York": ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "XAUUSD"],
} as const;

export type AlertId = "london-open" | "new-york-open" | "london-new-york";
export type AlertPreference = {
  enabled: boolean;
  leadMinutes: (typeof ALERT_LEADS)[number];
};
export type AlertPreferences = Record<AlertId, AlertPreference>;

export const DEFAULT_ALERTS: AlertPreferences = {
  "london-open": { enabled: false, leadMinutes: 15 },
  "new-york-open": { enabled: false, leadMinutes: 15 },
  "london-new-york": { enabled: false, leadMinutes: 15 },
};

export function readAlertPreferences(storage: Pick<Storage, "getItem">): AlertPreferences {
  try {
    const stored = storage.getItem(ALERT_STORAGE_KEY);
    if (!stored) return DEFAULT_ALERTS;
    const parsed = JSON.parse(stored) as Partial<AlertPreferences>;
    return Object.fromEntries(
      Object.entries(DEFAULT_ALERTS).map(([id, fallback]) => {
        const candidate = parsed[id as AlertId];
        const leadMinutes = ALERT_LEADS.includes(
          candidate?.leadMinutes as (typeof ALERT_LEADS)[number],
        )
          ? candidate!.leadMinutes
          : fallback.leadMinutes;
        return [id, { enabled: candidate?.enabled === true, leadMinutes }];
      }),
    ) as AlertPreferences;
  } catch {
    return DEFAULT_ALERTS;
  }
}

export function writeAlertPreferences(
  storage: Pick<Storage, "setItem">,
  preferences: AlertPreferences,
) {
  storage.setItem(ALERT_STORAGE_KEY, JSON.stringify(preferences));
}
