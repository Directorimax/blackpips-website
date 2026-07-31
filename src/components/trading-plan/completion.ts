import type { TradingPlanDraft } from "./types";

export const planSectionNames = [
  "Trader Profile",
  "Risk Management",
  "Psychology Rules",
  "Daily Routine",
  "Additional Notes",
] as const;

export type PlanSectionName = (typeof planSectionNames)[number];

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export function getPlanCompletion(draft: TradingPlanDraft) {
  const completed: Record<PlanSectionName, boolean> = {
    "Trader Profile":
      hasText(draft.trader_name) &&
      hasText(draft.trading_style) &&
      draft.preferred_markets.length > 0 &&
      draft.preferred_sessions.length > 0 &&
      draft.preferred_timeframes.length > 0,
    "Risk Management":
      Number.isFinite(draft.max_risk_per_trade) &&
      Number.isFinite(draft.max_daily_loss) &&
      Number.isFinite(draft.max_weekly_loss) &&
      Number.isFinite(draft.max_open_trades),
    "Psychology Rules": draft.psychology_rules_list.some(hasText),
    "Daily Routine":
      hasText(draft.daily_routine_before) &&
      hasText(draft.daily_routine_during) &&
      hasText(draft.daily_routine_after),
    "Additional Notes": hasText(draft.notes),
  };
  const requiredSections = planSectionNames.filter((section) => section !== "Additional Notes");
  const completedCount = requiredSections.filter((section) => completed[section]).length;

  return {
    completed,
    completedCount,
    requiredCount: requiredSections.length,
    percentage: Math.round((completedCount / requiredSections.length) * 100),
  };
}
