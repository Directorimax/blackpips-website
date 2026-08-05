import {
  memo,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, LocateFixed, MoonStar, Sun } from "lucide-react";
import { useMarketSessions } from "@/hooks/useMarketSessions";
import {
  axisTicks,
  clientXToMinutes,
  clockHandAngles,
  clockSecondForMode,
  flagForRegion,
  LAST_MINUTE_OF_DAY,
  MARKER_BUBBLE_WIDTH,
  markerConnectorGeometry,
  MARKET_TIMEZONES,
  minutesToPositionPercent,
  offsetForDisplayMinutes,
  requestFrameOnce,
} from "@/lib/market-hours-converter";
import { getTimelineSegments } from "@/lib/market-session-engine";
import { SESSION_CONFIG, type MarketSessionConfig } from "@/lib/market-session.config";
import {
  formatTime,
  formatTimeZoneLabel,
  formatTimeZoneOffset,
  getZonedParts,
  zonedDateTimeToDate,
  type TimeFormatPreference,
} from "@/lib/market-session-time";
import { MarketSessionDetails } from "./MarketSessionDetails";

const SESSION_COLORS: Record<(typeof SESSION_CONFIG)[number]["name"], string> = {
  Sydney: "#2f4fd8",
  Tokyo: "#a5108c",
  London: "#2f90ee",
  "New York": "#35c13b",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TimelineRow = {
  config: MarketSessionConfig;
  segments: ReturnType<typeof getTimelineSegments>;
};

type PlotBounds = { left: number; width: number };

export function ForexMarketHours() {
  const market = useMarketSessions();
  const liveParts = getZonedParts(market.now, market.timeZone);
  const liveMinutes = liveParts.hour * 60 + liveParts.minute + liveParts.second / 60;
  const [previewMinutes, setPreviewMinutes] = useState<number | null>(null);
  const previewMinutesRef = useRef<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const plotBoundsRef = useRef<PlotBounds>({ left: 0, width: 1 });
  const pendingClientXRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [plotWidth, setPlotWidth] = useState(1);

  const selectedMinutes = previewMinutes ?? liveMinutes;
  const previewNow = useMemo(
    () =>
      previewMinutes === null
        ? market.now
        : new Date(
            market.now.getTime() +
              offsetForDisplayMinutes(market.now, market.timeZone, previewMinutes),
          ),
    [market.now, market.timeZone, previewMinutes],
  );
  const previewParts = getZonedParts(previewNow, market.timeZone);

  const displayDay = getZonedParts(market.now, market.timeZone);
  const timelineReference = useMemo(
    () =>
      zonedDateTimeToDate(
        { year: displayDay.year, month: displayDay.month, day: displayDay.day },
        12 * 60,
        market.timeZone,
      ),
    [displayDay.day, displayDay.month, displayDay.year, market.timeZone],
  );
  const rows = useMemo<TimelineRow[]>(
    () =>
      SESSION_CONFIG.map((config) => ({
        config,
        segments: getTimelineSegments(config, timelineReference, market.timeZone),
      })),
    [market.timeZone, timelineReference],
  );
  const compactTicks = useMemo(
    () => axisTicks(market.timeFormat === "24h", true),
    [market.timeFormat],
  );
  const desktopTicks = useMemo(
    () => axisTicks(market.timeFormat === "24h", false),
    [market.timeFormat],
  );
  const timezoneOptions = useMemo(() => {
    const options: Array<readonly [string, string]> = [...MARKET_TIMEZONES];
    for (const zone of [market.visitorTimeZone, market.timeZone]) {
      if (!options.some(([, value]) => value === zone)) {
        options.unshift([formatTimeZoneLabel(zone), zone]);
      }
    }
    return options.map(
      ([label, zone]) =>
        [`${label} (${formatTimeZoneOffset(timelineReference, zone)})`, zone] as const,
    );
  }, [market.timeZone, market.visitorTimeZone, timelineReference]);

  const commitPreviewMinutes = useCallback((minutes: number | null) => {
    previewMinutesRef.current = minutes;
    setPreviewMinutes(minutes);
  }, []);

  const returnToLive = useCallback(() => {
    commitPreviewMinutes(null);
  }, [commitPreviewMinutes]);

  const updatePlotBounds = useCallback(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const rect = plot.getBoundingClientRect();
    plotBoundsRef.current = { left: rect.left, width: rect.width };
    setPlotWidth(rect.width);
  }, []);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    updatePlotBounds();
    const observer = new ResizeObserver(updatePlotBounds);
    observer.observe(plot);
    document.fonts?.ready.then(updatePlotBounds).catch(() => undefined);
    window.addEventListener("orientationchange", updatePlotBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updatePlotBounds);
    };
  }, [updatePlotBounds]);

  useEffect(
    () => () => {
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
    },
    [],
  );

  const flushPointerPosition = useCallback(() => {
    pointerFrameRef.current = null;
    const clientX = pendingClientXRef.current;
    if (clientX === null) return;
    const { left, width } = plotBoundsRef.current;
    commitPreviewMinutes(clientXToMinutes(clientX, left, width));
  }, [commitPreviewMinutes]);

  const queuePointerPosition = useCallback(
    (clientX: number) => {
      pendingClientXRef.current = clientX;
      pointerFrameRef.current = requestFrameOnce(pointerFrameRef.current, flushPointerPosition);
    },
    [flushPointerPosition],
  );

  const beginDrag = (event: PointerEvent<HTMLElement>) => {
    updatePlotBounds();
    draggingRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    queuePointerPosition(event.clientX);
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    queuePointerPosition(event.clientX);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (pointerFrameRef.current !== null) {
      cancelAnimationFrame(pointerFrameRef.current);
      flushPointerPosition();
    }
    returnToLive();
  };

  const handleSliderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let targetMinutes: number | null = null;
    if (event.key === "Home") targetMinutes = 0;
    if (event.key === "End") targetMinutes = LAST_MINUTE_OF_DAY;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown")
      targetMinutes = selectedMinutes - (event.shiftKey ? 60 : 15);
    if (event.key === "ArrowRight" || event.key === "ArrowUp")
      targetMinutes = selectedMinutes + (event.shiftKey ? 60 : 15);
    if (event.key === "Escape") {
      event.preventDefault();
      returnToLive();
      return;
    }
    if (targetMinutes === null) return;
    event.preventDefault();
    commitPreviewMinutes(
      Math.min(LAST_MINUTE_OF_DAY, Math.max(0, Math.round(targetMinutes / 15) * 15)),
    );
  };

  return (
    <div className="-mt-8 mx-auto w-full max-w-4xl overflow-x-clip">
      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="px-3 pb-4 pt-3 sm:px-7 sm:pb-6 sm:pt-5">
          <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            Forex Market Time Zone Converter
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag the clock to preview another time. It returns to now when released.
          </p>

          <ConverterControls
            timeFormat={market.timeFormat}
            timeZone={market.timeZone}
            visitorTimeZone={market.visitorTimeZone}
            timezoneOptions={timezoneOptions}
            onTimeFormatChange={market.setTimeFormat}
            onTimeZoneChange={market.setTimeZone}
          />

          <div className="relative mt-5 grid min-w-0 grid-cols-[106px_minmax(0,1fr)] [--row-h:64px] [--row-gap:5px] min-[390px]:grid-cols-[112px_minmax(0,1fr)] sm:mt-8 sm:grid-cols-[190px_minmax(0,1fr)] sm:[--row-h:96px] sm:[--row-gap:8px]">
            <SessionLabels rows={rows} previewNow={previewNow} timeFormat={market.timeFormat} />

            <div className="min-w-0 overflow-hidden" data-testid="market-hours-viewport">
              <div ref={plotRef} className="relative w-full" data-testid="market-hours-plot">
                <TimelineAxis compactTicks={compactTicks} desktopTicks={desktopTicks} />
                <TimelineRows rows={rows} selectedMinutes={selectedMinutes} />
                <MarkerLayer
                  dragging={dragging}
                  isPreview={previewMinutes !== null}
                  markerMinutes={selectedMinutes}
                  plotWidth={plotWidth}
                  previewNow={previewNow}
                  timeFormat={market.timeFormat}
                  timeZone={market.timeZone}
                  weekday={previewParts.weekday}
                  onKeyDown={handleSliderKeyDown}
                  onKeyUp={returnToLive}
                  onPointerDown={beginDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarketSessionDetails
        now={market.now}
        timeZone={market.timeZone}
        timeFormat={market.timeFormat}
      />
    </div>
  );
}

