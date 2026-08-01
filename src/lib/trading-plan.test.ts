import { describe, expect, it } from "vitest";
import { tradingPlanSchema } from "./trading-plan";

const plan = {
  trader_name: "BlackPips Learner",
  trading_style: "Day Trading",
  preferred_market: "Forex",
  preferred_session: "London",
  preferred_markets: ["Forex"],
  preferred_sessions: ["London"],
  preferred_timeframes: ["M15"],
  max_risk_per_trade: 1,
  max_daily_loss: 3,
  max_weekly_loss: 6,
  max_open_trades: 2,
  psychology_rules: null,
  daily_routine: null,
  daily_routine_before: null,
  daily_routine_during: null,
  daily_routine_after: null,
  notes: null,
};

describe("Trading Plan psychology rules", () => {
  it("trims blank rules while preserving the learner's rule order", () => {
    const result = tradingPlanSchema.parse({
      ...plan,
      psychology_rules_list: ["  Wait for confirmation  ", "", "  ", "Follow HTF trend"],
    });

    expect(result.psychology_rules_list).toEqual(["Wait for confirmation", "Follow HTF trend"]);
  });
});
