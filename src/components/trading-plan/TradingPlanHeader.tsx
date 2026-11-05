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
    draft: { label: "Draft", icon: CircleDashed },
    unsaved: { label: "Unsaved Changes", icon: PencilLine },
    saving: { label: "Saving…", icon: Loader2 },
    saved: {
      label: "Saved",
      icon: CheckCircle2,
    },
    complete: {
      label: "Complete",
      icon: CheckCircle2,
    },
  }[status];
  const StatusIcon = statusConfig.icon;
  const summary = [
    ["Trading Style", draft.trading_style],
    ["Preferred Markets", draft.preferred_markets.join(", ")],
    ["Risk Per Trade", `${draft.max_risk_per_trade}%`],
    ["Preferred Sessions", draft.preferred_sessions.join(", ")],
  ];

  const circumference = 2 * Math.PI * 50;

  return (
    <header className="card spot plan-head rise">
      <div className="plan-head-main">
        <div className="min-w-0">
          <p className="kicker">Trader Tools</p>
          <h1 className="h1" style={{ fontSize: "clamp(30px, 4vw, 46px)", marginTop: 10 }}>
            Trading Plan Builder
          </h1>
          <p className="body" style={{ marginTop: 8, maxWidth: 640 }}>
            Build the rules that guide every trade and turn consistency into a repeatable process.
          </p>
          <div className="row-wrap" style={{ gap: 10, marginTop: 16 }}>
            <span
              className={`chip ${status === "saved" || status === "complete" ? "chip-bull" : status === "draft" ? "" : "chip-gold"}`}
            >
              <StatusIcon
                aria-hidden="true"
                style={{ width: 14, height: 14 }}
                className={status === "saving" ? "animate-spin" : ""}
              />
              {statusConfig.label}
            </span>
            <span className="small" style={{ fontSize: 12 }}>
              {lastSavedAt
                ? `Last saved ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSavedAt))}`
                : "Not saved yet"}
            </span>
          </div>
        </div>
        <div className="plan-ring" aria-label={`Plan completion ${percentage}%`} role="img">
          <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--fill2)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#FABE33"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percentage / 100)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="plan-ring-v">
            <b>{percentage}%</b>
            <span className="small" style={{ fontSize: 11 }}>
              {completedCount} of {requiredCount}
            </span>
          </div>
        </div>
      </div>
      <dl className="plan-summary">
        {summary.map(([label, value]) => (
          <div key={label} className="card-flat" style={{ padding: 14, minWidth: 0 }}>
            <dt className="micro" style={{ fontSize: 10.5 }}>
              {label}
            </dt>
            <dd className="h4" style={{ marginTop: 6, overflowWrap: "anywhere" }}>
              {value || "Not set"}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
