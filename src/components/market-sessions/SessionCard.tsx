import type { SessionSnapshot } from "@/lib/market-session-engine";

export function SessionCard({
  session,
  isReady = true,
}: {
  session: SessionSnapshot;
  isReady?: boolean;
}) {
  const { config } = session;
  const status = isReady ? (session.isOpen ? "Open" : "Closed") : "Checking";
  return (
    <article
      className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"
      aria-busy={!isReady}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-xs font-black text-foreground dark:text-gold">
            {config.regionCode}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold">{config.name}</h3>
            <p className="text-xs text-muted-foreground">{config.region}</p>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            isReady && session.isOpen
              ? "border-bull/30 bg-bull/15 text-bull"
              : "border-border bg-muted text-muted-foreground"
          }`}
          aria-label={`${config.name} status: ${status}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <span className="block text-muted-foreground">Selected timezone</span>
          <strong className="mt-0.5 block tabular-nums">
            {isReady ? `${session.displayOpenTime}–${session.displayCloseTime}` : "—"}
          </strong>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <span className="block text-muted-foreground">
            Session local · {session.timeZoneLabel}
          </span>
          <strong className="mt-0.5 block tabular-nums">
            {isReady ? `${session.localOpenTime}–${session.localCloseTime}` : "—"}
          </strong>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          {isReady ? (session.isOpen ? "Closes in" : "Opens in") : "Schedule"}
        </span>
        <strong className="tabular-nums">{isReady ? session.countdown : "Calculating"}</strong>
      </div>
    </article>
  );
}
