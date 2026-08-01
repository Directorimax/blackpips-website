import { describe, expect, it } from "vitest";
import {
  humanizeJournalValue,
  normalizeJournalProfitLoss,
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
});
