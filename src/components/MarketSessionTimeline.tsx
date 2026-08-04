import { useEffect, useRef } from "react";
import {
  minutesToPosition,
  TIMELINE_BOUNDARIES,
  TIMELINE_HOURS,
} from "@/lib/market-session-timeline";
import { getTimelineSegments } from "@/lib/market-session-engine";
import { SESSION_CONFIG } from "@/lib/market-session.config";
import {
  formatHourLabel,
  formatTime,
  formatTimeZoneLabel,
  getZonedMinutes,
  type TimeFormatPreference,
} from "@/lib/market-session-time";

const SESSION_BAR_COLORS: Record<(typeof SESSION_CONFIG)[number]["name"], string> = {
  Sydney: "bg-sky-500/65",
  Tokyo: "bg-violet-500/65",
  London: "bg-gold/80",
  "New York": "bg-emerald-500/65",
};

export function MarketSessionTimeline({
  isReady,
  now,
  timeFormat,
  timeZone,
}: {
  isReady: boolean;
  now: Date;
  timeFormat: TimeFormatPreference;
  timeZone: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveMinutes = getZonedMinutes(now, timeZone);

  useEffect(() => {
    if (!isReady) return;
    const frame = window.requestAnimationFrame(() => {
      const viewport = scrollRef.current;
      if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return;
      const markerPosition = (liveMinutes / 1440) * viewport.scrollWidth;
      viewport.scrollLeft = Math.max(0, markerPosition - viewport.clientWidth / 2);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isReady, liveMinutes, timeZone]);

  return (
    <section className="mt-8" aria-labelledby="market-timeline-title">
      <div className="mb-3">
        <h2 id="market-timeline-title" className="font-display text-lg font-bold">
          24-hour timeline
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Session windows in {formatTimeZoneLabel(timeZone)}
        </p>
      </div>

      <div className="grid min-w-0 max-w-full grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="relative z-20 border-r border-border bg-card text-xs font-semibold text-card-foreground">
          <div className="h-10 border-b border-border" aria-hidden="true" />
          {SESSION_CONFIG.map((session) => (
            <div
              key={session.name}
              className="flex h-11 items-center border-b border-border/40 px-3 last:border-b-0"
            >
              {session.name}
            </div>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
          data-testid="session-timeline-scroll"
        >
          <div
            className="relative min-w-[720px] touch-pan-y lg:min-w-full"
            data-testid="session-timeline-plot"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {TIMELINE_BOUNDARIES.map((hour) => (
                <span
                  key={hour}
                  className={`absolute inset-y-0 w-px ${hour % 6 === 0 ? "bg-foreground/15" : "bg-border/45"}`}
                  style={{ left: `${minutesToPosition(hour * 60)}%` }}
                />
              ))}
            </div>

            <div className="relative h-10 border-b border-border text-[10px] font-medium tabular-nums text-muted-foreground">
              {TIMELINE_HOURS.map((hour) => (
                <span
                  key={hour}
                  className={`absolute bottom-2 whitespace-nowrap ${hour === 0 ? "" : "-translate-x-1/2"}`}
                  style={{ left: `${minutesToPosition(hour * 60)}%` }}
                >
                  {formatHourLabel(hour, timeFormat, true)}
                </span>
              ))}
            </div>

            {SESSION_CONFIG.map((session) => (
              <div
                key={session.name}
                className="relative h-11 border-b border-border/40 last:border-b-0"
              >
                {getTimelineSegments(session, now, timeZone).map((segment) => (
                  <div
                    key={`${session.name}-${segment.startMinutes}`}
                    className={`absolute inset-y-2 rounded ${SESSION_BAR_COLORS[session.name]}`}
                    style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                    role="img"
                    aria-label={`${session.name} session`}
                  />
                ))}
              </div>
            ))}

            {isReady ? (
              <div
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-gold shadow-[0_0_8px_rgb(212_175_55_/_0.5)]"
                style={{ left: `${minutesToPosition(liveMinutes)}%` }}
                data-testid="market-session-time-marker"
                aria-label={`Current time ${formatTime(now, timeZone, timeFormat)}`}
              >
                <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/45 bg-popover px-2 py-1 text-[9px] font-bold tabular-nums text-popover-foreground shadow-sm">
                  {formatTime(now, timeZone, timeFormat)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
