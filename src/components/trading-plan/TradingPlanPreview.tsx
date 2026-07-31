import { BookOpenCheck, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { TradingPlanDraft } from "./types";

type PreviewSection = "focus" | "risk" | "psychology" | "routine" | "notes";
const fallback = "Not set";

export function TradingPlanPreview({ draft }: { draft: TradingPlanDraft }) {
  const [openSection, setOpenSection] = useState<PreviewSection | null>(null);
  const routine = [
    ["Before", draft.daily_routine_before],
    ["During", draft.daily_routine_during],
    ["After", draft.daily_routine_after],
  ].filter(([, value]) => value?.trim());
  const sections: { id: PreviewSection; title: string; content: React.ReactNode }[] = [
    {
      id: "focus",
      title: "Trading Focus",
      content: (
        <dl className="grid gap-2">
          <PreviewRow label="Style" value={draft.trading_style || fallback} />
          <PreviewRow label="Markets" value={draft.preferred_markets.join(", ") || fallback} />
          <PreviewRow label="Sessions" value={draft.preferred_sessions.join(", ") || fallback} />
          <PreviewRow
            label="Timeframes"
            value={draft.preferred_timeframes.join(", ") || fallback}
          />
        </dl>
      ),
    },
    {
      id: "risk",
      title: "Risk Rules",
      content: (
        <dl className="grid gap-2">
          <PreviewRow label="Risk / trade" value={`${draft.max_risk_per_trade}%`} />
          <PreviewRow label="Daily loss" value={`${draft.max_daily_loss}%`} />
          <PreviewRow label="Weekly loss" value={`${draft.max_weekly_loss}%`} />
          <PreviewRow label="Open trades" value={String(draft.max_open_trades)} />
        </dl>
      ),
    },
    {
      id: "psychology",
      title: "Psychology Rules",
      content: draft.psychology_rules_list.length ? (
        <ul className="grid gap-2 pl-5 text-sm leading-6 text-muted-foreground marker:text-gold">
          {draft.psychology_rules_list.map((rule, index) => (
            <li key={`${rule}-${index}`} className="break-words [overflow-wrap:anywhere]">
              {rule}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyCopy />
      ),
    },
    {
      id: "routine",
      title: "Daily Routine",
      content: routine.length ? (
        <div className="grid gap-3">
          {routine.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                {value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyCopy />
      ),
    },
  ];
  if (draft.notes?.trim())
    sections.push({
      id: "notes",
      title: "Additional Notes",
      content: (
        <p className="whitespace-pre-line break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          {draft.notes}
        </p>
      ),
    });

  return (
    <aside className="max-h-[calc(100vh-7rem)] min-w-0 overflow-y-auto rounded-3xl border border-border bg-card/85 p-5 shadow-elegant sm:p-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-gold">
          <BookOpenCheck className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            My Trading Playbook
          </span>
        </div>
        <h2 className="mt-4 break-words font-display text-2xl font-semibold [overflow-wrap:anywhere]">
          {draft.trader_name?.trim() || "Your rules, clearly defined."}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A live view of the framework that guides your trading decisions.
        </p>
      </div>
      <div className="mt-6 grid gap-2">
        {sections.map((section) => {
          const open = openSection === section.id;
          const contentId = `playbook-${section.id}`;
          return (
            <div
              key={section.id}
              className="min-w-0 rounded-xl border border-border/70 bg-background/20"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenSection((current) => (current === section.id ? null : section.id))
                }
                aria-expanded={open}
                aria-controls={contentId}
                className="flex w-full items-center gap-3 px-3 py-3 text-left text-xs font-semibold uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
              >
                <span className="min-w-0 flex-1">{section.title}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div id={contentId} className="min-w-0 border-t border-border/70 px-3 py-3">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
function EmptyCopy() {
  return <p className="text-sm leading-6 text-muted-foreground">No rules added yet.</p>;
}
