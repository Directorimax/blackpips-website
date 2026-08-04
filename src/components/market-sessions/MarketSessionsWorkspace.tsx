import { MarketSessionTimeline } from "@/components/MarketSessionTimeline";
import { useMarketSessions } from "@/hooks/useMarketSessions";
import { SessionCard } from "./SessionCard";
import { TimezoneSelector } from "./TimezoneSelector";

export function MarketSessionsWorkspace() {
  const market = useMarketSessions();

  return (
    <div className="mx-auto max-w-5xl overflow-x-clip">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Market Sessions</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          See when the major Forex sessions open and close in your selected timezone.
        </p>
      </header>

      <TimezoneSelector
        commonTimeZones={market.commonTimeZones}
        supportedTimeZones={market.supportedTimeZones}
        timeFormat={market.timeFormat}
        timeZone={market.timeZone}
        visitorTimeZone={market.visitorTimeZone}
        onFormatChange={market.setTimeFormat}
        onTimeZoneChange={market.setTimeZone}
      />

      <section className="mt-7" aria-labelledby="sessions-title">
        <h2 id="sessions-title" className="font-display text-lg font-bold">
          Major Forex sessions
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {market.sessions.map((session) => (
            <SessionCard key={session.config.id} session={session} isReady={market.isReady} />
          ))}
        </div>
      </section>

      <MarketSessionTimeline
        isReady={market.isReady}
        now={market.now}
        timeFormat={market.timeFormat}
        timeZone={market.timeZone}
      />

      <p className="mt-5 rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Standard Forex session windows are shown for reference. Broker and holiday schedules may
        vary.
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {market.announcement}
      </p>
    </div>
  );
}
