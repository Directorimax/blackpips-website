import { Bell, BookOpen, Layers3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReturnTypeOfUseMarketSessions } from "./market-sessions/types";
import {
  createDefaultAlertPreferences,
  getAlertTiming,
  getFiredAlertKey,
  MARKET_SESSION_ALERT_LEAD_TIMES,
  MARKET_SESSION_ALERT_STORAGE_KEY,
  MARKET_SESSION_FIRED_ALERT_STORAGE_KEY,
  parseAlertPreferences,
  serializeAlertPreferences,
  type MarketSessionAlertId,
  type MarketSessionAlertLeadMinutes,
} from "@/lib/market-session-alerts";
import { getOverlapSnapshots, getSessionSnapshot } from "@/lib/market-session-engine";
import { formatCountdown } from "@/lib/market-session-time";
import { SESSION_CONFIG } from "@/lib/market-session.config";

export function OverlapPanel({ market }: { market: ReturnTypeOfUseMarketSessions }) {
  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby="overlap-title">
      <div className="flex items-center gap-2">
        <Layers3 className="h-5 w-5 text-foreground dark:text-gold" aria-hidden="true" />
        <div>
          <h2 id="overlap-title" className="font-display text-lg font-bold">
            Session overlaps
          </h2>
          <p className="text-xs text-muted-foreground">
            Calculated from the actual IANA-local session intervals
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {market.overlaps.map((overlap) => {
          const emphasized = overlap.id === "london-new-york";
          return (
            <article
              key={overlap.id}
              className={`rounded-2xl border bg-card p-4 text-card-foreground shadow-sm ${
                emphasized ? "border-gold/45" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-bold">
                  {overlap.sessionNames.join(" + ")}
                </h3>
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-bold ${
                    overlap.isActive
                      ? "border-bull/30 bg-bull/15 text-bull"
                      : "border-gold/30 bg-gold/10 text-foreground dark:text-gold"
                  }`}
                >
                  {overlap.isActive ? "Active" : "Upcoming"}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold tabular-nums">
                {overlap.displayStart}–{overlap.displayEnd}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {Math.floor(overlap.durationMinutes / 60)}h {overlap.durationMinutes % 60}m
                </span>
                <span>
                  {overlap.isActive ? "Ends" : "Starts"} in {overlap.countdown}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {overlap.description}
              </p>
              {emphasized ? (
                <p className="mt-2 text-xs font-medium text-card-foreground">
                  Commonly watched for concentrated participation; activity is never guaranteed.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function TradingDayGuidance() {
  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby="guidance-title">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-foreground dark:text-gold" aria-hidden="true" />
        <div>
          <h2 id="guidance-title" className="font-display text-lg font-bold">
            Trading-day guidance
          </h2>
          <p className="text-xs text-muted-foreground">Educational context, not financial advice</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SESSION_CONFIG.map((session) => (
          <article
            key={session.id}
            className="rounded-xl border border-border bg-card px-4 py-3 text-card-foreground"
          >
            <h3 className="font-display text-sm font-bold">{session.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{session.knownFor}</p>
            <p className="mt-2 text-xs">
              <span className="font-semibold">Often watched:</span> {session.currencies.join(", ")}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Liquidity commonly builds from Asia-Pacific into Europe and North America. Overlaps can
        bring more simultaneous participation, but volatility varies with news, holidays and broader
        market conditions. Holiday liquidity and broker hours may differ from the standard session
        schedule.
      </div>
    </section>
  );
}

export function SessionAlerts({ market }: { market: ReturnTypeOfUseMarketSessions }) {
  const [preferences, setPreferences] = useState(createDefaultAlertPreferences);
  const [message, setMessage] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const london = market.sessions.find((session) => session.config.id === "london");
  const newYork = market.sessions.find((session) => session.config.id === "new-york");
  const overlap = market.overlaps.find((item) => item.id === "london-new-york");

  const alerts = useMemo(() => {
    const fallbackOccurrence = new Date(market.now.getTime() + 24 * 60 * 60_000);
    const londonOccurrence = london?.nextOpen ?? fallbackOccurrence;
    const followingLondonOccurrence = london
      ? getSessionSnapshot(
          london.config,
          new Date(londonOccurrence.getTime() + 1_000),
          market.timeZone,
          market.timeFormat,
        ).nextOpen
      : new Date(fallbackOccurrence.getTime() + 24 * 60 * 60_000);
    const newYorkOccurrence = newYork?.nextOpen ?? fallbackOccurrence;
    const followingNewYorkOccurrence = newYork
      ? getSessionSnapshot(
          newYork.config,
          new Date(newYorkOccurrence.getTime() + 1_000),
          market.timeZone,
          market.timeFormat,
        ).nextOpen
      : new Date(fallbackOccurrence.getTime() + 24 * 60 * 60_000);
    const overlapOccurrence = overlap?.start ?? fallbackOccurrence;
    const followingOverlapOccurrence = overlap
      ? (getOverlapSnapshots(
          new Date(overlap.end.getTime() + 1_000),
          market.timeZone,
          market.timeFormat,
        ).find((item) => item.id === "london-new-york")?.start ??
        new Date(overlapOccurrence.getTime() + 24 * 60 * 60_000))
      : new Date(fallbackOccurrence.getTime() + 24 * 60 * 60_000);

    return [
      {
        id: "london-open" as const,
        title: "London opening alert",
        eventCopy: "London opens",
        timing: getAlertTiming(
          market.now,
          londonOccurrence,
          followingLondonOccurrence,
          preferences["london-open"].leadMinutes,
        ),
      },
      {
        id: "new-york-open" as const,
        title: "New York opening alert",
        eventCopy: "New York opens",
        timing: getAlertTiming(
          market.now,
          newYorkOccurrence,
          followingNewYorkOccurrence,
          preferences["new-york-open"].leadMinutes,
        ),
      },
      {
        id: "london-new-york-overlap" as const,
        title: "London–New York overlap alert",
        eventCopy: "the London–New York overlap begins",
        timing: getAlertTiming(
          market.now,
          overlapOccurrence,
          followingOverlapOccurrence,
          preferences["london-new-york-overlap"].leadMinutes,
        ),
      },
    ];
  }, [london, market.now, market.timeFormat, market.timeZone, newYork, overlap, preferences]);

  useEffect(() => {
    try {
      setPreferences(
        parseAlertPreferences(window.localStorage.getItem(MARKET_SESSION_ALERT_STORAGE_KEY)),
      );
    } catch {
      setPreferences(createDefaultAlertPreferences());
    }
    setNotificationPermission(
      "Notification" in window ? window.Notification.permission : "unsupported",
    );
  }, []);

  useEffect(() => {
    if (notificationPermission !== "granted" || !("Notification" in window)) return;
    let fired: string[] = [];
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(MARKET_SESSION_FIRED_ALERT_STORAGE_KEY) ?? "[]",
      );
      fired = Array.isArray(stored) ? stored.filter((value) => typeof value === "string") : [];
    } catch {
      fired = [];
    }
    alerts.forEach((alert) => {
      const preference = preferences[alert.id];
      const elapsed = market.now.getTime() - alert.timing.trigger.getTime();
      const key = getFiredAlertKey(alert.id, alert.timing.occurrence);
      if (!preference.enabled || elapsed < 0 || elapsed >= 60_000 || fired.includes(key)) return;
      new window.Notification("BlackPips Market Sessions", {
        body: `Notification ${preference.leadMinutes} minutes before ${alert.eventCopy}.`,
      });
      fired.push(key);
    });
    try {
      window.localStorage.setItem(
        MARKET_SESSION_FIRED_ALERT_STORAGE_KEY,
        JSON.stringify(fired.slice(-20)),
      );
    } catch {
      // The alert still fires if deduplication persistence is unavailable.
    }
  }, [alerts, market.now, notificationPermission, preferences]);

  useEffect(() => {
    const hasEnabledAlert = Object.values(preferences).some((preference) => preference.enabled);
    if (
      hasEnabledAlert &&
      notificationPermission !== "default" &&
      notificationPermission !== "granted"
    ) {
      setMessage(
        "Browser notifications are unavailable; enabled in-app countdowns remain active while this page is open.",
      );
    }
  }, [notificationPermission, preferences]);

  const storePreferences = (
    id: MarketSessionAlertId,
    update: Partial<{ enabled: boolean; leadMinutes: MarketSessionAlertLeadMinutes }>,
  ) => {
    setPreferences((current) => {
      const next = {
        ...current,
        [id]: { ...current[id], ...update },
      };
      try {
        window.localStorage.setItem(
          MARKET_SESSION_ALERT_STORAGE_KEY,
          serializeAlertPreferences(next),
        );
      } catch {
        // The preference still applies for this visit.
      }
      return next;
    });
  };

  const toggle = async (id: MarketSessionAlertId) => {
    const isEnabled = preferences[id].enabled;
    let permission = notificationPermission;
    if (!isEnabled && permission === "default" && "Notification" in window) {
      try {
        permission = await window.Notification.requestPermission();
        setNotificationPermission(permission);
      } catch {
        permission = "denied";
        setNotificationPermission("denied");
      }
    }
    storePreferences(id, { enabled: !isEnabled });
    if (isEnabled) {
      setMessage("Alert disabled.");
    } else if (permission !== "granted") {
      setMessage(
        "Browser notifications are unavailable; the enabled in-app countdown remains active while this page is open.",
      );
    } else {
      setMessage("Browser-local alert enabled.");
    }
  };

  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby="alerts-title">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-foreground dark:text-gold" aria-hidden="true" />
        <div>
          <h2 id="alerts-title" className="font-display text-lg font-bold">
            Session alerts
          </h2>
          <p className="text-xs text-muted-foreground">
            Browser-local only; no server push or account storage
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {alerts.map((alert) => {
          const preference = preferences[alert.id];
          const countdownCopy =
            alert.timing.phase === "window"
              ? `The ${preference.leadMinutes}-minute alert window has started`
              : `Alert in ${formatCountdown(alert.timing.remainingMilliseconds)}`;
          return (
            <article
              key={alert.id}
              className={`flex h-full flex-col rounded-xl border p-4 text-left transition ${
                preference.enabled
                  ? "border-gold/45 bg-gold/10"
                  : "border-border bg-card hover:border-gold/35"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold">{alert.title}</h3>
                <button
                  type="button"
                  aria-pressed={preference.enabled}
                  aria-label={`${preference.enabled ? "Disable" : "Enable"} ${alert.title}`}
                  onClick={() => void toggle(alert.id)}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
                    preference.enabled
                      ? "border-gold/45 bg-gold/15 text-foreground dark:text-gold"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {preference.enabled ? "Enabled" : "Off"}
                </button>
              </div>
              <p className="mt-3 text-xs font-medium text-card-foreground">{countdownCopy}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Notification {preference.leadMinutes} minutes before {alert.eventCopy}.
              </p>
              <div className="mt-auto pt-3">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Notify before
                </span>
                <div
                  className="grid grid-cols-3 rounded-lg border border-border bg-muted/70 p-1"
                  role="group"
                  aria-label={`${alert.title} lead time`}
                >
                  {MARKET_SESSION_ALERT_LEAD_TIMES.map((leadMinutes) => (
                    <button
                      key={leadMinutes}
                      type="button"
                      aria-pressed={preference.leadMinutes === leadMinutes}
                      onClick={() => storePreferences(alert.id, { leadMinutes })}
                      className={`min-h-10 rounded-md border px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                        preference.leadMinutes === leadMinutes
                          ? "border-gold/45 bg-card text-foreground shadow-sm dark:text-gold"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {leadMinutes}m
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Alerts require this site, tab and browser notification permissions to remain available.{" "}
        {message}
      </p>
    </section>
  );
}
