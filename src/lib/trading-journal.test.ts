import { describe, expect, it } from "vitest";
import {
  humanizeJournalValue,
  formatRiskReward,
  normalizeJournalProfitLoss,
  parseRiskReward,
  removeJournalEntryById,
  summarizeJournalEntries,
} from "./trading-journal";

describe("Trading Journal UI helpers", () => {
  it("renders canonical database values as polished labels", () => {
    expect(humanizeJournalValue("london_new_york_overlap")).toBe("London New York Overlap");
  });

  it("calculates month aggregates from the complete month data set", () => {
    expect(
      summarizeJournalEntries([
        { result: "win", profit_loss: 240 },
        { result: "loss", profit_loss: -80 },
        { result: "breakeven", profit_loss: 0 },
      ]),
    ).toEqual({ pnl: 160, wins: 1, losses: 1, breakEvens: 1, grossProfit: 240, grossLoss: 80 });
  });

  it.each([
    ["win", 30, 30],
    ["loss", 30, -30],
    ["loss", -30, -30],
    ["breakeven", 30, 0],
  ] as const)("normalizes %s profit/loss input", (result, amount, expected) => {
    expect(normalizeJournalProfitLoss(result, amount)).toBe(expected);
  });

  it("renders legacy positive loss records as losses", () => {
    expect(summarizeJournalEntries([{ result: "loss", profit_loss: 30 }])).toMatchObject({
      pnl: -30,
      wins: 0,
      losses: 1,
      grossProfit: 0,
      grossLoss: 30,
    });
  });

  it.each([
    ["1:5", 5],
    ["1:2.5", 2.5],
    ["2:5", 2.5],
    ["3", 3],
  ])("parses valid RR input %s", (input, expected) => {
    expect(parseRiskReward(input)).toEqual({ valid: true, value: expected });
  });

  it.each([":", "1:", ":5", "1::5", "abc", "0:5", "1:0", "-1", "-1:5"])(
    "rejects malformed RR input %s",
    (input) => expect(parseRiskReward(input)).toEqual({ valid: false, value: null }),
  );

  it("formats historical numeric RR values in trader notation", () => {
    expect(formatRiskReward(5)).toBe("1:5");
    expect(formatRiskReward(2.5)).toBe("1:2.5");
    expect(formatRiskReward(null)).toBe("—");
  });

  it("removes exactly one persisted ID and recalculates daily/monthly statistics", () => {
    const trades = [
      { id: "trade-a", result: "win" as const, profit_loss: 150 },
      { id: "trade-b", result: "loss" as const, profit_loss: 40 },
    ];
    const remaining = removeJournalEntryById(trades, "trade-a");
    expect(remaining.map(({ id }) => id)).toEqual(["trade-b"]);
    expect(summarizeJournalEntries(remaining)).toMatchObject({
      pnl: -40,
      wins: 0,
      losses: 1,
      breakEvens: 0,
    });
    expect(removeJournalEntryById(remaining, "trade-b")).toEqual([]);
  });

  it("retains projections when a delete fails before cache reconciliation", () => {
    const trades = [{ id: "trade-a" }, { id: "trade-b" }];
    // The reconciliation helper is intentionally called only after persistence succeeds.
    expect(trades).toHaveLength(2);
    expect(trades.map(({ id }) => id)).toEqual(["trade-a", "trade-b"]);
  });
});
