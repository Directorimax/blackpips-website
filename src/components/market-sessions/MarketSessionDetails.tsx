import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { flagForRegion } from "@/lib/market-hours-converter";
import { getAllSessionSnapshots } from "@/lib/market-session-engine";
import {
  ALERT_LEADS,
  DEFAULT_ALERTS,
  readAlertPreferences,
  WATCHED_PAIRS,
  writeAlertPreferences,
  type AlertId,
  type AlertPreferences,
} from "@/lib/market-session-details";
import { getOverlapSnapshot, OVERLAP_DEFINITIONS } from "@/lib/market-session-overlaps";
import { formatCountdown, type TimeFormatPreference } from "@/lib/market-session-time";

type MarketSessionDetailsProps = {
  now: Date;
  timeZone: string;
  timeFormat: TimeFormatPreference;
};

function MarketSessionDetailsView({ now, timeZone, timeFormat }: MarketSessionDetailsProps) {
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
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-7" data-testid="market-detail-sections">
      <SessionAlerts now={summaryNow} sessions={sessions} overlaps={overlaps} />
      <SessionOverlaps now={summaryNow} overlaps={overlaps} />
      <MajorSessions sessions={sessions} />
    </div>
  );
}

export const MarketSessionDetails = memo(
  MarketSessionDetailsView,
  (previous, next) =>
    previous.timeZone === next.timeZone &&
    previous.timeFormat === next.timeFormat &&
    Math.floor(previous.now.getTime() / 60_000) === Math.floor(next.now.getTime() / 60_000),
);

type SessionSnapshots = ReturnType<typeof getAllSessionSnapshots>;
type OverlapSnapshots = ReturnType<typeof getOverlapSnapshot>[];

