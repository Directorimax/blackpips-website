import { describe, expect, it } from "vitest";
import { journalColumns, journalGridTemplateColumns } from "./journal-columns";

describe("journal list column layout", () => {
  it("uses one complete column definition for headers and rows", () => {
    expect(journalColumns.map(({ key }) => key)).toEqual([
      "pair",
      "trade_at",
      "direction",
      "session",
      "strategy",
      "entry_price",
      "stop_loss",
      "take_profit",
      "exit_price",
      "result",
      "risk_reward_ratio",
      "profit_loss",
      "screenshots",
      "actions",
    ]);
    expect(journalGridTemplateColumns.split("minmax(")).toHaveLength(journalColumns.length + 1);
  });
});
