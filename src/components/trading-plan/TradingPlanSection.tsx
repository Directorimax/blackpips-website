import { CheckCircle2, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TradingPlanSection({
  title,
  description,
  icon,
  complete,
  expanded,
  onExpandedChange,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  complete: boolean;
  expanded: boolean;
  onExpandedChange: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: ReactNode;
}) {
  const contentId = `trading-plan-${title.toLowerCase().replaceAll(" ", "-")}`;
  const reducedMotion = useReducedMotion();

  return (
    <section
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card/70 transition-colors duration-200 hover:border-gold/50 hover:shadow-[0_8px_20px_hsl(var(--gold)/0.08)]",
        expanded ? "border-gold/50 bg-card/90 shadow-elegant" : "border-border/80",
      )}
    >
      <button
        type="button"
        onClick={onExpandedChange}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left outline-none transition-colors duration-200 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:px-5"
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
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
          className="mt-2 shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0, y: reducedMotion ? 0 : -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: reducedMotion ? 0 : -4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
            className="min-w-0 overflow-hidden"
          >
            <div className="min-w-0 overflow-x-hidden border-t border-border/70 px-4 py-5 sm:px-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
