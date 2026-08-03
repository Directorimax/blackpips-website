import { MarketSessionTimeline } from "@/components/MarketSessionTimeline";
import { OverlapPanel, SessionAlerts, TradingDayGuidance } from "@/components/MarketSessionExtras";
import { useMarketSessions } from "@/hooks/useMarketSessions";
import { SessionCard } from "./SessionCard";
import { TimezoneSelector } from "./TimezoneSelector";

export function MarketSessionsWorkspace() {
  const market = useMarketSessions();

  return (
    <div>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:items-start lg:gap-5 lg:pt-5 xl:gap-6">
        <div className="contents lg:block">
          <div className="order-1 lg:order-none lg:[&>section]:mt-0">
            <TimezoneSelector
              commonTimeZones={market.commonTimeZones}
              supportedTimeZones={market.supportedTimeZones}
              timeFormat={market.timeFormat}
              timeZone={market.timeZone}
              visitorTimeZone={market.visitorTimeZone}
              onFormatChange={market.setTimeFormat}
              onTimeZoneChange={market.setTimeZone}
            />
          </div>
          <div className="order-3 lg:order-none">
            <section className="mt-7" aria-labelledby="sessions-title">
              <div>
                <h2 id="sessions-title" className="font-display text-xl font-bold">
                  Major Forex sessions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Standard weekday windows converted from each market center’s IANA timezone
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {market.sessions.map((session) => (
                  <SessionCard key={session.config.id} session={session} isReady={market.isReady} />
                ))}
              </div>
            </section>
          </div>
          <div className="order-5 lg:order-none">
            <SessionAlerts market={market} />
            <p className="mt-5 rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Holiday liquidity and broker hours may differ from the standard session schedule. No
              holiday closure is inferred without a verified source.
            </p>
          </div>
        </div>

        <div className="contents lg:block">
          <div className="order-2 lg:order-none lg:[&>section]:mt-0">
            <MarketSessionTimeline
              isReady={market.isReady}
              now={market.now}
              timeFormat={market.timeFormat}
              timeZone={market.timeZone}
            />
          </div>
          <div className="order-4 lg:order-none">
            <OverlapPanel market={market} />
          </div>
          <div className="order-6 lg:order-none">
            <TradingDayGuidance />
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {market.announcement}
      </p>
    </div>
  );
}