type ConverterControlsProps = {
  timeFormat: TimeFormatPreference;
  timeZone: string;
  visitorTimeZone: string;
  timezoneOptions: ReadonlyArray<readonly [string, string]>;
  onTimeFormatChange: (value: TimeFormatPreference) => void;
  onTimeZoneChange: (value: string) => boolean;
};

const ConverterControls = memo(function ConverterControls({
  timeFormat,
  timeZone,
  visitorTimeZone,
  timezoneOptions,
  onTimeFormatChange,
  onTimeZoneChange,
}: ConverterControlsProps) {
  return (
    <div className="mt-4 flex items-end justify-between gap-3 sm:mt-5">
      <div className="min-w-0">
        <label
          htmlFor="market-timezone"
          className="text-[11px] font-extrabold uppercase tracking-wide"
        >
          Timezone
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <div className="relative">
            <select
              id="market-timezone"
              value={timeZone}
              onChange={(event) => onTimeZoneChange(event.target.value)}
              className="w-[190px] max-w-full cursor-pointer appearance-none rounded-md bg-primary py-2.5 pl-3 pr-9 text-sm font-bold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 sm:w-[220px]"
            >
              {timezoneOptions.map(([label, zone]) => (
                <option key={zone} value={zone} className="bg-popover text-popover-foreground">
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
          </div>
          <button
            type="button"
            onClick={() => onTimeZoneChange(visitorTimeZone)}
            disabled={timeZone === visitorTimeZone}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-bold transition hover:border-gold/50 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <LocateFixed className="size-3.5" aria-hidden="true" /> My timezone
          </button>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[10px] font-extrabold uppercase tracking-wide sm:text-xs">
          24 Hour Time
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={timeFormat === "24h"}
          aria-label="24 hour time"
          onClick={() => onTimeFormatChange(timeFormat === "24h" ? "12h" : "24h")}
          className={`mt-1.5 inline-flex h-7 w-14 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold motion-reduce:transition-none ${timeFormat === "24h" ? "bg-gold" : "bg-muted"}`}
        >
          <span
            className={`size-5 rounded-full bg-card shadow transition-transform motion-reduce:transition-none ${timeFormat === "24h" ? "translate-x-7" : "translate-x-0"}`}
          />
        </button>
      </div>
    </div>
  );
});

const SessionLabels = memo(function SessionLabels({
  rows,
  previewNow,
  timeFormat,
}: {
  rows: TimelineRow[];
  previewNow: Date;
  timeFormat: TimeFormatPreference;
}) {
  return (
    <div className="relative z-30 bg-card" data-testid="market-hours-labels">
      <div className="h-[116px] sm:h-[162px]" />
      {rows.map(({ config }, index) => {
        const localParts = getZonedParts(previewNow, config.timeZone);
        return (
          <div
            key={config.id}
            className="flex h-[var(--row-h)] items-center gap-1 border-t border-border/50 bg-muted/55 px-1 sm:gap-3 sm:px-3.5"
            style={{ marginTop: index === 0 ? 0 : "var(--row-gap)" }}
          >
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-base shadow-sm sm:size-9 sm:text-2xl"
              aria-hidden="true"
            >
              {flagForRegion(config.regionCode)}
            </span>
            <div className="min-w-0">
              <div className="whitespace-nowrap font-display text-xs font-extrabold leading-tight sm:text-lg">
                <span className="max-[374px]:hidden">{config.name}</span>
                <span className="hidden max-[374px]:inline">
                  {config.name === "New York" ? "NY" : config.name}
                </span>
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[10px] leading-tight text-muted-foreground sm:text-base">
                {formatTime(previewNow, config.timeZone, timeFormat)}
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[8px] leading-tight text-muted-foreground sm:text-xs">
                {SHORT_WEEKDAYS[localParts.weekday]}{" "}
                {formatTimeZoneOffset(previewNow, config.timeZone).replace("GMT", "UTC")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const TimelineAxis = memo(function TimelineAxis({
  compactTicks,
  desktopTicks,
}: {
  compactTicks: ReturnType<typeof axisTicks>;
  desktopTicks: ReturnType<typeof axisTicks>;
}) {
  return (
    <div className="relative h-[116px] sm:h-[162px]" data-testid="market-hours-axis">
      <Sun
        className="absolute bottom-7 size-3 -translate-x-1/2 text-muted-foreground sm:size-4"
        style={{ left: `${minutesToPositionPercent(390)}%` }}
      />
      <MoonStar
        className="absolute bottom-7 size-3 -translate-x-1/2 text-muted-foreground sm:size-4"
        style={{ left: `${minutesToPositionPercent(1110)}%` }}
      />
      <AxisLabelRow ticks={compactTicks} className="lg:hidden" />
      <AxisLabelRow ticks={desktopTicks} className="hidden lg:block" />
    </div>
  );
});

const AxisLabelRow = memo(function AxisLabelRow({
  ticks,
  className,
}: {
  ticks: ReturnType<typeof axisTicks>;
  className: string;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-1.5 h-5 ${className}`}
      data-testid="market-hours-axis-label-row"
    >
      {ticks.map((tick, index) => (
        <span
          key={tick.minutes}
          data-axis-label
          data-minute={tick.minutes}
          className="absolute top-0 flex h-5 items-center justify-center whitespace-nowrap text-[8px] font-bold leading-none text-muted-foreground sm:text-[10px]"
          style={{
            left: `${minutesToPositionPercent(tick.minutes)}%`,
            transform:
              index === 0
                ? "translateX(0)"
                : index === ticks.length - 1
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
          }}
        >
          {tick.label}
        </span>
      ))}
    </div>
  );
});

const TimelineRows = memo(function TimelineRows({
  rows,
  selectedMinutes,
}: {
  rows: TimelineRow[];
  selectedMinutes: number;
}) {
  return (
    <>
      {rows.map(({ config, segments }, index) => {
        const isOpen = segments.some(
          (segment) =>
            selectedMinutes >= segment.startMinutes && selectedMinutes < segment.endMinutes,
        );
        return (
          <div
            key={config.id}
            className="relative h-[var(--row-h)] border-t border-border/50 bg-muted/55"
            style={{ marginTop: index === 0 ? 0 : "var(--row-gap)" }}
          >
            <GridLines />
            <div
              className="absolute left-1 top-1 z-10 whitespace-nowrap text-[7px] font-extrabold uppercase tracking-tight sm:left-3 sm:text-[10px] sm:tracking-wide"
              style={{ color: SESSION_COLORS[config.name] }}
            >
              <span className="sm:hidden">{config.name === "New York" ? "NY" : config.name} </span>
              <span className="hidden sm:inline">{config.name} session </span>
              {isOpen ? "open" : "closed"}
            </div>
            <StaticSessionBars config={config} segments={segments} />
          </div>
        );
      })}
    </>
  );
});

const StaticSessionBars = memo(function StaticSessionBars({
  config,
  segments,
}: {
  config: MarketSessionConfig;
  segments: TimelineRow["segments"];
}) {
  return segments.map((segment) => (
    <div
      key={`${config.id}-${segment.startMinutes}`}
      className="absolute bottom-[7px] top-[20px] rounded-[2px] sm:bottom-[12px] sm:top-[28px] sm:rounded-[3px]"
      style={{
        left: `${minutesToPositionPercent(segment.startMinutes)}%`,
        width: `${minutesToPositionPercent(segment.endMinutes - segment.startMinutes)}%`,
        backgroundColor: SESSION_COLORS[config.name],
      }}
    />
  ));
});

type MarkerLayerProps = {
  dragging: boolean;
  isPreview: boolean;
  markerMinutes: number;
  plotWidth: number;
  previewNow: Date;
  timeFormat: TimeFormatPreference;
  timeZone: string;
  weekday: number;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
};

const MarkerLayer = memo(function MarkerLayer({
  dragging,
  isPreview,
  markerMinutes,
  plotWidth,
  previewNow,
  timeFormat,
  timeZone,
  weekday,
  onKeyDown,
  onKeyUp,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: MarkerLayerProps) {
  const clockParts = getZonedParts(previewNow, timeZone);
  const { markerX, bubbleCenter, leftBaseX, rightBaseX, tipX } = markerConnectorGeometry(
    markerMinutes,
    plotWidth,
  );
  const transition = dragging ? "none" : "transform 350ms cubic-bezier(.2,.8,.2,1)";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 select-none"
      data-testid="market-hours-marker-layer"
    >
      <div
        className="pointer-events-none absolute bottom-0 left-0 top-[84px] w-[3px] bg-gold shadow-[0_0_8px_hsl(var(--gold)/0.25)] motion-reduce:!transition-none"
        style={{ transform: `translate3d(${markerX - 1.5}px, 0, 0)`, transition }}
        data-testid="market-hours-marker"
      />
      <div
        role="presentation"
        className={`pointer-events-auto absolute bottom-0 left-0 top-[76px] z-10 w-6 touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ transform: `translate3d(${markerX - 12}px, 0, 0)`, transition }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="market-hours-hit-area"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[72px] h-[14px] w-full bg-gold motion-reduce:!transition-none"
        style={{
          clipPath: `polygon(${leftBaseX}px 0, ${rightBaseX}px 0, ${tipX}px 100%)`,
          transition: dragging ? "none" : "clip-path 350ms cubic-bezier(.2,.8,.2,1)",
        }}
        data-testid="market-hours-bubble-pointer"
      />
      <div
        className="pointer-events-none absolute left-0 top-0 w-[68px] motion-reduce:!transition-none"
        style={{
          transform: `translate3d(${bubbleCenter - MARKER_BUBBLE_WIDTH / 2}px, 0, 0)`,
          transition,
        }}
        data-testid="market-hours-bubble"
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Preview market time"
          aria-valuemin={0}
          aria-valuemax={LAST_MINUTE_OF_DAY}
          aria-valuenow={Math.round(markerMinutes)}
          aria-valuetext={`${formatTime(previewNow, timeZone, timeFormat)}, ${WEEKDAYS[weekday]}`}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => {
            if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End")
              onKeyUp();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onPointerDown(event);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            onPointerMove(event);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            onPointerUp();
          }}
          onPointerCancel={onPointerUp}
          className={`pointer-events-auto flex h-[76px] w-[68px] touch-none flex-col items-center justify-start rounded-t-[34px] rounded-b-[16px] border border-gold/30 bg-gold pb-3 pt-1 text-background shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 sm:h-[78px] sm:pb-3.5 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-card shadow-sm sm:size-9">
            <Clock
              hour={clockParts.hour}
              minute={clockParts.minute}
              second={clockSecondForMode(clockParts.second, isPreview)}
            />
          </span>
          <span className="mt-0.5 text-[11px] font-extrabold leading-tight sm:text-xs">
            {formatTime(previewNow, timeZone, timeFormat)}
          </span>
          <span className="text-[9px] leading-tight opacity-85 sm:text-[10px]">
            {WEEKDAYS[weekday]}
          </span>
        </div>
      </div>
    </div>
  );
});

function GridLines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px calc(100% / 24))",
        backgroundSize: "calc(100% / 24) 100%",
      }}
    />
  );
}

function Clock({ hour, minute, second }: { hour: number; minute: number; second: number }) {
  const angles = clockHandAngles(hour, minute, second);
  return (
    <svg viewBox="0 0 40 40" className="size-[20px] text-gold" aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ transform: `rotate(${angles.hour}deg)`, transformOrigin: "20px 20px" }}
        data-testid="market-clock-hour-hand"
      />
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ transform: `rotate(${angles.minute}deg)`, transformOrigin: "20px 20px" }}
        data-testid="market-clock-minute-hand"
      />
      <line
        x1="20"
        y1="21"
        x2="20"
        y2="6"
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        style={{ transform: `rotate(${angles.second}deg)`, transformOrigin: "20px 20px" }}
        data-testid="market-clock-second-hand"
      />
      <circle cx="20" cy="20" r="1.75" fill="currentColor" />
    </svg>
  );
}
