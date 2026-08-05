import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getAllSessionSnapshots } from "@/lib/market-session-engine";
import {
  getOverlapSnapshot,
  OVERLAP_DEFINITIONS,
  type OverlapId,
} from "@/lib/market-session-overlaps";
import { formatCountdown, type TimeFormatPreference } from "@/lib/market-session-time";

const ALERT_STORAGE_KEY = "blackpips.marketSessions.alerts";
const ALERT_LEADS = [5, 15, 30] as const;

const WATCHED_CURRENCIES = {
  Sydney: "AUD, NZD",
  Tokyo: "JPY, AUD",
  London: "GBP, EUR, CHF",
  "New York": "USD, CAD",
} as const;

type AlertId = "london-open" | "new-york-open" | "london-new-york";
type AlertPreference = { enabled: boolean; leadMinutes: (typeof ALERT_LEADS)[number] };
type AlertPreferences = Record<AlertId, AlertPreference>;

const DEFAULT_ALERTS: AlertPreferences = {
  "london-open": { enabled: false, leadMinutes: 15 },
  "new-york-open": { enabled: false, leadMinutes: 15 },
  "london-new-york": { enabled: false, leadMinutes: 15 },
};

type MarketSessionDetailsProps = {
  now: Date;
  timeZone: string;
  timeFormat: TimeFormatPreference;
};

