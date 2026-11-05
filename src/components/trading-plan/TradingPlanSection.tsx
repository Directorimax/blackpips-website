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
      className={cn("card spot plan-sec", expanded && "open")}
    >
      <button
        type="button"
        onClick={onExpandedChange}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="plan-sec-h"
      >
        <span className={cn("psec-n", complete && "done")}>{icon}</span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <span className="flex flex-wrap items-center gap-2">
            <span className="h3">{title}</span>
            {complete && (
              <span className="chip chip-gold" style={{ fontSize: 11 }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
              </span>
            )}
          </span>
          <span className="small" style={{ display: "block", marginTop: 4 }}>
            {description}
          </span>
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
            <div className="plan-sec-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
