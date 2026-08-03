export const MARKET_SESSION_ALERT_STORAGE_KEY = "blackpips.marketSessions.alerts";
export const MARKET_SESSION_FIRED_ALERT_STORAGE_KEY = "blackpips.marketSessions.firedAlerts";

export const MARKET_SESSION_ALERT_IDS = [
  "london-open",
  "new-york-open",
  "london-new-york-overlap",
] as const;

export const MARKET_SESSION_ALERT_LEAD_TIMES = [5, 15, 30] as const;

export type MarketSessionAlertId = (typeof MARKET_SESSION_ALERT_IDS)[number];
export type MarketSessionAlertLeadMinutes = (typeof MARKET_SESSION_ALERT_LEAD_TIMES)[number];
export type MarketSessionAlertPreference = {
  enabled: boolean;
  leadMinutes: MarketSessionAlertLeadMinutes;
};
export type MarketSessionAlertPreferences = Record<
  MarketSessionAlertId,
  MarketSessionAlertPreference
>;

export function createDefaultAlertPreferences(): MarketSessionAlertPreferences {
  return {
    "london-open": { enabled: false, leadMinutes: 15 },
    "new-york-open": { enabled: false, leadMinutes: 15 },
    "london-new-york-overlap": { enabled: false, leadMinutes: 15 },
  };
}

function isAlertId(value: unknown): value is MarketSessionAlertId {
  return (
    typeof value === "string" && MARKET_SESSION_ALERT_IDS.includes(value as MarketSessionAlertId)
  );
}

function isLeadMinutes(value: unknown): value is MarketSessionAlertLeadMinutes {
  return (
    typeof value === "number" &&
    MARKET_SESSION_ALERT_LEAD_TIMES.includes(value as MarketSessionAlertLeadMinutes)
  );
}

export function parseAlertPreferences(stored: string | null): MarketSessionAlertPreferences {
  const preferences = createDefaultAlertPreferences();
  if (!stored) return preferences;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      parsed.filter(isAlertId).forEach((id) => {
        preferences[id].enabled = true;
      });
      return preferences;
    }
    if (!parsed || typeof parsed !== "object") return preferences;

    MARKET_SESSION_ALERT_IDS.forEach((id) => {
      const value = (parsed as Record<string, unknown>)[id];
      if (typeof value === "boolean") {
        preferences[id].enabled = value;
        return;
      }
      if (!value || typeof value !== "object") return;
      const candidate = value as Partial<MarketSessionAlertPreference>;
      preferences[id] = {
        enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : false,
        leadMinutes: isLeadMinutes(candidate.leadMinutes) ? candidate.leadMinutes : 15,
      };
    });
  } catch {
    return preferences;
  }

  return preferences;
}

export function serializeAlertPreferences(preferences: MarketSessionAlertPreferences) {
  return JSON.stringify(preferences);
}

export function getAlertTiming(
  now: Date,
  occurrence: Date,
  nextOccurrence: Date,
  leadMinutes: MarketSessionAlertLeadMinutes,
) {
  const leadMilliseconds = leadMinutes * 60_000;
  const currentTrigger = new Date(occurrence.getTime() - leadMilliseconds);
  const selectedOccurrence =
    currentTrigger.getTime() >= now.getTime() ? occurrence : nextOccurrence;
  const trigger = new Date(selectedOccurrence.getTime() - leadMilliseconds);
  const remainingMilliseconds = trigger.getTime() - now.getTime();
  const phase =
    remainingMilliseconds > 0
      ? "upcoming"
      : now.getTime() < selectedOccurrence.getTime()
        ? "window"
        : "passed";

  return {
    occurrence: selectedOccurrence,
    phase,
    remainingMilliseconds,
    trigger,
  } as const;
}

export function getFiredAlertKey(id: MarketSessionAlertId, occurrence: Date) {
  return `${id}:${occurrence.toISOString()}`;
}
