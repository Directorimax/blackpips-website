import { describe, expect, it } from "vitest";
import { humanizeJournalValue, summarizeJournalEntries } from "./trading-journal";

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
    ).toEqual({ pnl: 160, wins: 1, losses: 1, grossProfit: 240, grossLoss: 80 });
  });
});
