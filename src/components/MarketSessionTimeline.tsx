import {
  minutesToPosition,
  TIMELINE_BOUNDARIES,
  TIMELINE_HOURS,
} from "@/lib/market-session-timeline";
import {
  getAllSessionSnapshots,
  getInstantForDisplayMinutes,
  getMarketActivity,
  getOverlapSnapshots,
  getSessionSnapshot,
  getTimelineSegments,
} from "@/lib/market-session-engine";
import { SESSION_CONFIG } from "@/lib/market-session.config";
import {
  formatCountdown,
  formatHourLabel,
  formatTime,
  formatTimeZoneLabel,
  getZonedMinutes,
  type TimeFormatPreference,
} from "@/lib/market-session-time";
import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

const SESSION_BAR_COLORS: Record<(typeof SESSION_CONFIG)[number]["name"], string> = {
  Sydney:
    "bg-sky-500/65 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.24),0_0_12px_rgb(14_165_233_/_0.12)]",
  Tokyo:
    "bg-violet-500/65 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.24),0_0_12px_rgb(139_92_246_/_0.12)]",
  London:
    "bg-gold/80 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.28),0_0_12px_rgb(212_175_55_/_0.14)]",
  "New York":
    "bg-emerald-500/65 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.24),0_0_12px_rgb(16_185_129_/_0.12)]",
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
  const [dragMinutes, setDragMinutes] = useState<number | null>(null);
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dragMinutes === null) return;
    const reset = window.setTimeout(() => setDragMinutes(null), 8_000);
    return () => window.clearTimeout(reset);
  }, [dragMinutes]);

  const reference = now;
  const liveMinutes = getZonedMinutes(now, timeZone);
  const markerMinutes = dragMinutes ?? liveMinutes;
  const previewMinutes = dragMinutes ?? hoverMinutes ?? liveMinutes;
  const previewInstant = getInstantForDisplayMinutes(now, timeZone, previewMinutes);
  const previewSessions = useMemo(
    () => getAllSessionSnapshots(previewInstant, timeZone, timeFormat),
    [previewInstant, timeFormat, timeZone],
  );
  const previewOverlaps = useMemo(
    () => getOverlapSnapshots(previewInstant, timeZone, timeFormat),
    [previewInstant, timeFormat, timeZone],
  );
  const marketMoment = useMemo(
    () => getMarketActivity(previewSessions, previewOverlaps),
    [previewOverlaps, previewSessions],
  );
  const activeOverlap = previewOverlaps.find((overlap) => overlap.isActive);
  const upcomingSession = previewSessions
    .filter((session) => !session.isOpen)
    .sort((first, second) => first.nextOpen.getTime() - second.nextOpen.getTime())[0];

  const minutesFromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const rawMinutes = ((event.clientX - rect.left) / rect.width) * 1440;
    return Math.min(1425, Math.max(0, Math.round(rawMinutes / 15) * 15));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const minutes = minutesFromPointer(event);
    if (dragging) setDragMinutes(minutes);
    else if (event.pointerType === "mouse") setHoverMinutes(minutes);
  };

  const handleMarkerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const increments: Record<string, number> = {
      ArrowDown: -15,
      ArrowLeft: -15,
      ArrowRight: 15,
      ArrowUp: 15,
    };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setDragMinutes(event.key === "Home" ? 0 : 1425);
      return;
    }
    const increment = increments[event.key];
    if (!increment) return;
    event.preventDefault();
    setDragMinutes(Math.min(1425, Math.max(0, markerMinutes + increment)));
  };

  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby="market-timeline-title">
      <div className="mb-4">
        <h2 id="market-timeline-title" className="font-display text-lg font-bold">
          24-hour session timeline
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Standard session windows in {formatTimeZoneLabel(timeZone)}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-[6.75rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm sm:grid-cols-[7.25rem_minmax(0,1fr)]">
        <div className="relative z-20 border-r border-border bg-card text-xs font-semibold text-card-foreground">
          <div className="h-11 border-b border-border" aria-hidden="true" />
          {SESSION_CONFIG.map((session) => (
            <div
              key={session.name}
              className="flex h-12 items-center border-b border-border/40 px-3 last:border-b-0 sm:px-4"
            >
              {session.name}
            </div>
          ))}
        </div>

        <div
          className="min-w-0 overflow-x-auto overscroll-x-contain"
          data-testid="session-timeline-scroll"
        >
          <div
            ref={plotRef}
            className="relative min-w-[720px] touch-pan-y md:min-w-full"
            data-testid="session-timeline-plot"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => {
              if (!dragging) setHoverMinutes(null);
            }}
            onPointerUp={() => {
              if (!dragging) return;
              setDragging(false);
            }}
          >
            <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
              {TIMELINE_BOUNDARIES.map((hour) => {
                const isMajorHour = hour < 24 && hour % 6 === 0;

                return (
                  <span
                    key={hour}
                    className={`absolute inset-y-0 w-px ${
                      isMajorHour ? "bg-foreground/18 dark:bg-foreground/22" : "bg-border/45"
                    }`}
                    style={{ left: `${minutesToPosition(hour * 60)}%` }}
                  />
                );
              })}
            </div>

            <div className="relative z-10 h-11 border-b border-border text-[10px] font-medium tabular-nums text-muted-foreground">
              {TIMELINE_HOURS.map((hour) => (
                <span
                  key={hour}
                  className={`absolute bottom-2 whitespace-nowrap ${
                    hour === 0 ? "translate-x-0" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${minutesToPosition(hour * 60)}%` }}
                >
                  {formatHourLabel(hour, timeFormat, true)}
                </span>
              ))}
            </div>

            {SESSION_CONFIG.map((session) => (
              <div
                key={session.name}
                className="relative z-10 h-12 border-b border-border/40 last:border-b-0"
              >
                {getTimelineSegments(session, reference, timeZone).map((segment) => {
                  const segmentMidpoint = segment.left + segment.width / 2;
                  const tooltipAlignment =
                    segmentMidpoint < 30 ? "start" : segmentMidpoint > 70 ? "end" : "center";
                  const snapshot = getSessionSnapshot(session, reference, timeZone, timeFormat);
                  const tooltipText = `${session.name} · ${snapshot.displayOpenTime}–${snapshot.displayCloseTime} · ${formatTimeZoneLabel(timeZone)}`;

                  return (
                    <div
                      key={`${session.name}-${segment.startMinutes}`}
                      className="market-session-segment absolute inset-y-2 z-10"
                      style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                    >
                      <div
                        className={`h-full w-full rounded-md ${SESSION_BAR_COLORS[session.name]}`}
                        role="img"
                        aria-label={tooltipText}
                      />
                      <span
                        className="market-session-tooltip pointer-events-none invisible absolute bottom-full z-30 mb-1.5 w-max max-w-56 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] font-medium leading-none text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150"
                        data-align={tooltipAlignment}
                        role="tooltip"
                      >
                        {tooltipText}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

            {isReady ? (
              <div
                className="absolute inset-y-0 z-30 w-px bg-gold shadow-[0_0_10px_rgb(212_175_55_/_0.55)]"
                style={{ left: `${minutesToPosition(markerMinutes)}%` }}
                data-testid="market-session-time-marker"
              >
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Timeline selected time"
                  aria-valuemin={0}
                  aria-valuemax={1425}
                  aria-valuenow={markerMinutes}
                  aria-valuetext={formatTime(
                    getInstantForDisplayMinutes(now, timeZone, markerMinutes),
                    timeZone,
                    timeFormat,
                  )}
                  onKeyDown={handleMarkerKeyDown}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    setDragging(true);
                    setDragMinutes(minutesFromPointer(event));
                  }}
                  className="absolute left-1/2 top-1 flex min-h-6 -translate-x-1/2 cursor-ew-resize touch-none items-center gap-1 whitespace-nowrap rounded-full border border-gold/55 bg-popover px-2 text-[9px] font-bold tabular-nums text-popover-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_rgb(212_175_55_/_0.8)]" />
                  {dragMinutes === null ? "NOW" : "SELECTED"} ·{" "}
                  {formatTime(
                    getInstantForDisplayMinutes(now, timeZone, markerMinutes),
                    timeZone,
                    timeFormat,
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-sm"
        data-testid="market-activity-indicator"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {dragMinutes !== null || hoverMinutes !== null ? "Selected time" : "Current activity"}
            </span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-sm font-bold">{marketMoment.level}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatTime(previewInstant, timeZone, timeFormat)}
              </span>
            </div>
          </div>
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            Educational estimate
          </span>
        </div>
        <div className="mt-2 grid gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-semibold text-card-foreground">Open:</span>{" "}
            {marketMoment.activeSessions.map((session) => session.config.name).join(", ") || "None"}
          </p>
          <p>
            <span className="font-semibold text-card-foreground">Overlap:</span>{" "}
            {activeOverlap?.sessionNames.join(" + ") ?? "None"}
          </p>
          <p>
            <span className="font-semibold text-card-foreground">Upcoming:</span>{" "}
            {upcomingSession
              ? `${upcomingSession.config.name} in ${formatCountdown(
                  upcomingSession.nextOpen.getTime() - previewInstant.getTime(),
                )}`
              : "No upcoming opening"}
          </p>
          <p>{marketMoment.reason}</p>
        </div>
      </div>
      <div className="sr-only">
        {SESSION_CONFIG.map((session) => {
          const snapshot = getSessionSnapshot(session, reference, timeZone, timeFormat);
          return `${session.name}: ${snapshot.displayOpenTime} to ${snapshot.displayCloseTime} in ${formatTimeZoneLabel(timeZone)}. `;
        }).join("")}
      </div>
    </section>
  );
}