export const MarketSessionDetails = memo(function MarketSessionDetails({
  now,
  timeZone,
  timeFormat,
}: MarketSessionDetailsProps) {
  const minuteTimestamp = Math.floor(now.getTime() / 60_000) * 60_000;
  const summaryNow = useMemo(() => new Date(minuteTimestamp), [minuteTimestamp]);
  const sessions = useMemo(
    () => getAllSessionSnapshots(summaryNow, timeZone, timeFormat),
    [summaryNow, timeFormat, timeZone],
  );
  const overlaps = useMemo(
    () =>
      OVERLAP_DEFINITIONS.map((definition) =>
        getOverlapSnapshot(definition, summaryNow, timeZone, timeFormat),
      ),
    [summaryNow, timeFormat, timeZone],
  );

  return (
    <div className="mt-7 space-y-6 sm:mt-9 sm:space-y-8">
      <section
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
        aria-labelledby="major-sessions-heading"
      >
        <h2 id="major-sessions-heading" className="font-display text-xl font-extrabold sm:text-2xl">
          Major Forex Sessions
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {sessions.map((session) => (
            <article
              key={session.config.id}
              className="rounded-lg border border-border bg-muted/35 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-extrabold">{session.config.name}</h3>
                  <p className="text-xs text-muted-foreground">{session.config.timeZone}</p>
                </div>
                <StatusBadge active={session.isOpen} activeLabel="Open" inactiveLabel="Closed" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Your timezone</dt>
                  <dd className="font-semibold">
                    {session.displayOpenTime}–{session.displayCloseTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {session.isOpen ? "Closes in" : "Opens in"}
                  </dt>
                  <dd className="font-semibold text-gold">{session.countdown}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Commonly watched: {WATCHED_CURRENCIES[session.config.name]}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
        aria-labelledby="session-overlaps-heading"
      >
        <h2
          id="session-overlaps-heading"
          className="font-display text-xl font-extrabold sm:text-2xl"
        >
          Session Overlaps
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {overlaps.map((overlap) => (
            <article
              key={overlap.definition.id}
              className={`rounded-lg border p-4 ${overlap.definition.id === "london-new-york" ? "border-gold/60 bg-gold/5" : "border-border bg-muted/35"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-extrabold">{overlap.definition.name}</h3>
                <StatusBadge
                  active={overlap.isActive}
                  activeLabel="Active"
                  inactiveLabel="Upcoming"
                />
              </div>
              <p className="mt-2 text-sm font-semibold">
                {overlap.displayStart}–{overlap.displayEnd}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {overlap.isActive ? "Ends" : "Starts"} in {overlap.countdown} ·{" "}
                {overlap.durationMinutes} min
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {overlap.definition.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <SessionAlerts now={summaryNow} sessions={sessions} overlaps={overlaps} />
    </div>
  );
});

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

type SessionAlertsProps = {
  now: Date;
  sessions: ReturnType<typeof getAllSessionSnapshots>;
  overlaps: ReturnType<typeof getOverlapSnapshot>[];
};

const SessionAlerts = memo(function SessionAlerts({ now, sessions, overlaps }: SessionAlertsProps) {
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_ALERTS);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const notifiedRef = useRef(new Set<string>());

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ALERT_STORAGE_KEY);
      if (stored) setPreferences({ ...DEFAULT_ALERTS, ...JSON.parse(stored) });
    } catch {
      // Defaults remain available when storage is blocked.
    }
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences still apply for the current visit.
    }
  }, [preferences]);

  const london = sessions.find((session) => session.config.id === "london")!;
  const newYork = sessions.find((session) => session.config.id === "new-york")!;
  const londonNewYork = overlaps.find((overlap) => overlap.definition.id === "london-new-york")!;

  const alerts = useMemo<Array<{ id: AlertId; label: string; eventAt: Date }>>(
    () => [
      { id: "london-open", label: "London opening", eventAt: london.nextOpen },
      { id: "new-york-open", label: "New York opening", eventAt: newYork.nextOpen },
      {
        id: "london-new-york",
        label: "London–New York overlap",
        eventAt: londonNewYork.nextStart,
      },
    ],
    [london.nextOpen, londonNewYork.nextStart, newYork.nextOpen],
  );

  useEffect(() => {
    if (permission !== "granted") return;
    const timers = alerts.flatMap((alert) => {
      const preference = preferences[alert.id];
      if (!preference.enabled) return [];
      const alertAt = alert.eventAt.getTime() - preference.leadMinutes * 60_000;
      const delay = alertAt - Date.now();
      const key = `${alert.id}:${alertAt}`;
      if (delay < 0 || notifiedRef.current.has(key)) return [];
      return [
        window.setTimeout(() => {
          if (notifiedRef.current.has(key)) return;
          notifiedRef.current.add(key);
          new Notification(`${alert.label} soon`, {
            body: `${alert.label} begins in ${preference.leadMinutes} minutes.`,
          });
        }, delay),
      ];
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [alerts, permission, preferences]);

  const toggleAlert = async (id: AlertId) => {
    const enabling = !preferences[id].enabled;
    setPreferences((current) => ({
      ...current,
      [id]: { ...current[id], enabled: enabling },
    }));
    if (!enabling || permission !== "default" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
      aria-labelledby="session-alerts-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="session-alerts-heading"
            className="font-display text-xl font-extrabold sm:text-2xl"
          >
            Session Alerts
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Stored only in this browser.</p>
        </div>
        {permission === "granted" ? (
          <Bell className="size-5 text-gold" />
        ) : (
          <BellOff className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="mt-4 space-y-3">
        {alerts.map((alert) => {
          const preference = preferences[alert.id];
          const countdown = formatCountdown(
            alert.eventAt.getTime() - preference.leadMinutes * 60_000 - now.getTime(),
          );
          return (
            <article
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 p-3"
            >
              <div className="min-w-[150px] flex-1">
                <h3 className="text-sm font-bold">{alert.label}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Alert in {countdown}</p>
              </div>
              <select
                aria-label={`${alert.label} lead time`}
                value={preference.leadMinutes}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    [alert.id]: {
                      ...current[alert.id],
                      leadMinutes: Number(event.target.value) as AlertPreference["leadMinutes"],
                    },
                  }))
                }
                className="h-10 rounded-md border border-border bg-card px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {ALERT_LEADS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min before
                  </option>
                ))}
              </select>
              <button
                type="button"
                role="switch"
                aria-checked={preference.enabled}
                aria-label={`${alert.label} alert`}
                onClick={() => void toggleAlert(alert.id)}
                className={`inline-flex h-8 w-14 items-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${preference.enabled ? "bg-gold" : "bg-muted-foreground/25"}`}
              >
                <span
                  className={`size-6 rounded-full bg-card shadow transition-transform motion-reduce:transition-none ${preference.enabled ? "translate-x-6" : "translate-x-0"}`}
                />
              </button>
            </article>
          );
        })}
      </div>

      {permission === "denied" || permission === "unsupported" ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          Browser notifications are unavailable. Event countdowns will remain visible.
        </p>
      ) : null}
    </section>
  );
});
