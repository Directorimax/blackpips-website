import { CheckCircle2, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TradingPlanSection({
  title,
  description,
  icon,
  complete,
  expanded,
  onExpandedChange,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  complete: boolean;
  expanded: boolean;
  onExpandedChange: () => void;
  children: ReactNode;
}) {
  const contentId = `trading-plan-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card/70 transition-colors",
        expanded ? "border-gold/40 shadow-elegant" : "border-border/80 hover:border-gold/25",
      )}
    >
      <button
        type="button"
        onClick={onExpandedChange}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex w-full items-start gap-3 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:px-5"
      >
        <span
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
            complete ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-semibold">{title}</span>
            {complete && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
        </span>
        <ChevronDown
          className={cn(
            "mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div
          id={contentId}
          className="min-w-0 overflow-x-hidden border-t border-border/70 px-4 py-5 sm:px-5"
        >
          {children}
        </div>
      )}
    </section>
  );
}
