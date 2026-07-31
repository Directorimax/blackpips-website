import type { TradingPlan } from "@/lib/trading-plan";

export type TradingPlanDraft = Omit<TradingPlan, "id" | "user_id" | "created_at" | "updated_at">;

export type SetTradingPlanDraft = <K extends keyof TradingPlanDraft>(
  key: K,
  value: TradingPlanDraft[K],
) => void;
