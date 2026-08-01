import { BookOpenCheck, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TradingPlanDraft } from "./types";
import { useDesktopAccordionInteraction } from "./useDesktopAccordionInteraction";

type PreviewSection = "focus" | "risk" | "psychology" | "routine" | "notes";
const fallback = "Not set";

export function TradingPlanPreview({ draft }: { draft: TradingPlanDraft }) {
  const reducedMotion = useReducedMotion();
  const { openSection, onSectionMouseEnter, onSectionMouseLeave, onSectionClick } =
    useDesktopAccordionInteraction<PreviewSection>();
  const psychologyRules = draft.psychology_rules_list.map((rule) => rule.trim()).filter(Boolean);
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
      content: psychologyRules.length ? (
        <ol className="grid list-decimal gap-2 pl-6 text-sm leading-6 text-muted-foreground marker:font-semibold marker:text-gold">
          {psychologyRules.map((rule, index) => (
            <li key={`${rule}-${index}`} className="min-w-0 break-words [overflow-wrap:anywhere]">
              {rule}
            </li>
          ))}
        </ol>
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">{label}</p>
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
    <aside className="min-w-0 rounded-3xl shadow-elegant">
      <div className="max-h-[calc(100vh-7rem)] min-w-0 overflow-y-auto rounded-[inherit] border border-border bg-card/85 p-5 sm:p-6">
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
                onMouseEnter={() => onSectionMouseEnter(section.id)}
                onMouseLeave={onSectionMouseLeave}
                className={`min-w-0 overflow-hidden rounded-xl border transition-colors duration-200 hover:border-gold/50 hover:shadow-[0_8px_20px_hsl(var(--gold)/0.08)] ${open ? "border-gold/50 bg-card/95 shadow-[0_8px_20px_hsl(var(--gold)/0.08)]" : "border-border/70 bg-background/20"}`}
              >
                <button
                  type="button"
                  onClick={() => onSectionClick(section.id)}
                  aria-expanded={open}
                  aria-controls={contentId}
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left text-xs font-semibold uppercase tracking-widest outline-none transition-colors duration-200 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                >
                  <span className="min-w-0 flex-1">{section.title}</span>
                  <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={
                      reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }
                    }
                    className="shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={contentId}
                      initial={{ height: 0, opacity: 0, y: reducedMotion ? 0 : -4 }}
                      animate={{ height: "auto", opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: reducedMotion ? 0 : -4 }}
                      transition={
                        reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }
                      }
                      className="min-w-0 overflow-hidden"
                    >
                      <div className="min-w-0 border-t border-border/70 px-3 py-3">
                        {section.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
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
