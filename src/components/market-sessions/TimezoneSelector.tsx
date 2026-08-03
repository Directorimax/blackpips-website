import { Check, ChevronDown, LocateFixed, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatTimeZoneLabel, type TimeFormatPreference } from "@/lib/market-session-time";

export function TimezoneSelector({
  commonTimeZones,
  supportedTimeZones,
  timeFormat,
  timeZone,
  visitorTimeZone,
  onFormatChange,
  onTimeZoneChange,
}: {
  commonTimeZones: readonly (readonly [string, string])[];
  supportedTimeZones: readonly string[];
  timeFormat: TimeFormatPreference;
  timeZone: string;
  visitorTimeZone: string;
  onFormatChange: (format: TimeFormatPreference) => void;
  onTimeZoneChange: (timeZone: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () =>
      supportedTimeZones
        .filter((zone) => formatTimeZoneLabel(zone).toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10),
    [query, supportedTimeZones],
  );

  const select = (zone: string) => {
    onTimeZoneChange(zone);
    setOpen(false);
    setQuery("");
  };

  return (
    <section
      className="mt-5 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
      aria-labelledby="timezone-controls-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="timezone-controls-title" className="font-display text-sm font-bold">
            Display timezone
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm font-semibold transition hover:border-gold/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Search className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span className="truncate">{formatTimeZoneLabel(timeZone)}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => select(visitorTimeZone)}
              disabled={timeZone === visitorTimeZone}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold transition hover:border-gold/45 disabled:cursor-default disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" /> Use my timezone
            </button>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-right">
            Time format
          </span>
          <div
            className="inline-flex rounded-lg border border-border bg-muted/70 p-1"
            role="group"
            aria-label="Time format"
          >
            {(["12h", "24h"] as const).map((format) => (
              <button
                key={format}
                type="button"
                aria-pressed={timeFormat === format}
                onClick={() => onFormatChange(format)}
                className={`min-h-9 min-w-12 rounded-md border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  timeFormat === format
                    ? "border-gold/45 bg-card text-foreground shadow-sm dark:text-gold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {open ? (
        <div className="mt-4 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Search IANA timezones</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city or timezone"
              className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Common timezone shortcuts">
            {commonTimeZones.map(([label, zone]) => (
              <button
                key={zone}
                type="button"
                onClick={() => select(zone)}
                className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold transition hover:border-gold/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-border bg-background p-1"
            role="listbox"
            aria-label="Timezone search results"
          >
            {matches.map((zone) => (
              <button
                key={zone}
                type="button"
                role="option"
                aria-selected={zone === timeZone}
                onClick={() => select(zone)}
                className="flex min-h-10 w-full items-center justify-between rounded-md px-3 text-left text-sm transition hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
              >
                <span>{formatTimeZoneLabel(zone)}</span>
                {zone === timeZone ? (
                  <Check className="h-4 w-4 text-gold" aria-hidden="true" />
                ) : null}
              </button>
            ))}
            {matches.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">No matching IANA timezone.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
