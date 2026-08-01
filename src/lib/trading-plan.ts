import { z } from "zod";
import { sanitizePlainText } from "@/lib/text-security";

const safeText = z.string().trim().max(5000).transform(sanitizePlainText);
const optionalText = safeText.nullable().optional();
export const TRADING_PLAN_TIMEFRAMES = [
  "M1",
  "M3",
  "M5",
  "M15",
  "M30",
  "H1",
  "H4",
  "D1",
  "W1",
  "MN",
] as const;
export type TradingPlanTimeframe = (typeof TRADING_PLAN_TIMEFRAMES)[number];
export const tradingPlanTimeframeSchema = z.enum(TRADING_PLAN_TIMEFRAMES);
export const TRADING_PLAN_MARKETS = [
  "Forex",
  "Indices",
  "Commodities",
  "Crypto",
  "Stocks",
] as const;
export const TRADING_PLAN_SESSIONS = [
  "Sydney",
  "Asian",
  "London",
  "New York",
  "London–New York Overlap",
] as const;

const trimmedTextArray = z
  .array(safeText)
  .max(50)
  .transform((values) => [...new Set(values.filter(Boolean))]);

export const tradingPlanSchema = z
  .object({
    trader_name: z.string().trim().min(1).max(120),
    trading_style: z.string().trim().min(1).max(80),
    preferred_market: z.string().trim().min(1).max(80),
    preferred_session: z.string().trim().min(1).max(80),
    preferred_markets: z.array(z.enum(TRADING_PLAN_MARKETS)).min(1),
    preferred_sessions: z.array(z.enum(TRADING_PLAN_SESSIONS)).min(1),
    preferred_timeframes: z
      .array(tradingPlanTimeframeSchema)
      .min(1)
      .max(TRADING_PLAN_TIMEFRAMES.length),
    max_risk_per_trade: z.number().min(0).max(100),
    max_daily_loss: z.number().min(0).max(100),
    max_weekly_loss: z.number().min(0).max(100),
    max_open_trades: z.number().int().min(1).max(100),
    psychology_rules: optionalText,
    psychology_rules_list: trimmedTextArray,
    daily_routine: optionalText,
    daily_routine_before: optionalText,
    daily_routine_during: optionalText,
    daily_routine_after: optionalText,
    notes: optionalText,
  })
  .strict();
export type TradingPlan = z.output<typeof tradingPlanSchema> & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};
