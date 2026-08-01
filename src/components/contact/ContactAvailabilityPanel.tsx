import { Clock3 } from "lucide-react";
import { formatContactCountdown } from "@/lib/contact-availability";
import { useContactAvailability } from "@/hooks/useContactAvailability";

export function ContactAvailabilityPanel() {
  const availability = useContactAvailability();
  const statusLabel = availability.isReady ? availability.statusLabel : "Checking availability";

  return (
    <section
      aria-labelledby="contact-availability-title"
      className="glass mx-auto mt-6 max-w-4xl overflow-hidden rounded-3xl border border-gold/20 p-5 shadow-elegant sm:p-7"
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {statusLabel}
      </span>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${availability.isReady && availability.isOpen ? "bg-emerald-500 shadow-[0_0_14px_rgb(16_185_129_/_0.55)] motion-safe:animate-pulse" : "bg-muted-foreground/55"}`}
            />
            <p
              id="contact-availability-title"
              className={`text-xs font-bold uppercase tracking-[0.18em] ${availability.isReady && availability.isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
            >
              {statusLabel}
            </p>
          </div>
          <p className="mt-3 break-words font-display text-xl font-semibold sm:text-2xl">
            {availability.transitionLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Contact actions automatically become available during business hours.
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-gold/20 bg-gold/5 p-4 sm:min-w-56">
          <div className="flex items-center gap-2 text-gold">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {availability.isReady
                ? availability.isOpen
                  ? "Closing in"
                  : "Opening in"
                : "Local schedule"}
            </span>
          </div>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums sm:text-xl">
            {availability.isReady
              ? formatContactCountdown(availability.countdownMilliseconds)
              : "--h --m --s"}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-border/70 pt-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Current schedule:</span>{" "}
        {availability.scheduleLabel}
      </div>
    </section>
  );
}
