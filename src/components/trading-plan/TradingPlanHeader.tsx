import { CheckCircle2, CircleDashed, Loader2, PencilLine } from "lucide-react";
import type { TradingPlanDraft } from "./types";

type PlanStatus = "draft" | "unsaved" | "saving" | "saved" | "complete";

export function TradingPlanHeader({
  draft,
  percentage,
  completedCount,
  requiredCount,
  lastSavedAt,
  status,
}: {
  draft: TradingPlanDraft;
  percentage: number;
  completedCount: number;
  requiredCount: number;
  lastSavedAt: string | null;
  status: PlanStatus;
}) {
  const statusConfig = {
    draft: { label: "Draft", icon: CircleDashed, className: "bg-muted text-muted-foreground" },
    unsaved: { label: "Unsaved Changes", icon: PencilLine, className: "bg-gold/15 text-gold" },
    saving: { label: "Saving…", icon: Loader2, className: "bg-gold/15 text-gold" },
    saved: {
      label: "Saved",
      icon: CheckCircle2,
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    complete: {
      label: "Complete",
      icon: CheckCircle2,
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
  }[status];
  const StatusIcon = statusConfig.icon;
  const summary = [
    ["Trading Style", draft.trading_style],
    ["Preferred Markets", draft.preferred_markets.join(", ")],
    ["Risk Per Trade", `${draft.max_risk_per_trade}%`],
    ["Preferred Sessions", draft.preferred_sessions.join(", ")],
  ];

  return (
    <header className="rounded-3xl border border-border bg-card/70 p-5 shadow-elegant sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Trader Tools
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Trading Plan Builder</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build the rules that guide every trade and turn consistency into a repeatable process.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm font-semibold ${statusConfig.className}`}
        >
          <StatusIcon className={`h-4 w-4 ${status === "saving" ? "animate-spin" : ""}`} />
          {statusConfig.label}
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">Plan completion</p>
            <p className="text-sm font-semibold text-gold">{percentage}% ready</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-gold transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {completedCount} of {requiredCount} required sections completed
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {lastSavedAt
            ? `Last saved ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSavedAt))}`
            : "Not saved yet"}
        </p>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-border/70 bg-background/30 px-3 py-3"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
              {value || "Not set"}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