const MajorSessions = memo(function MajorSessions({ sessions }: { sessions: SessionSnapshots }) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
      aria-labelledby="major-sessions-heading"
      data-section="sessions"
    >
      <h2 id="major-sessions-heading" className="font-display text-xl font-extrabold sm:text-2xl">
        Major Forex Sessions
      </h2>
      <div className="mt-3 grid auto-rows-fr gap-3 md:grid-cols-2 sm:mt-4">
        {sessions.map((session) => (
          <article
            key={session.config.id}
            className="flex h-full flex-col rounded-lg border border-border bg-muted/35 p-3 sm:p-4"
            data-session-card={session.config.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xl" aria-hidden="true">
                  {flagForRegion(session.config.regionCode)}
                </span>
                <h3 className="font-display text-base font-extrabold sm:text-lg">
                  {session.config.name}
                </h3>
              </div>
              <StatusBadge label={session.isOpen ? "Open" : "Closed"} active={session.isOpen} />
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Your timezone
                </p>
                <p className="whitespace-nowrap text-sm font-semibold">
                  {session.displayOpenTime}–{session.displayCloseTime}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {session.isOpen ? "Closes in" : "Opens in"}
                </p>
                <p className="text-base font-extrabold text-foreground">{session.countdown}</p>
              </div>
            </div>

            {session.isOpen ? (
              <div
                className="mt-2 h-1 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-label={`${session.config.name} session progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(session.progressPercentage)}
              >
                <span
                  className="block h-full rounded-full bg-gold"
                  style={{ width: `${session.progressPercentage}%` }}
                />
              </div>
            ) : null}

            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Commonly watched
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1" data-testid="watched-pairs">
                {WATCHED_PAIRS[session.config.name].map((pair) => (
                  <span
                    key={pair}
                    className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold"
                  >
                    {pair}
                  </span>
                ))}
              </div>
            </div>

            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                Local hours
              </summary>
              <p className="mt-1">
                {session.localOpenTime}–{session.localCloseTime} · {session.config.timeZone}
              </p>
            </details>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Standard session windows are shown for reference. Broker and holiday schedules may vary.
      </p>
    </section>
  );
});

const SessionOverlaps = memo(function SessionOverlaps({
  now,
  overlaps,
}: {
  now: Date;
  overlaps: OverlapSnapshots;
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
      aria-labelledby="session-overlaps-heading"
      data-section="overlaps"
    >
      <div className="flex items-end justify-between gap-3">
        <h2
          id="session-overlaps-heading"
          className="font-display text-xl font-extrabold sm:text-2xl"
        >
          Session Overlaps
        </h2>
        <span className="text-[10px] text-muted-foreground md:hidden">Swipe · 3 cards</span>
      </div>
      <div
        className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3 sm:mt-4"
        tabIndex={0}
        aria-label="Forex session overlap cards"
        data-testid="overlap-carousel"
      >
        {overlaps.map((overlap) => {
          const millisecondsUntilStart = overlap.start.getTime() - now.getTime();
          const status = overlap.isActive
            ? "Active"
            : millisecondsUntilStart <= 24 * 60 * 60_000
              ? "Upcoming"
              : "Closed";
          return (
            <article
              key={overlap.definition.id}
              className={`w-[88%] shrink-0 snap-start rounded-lg border p-3 focus-within:ring-2 focus-within:ring-gold md:w-auto md:p-4 ${overlap.definition.id === "london-new-york" ? "border-gold/60 bg-gold/5" : "border-border bg-muted/35"}`}
              data-overlap-card={overlap.definition.id}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-sm font-extrabold sm:text-base">
                  {overlap.definition.name}
                </h3>
                <StatusBadge label={status} active={overlap.isActive} />
              </div>
              <p className="mt-2 text-sm font-semibold">
                {overlap.displayStart}–{overlap.displayEnd}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {overlap.isActive ? "Ends" : "Starts"} in {overlap.countdown} ·{" "}
                {formatDuration(overlap.durationMinutes)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {overlap.definition.description}
              </p>
            </article>
          );
        })}
      </div>
      <div className="flex justify-center gap-1.5 md:hidden" aria-hidden="true">
        {overlaps.map((overlap) => (
          <span
            key={overlap.definition.id}
            className="size-1.5 rounded-full bg-muted-foreground/45"
          />
        ))}
      </div>
    </section>
  );
});

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}

type SessionAlertsProps = {
  now: Date;
  sessions: SessionSnapshots;
  overlaps: OverlapSnapshots;
};

const SessionAlerts = memo(function SessionAlerts({ now, sessions, overlaps }: SessionAlertsProps) {
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_ALERTS);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const notifiedRef = useRef(new Set<string>());

  useEffect(() => {
    setPreferences(readAlertPreferences(window.localStorage));
    setPreferencesLoaded(true);
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      writeAlertPreferences(window.localStorage, preferences);
    } catch {
      // Preferences still apply for the current visit.
    }
  }, [preferences, preferencesLoaded]);

  const london = sessions.find((session) => session.config.id === "london")!;
  const newYork = sessions.find((session) => session.config.id === "new-york")!;
  const londonNewYork = overlaps.find((overlap) => overlap.definition.id === "london-new-york")!;

  const alerts = useMemo<Array<{ id: AlertId; label: string; eventAt: Date }>>(
    () => [
      { id: "london-open", label: "London opens", eventAt: london.nextOpen },
      { id: "new-york-open", label: "New York opens", eventAt: newYork.nextOpen },
      {
        id: "london-new-york",
        label: "London–New York overlap begins",
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
            body: `${alert.label} in ${preference.leadMinutes} minutes.`,
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
      data-section="alerts"
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
          <Bell className="size-5 text-gold" aria-hidden="true" />
        ) : (
          <BellOff className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3 sm:mt-4 sm:gap-3">
        {alerts.map((alert) => {
          const preference = preferences[alert.id];
          const countdown = formatCountdown(
            alert.eventAt.getTime() - preference.leadMinutes * 60_000 - now.getTime(),
          );
          return (
            <article
              key={alert.id}
              className="rounded-lg border border-border bg-muted/35 p-3"
              data-alert-row={alert.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight">{alert.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Alert in {countdown}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preference.enabled}
                  aria-label={`${alert.label} alert`}
                  onClick={() => void toggleAlert(alert.id)}
                  className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${preference.enabled ? "bg-gold" : "bg-muted-foreground/25"}`}
                >
                  <span
                    className={`size-5 rounded-full bg-card shadow transition-transform motion-reduce:transition-none ${preference.enabled ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <div
                className="mt-2 flex flex-wrap gap-1"
                role="group"
                aria-label={`${alert.label} lead time`}
              >
                {ALERT_LEADS.map((minutes) => {
                  const selected = preference.leadMinutes === minutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setPreferences((current) => ({
                          ...current,
                          [alert.id]: { ...current[alert.id], leadMinutes: minutes },
                        }))
                      }
                      className={`min-h-8 min-w-9 rounded-md border px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${selected ? "border-gold bg-gold/15 text-foreground" : "border-border bg-card text-muted-foreground"}`}
                    >
                      {minutes}
                    </button>
                  );
                })}
                <span className="self-center pl-1 text-[10px] text-muted-foreground">
                  min before
                </span>
              </div>
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
