import { describe, expect, it } from "vitest";
import { calculateEstimatedValue, INSTRUMENTS, isValidLotSize } from "./pip-calculator";

const xauusd = INSTRUMENTS.find((instrument) => instrument.symbol === "XAUUSD");

if (!xauusd) throw new Error("XAUUSD configuration is required for calculator tests.");

describe("XAUUSD BlackPips pip convention", () => {
  it.each([
    [0.01, 100, 10],
    [0.1, 100, 100],
    [1, 100, 1_000],
    [0.01, 10, 1],
    [0.1, 10, 10],
  ])("calculates $%d lots and %d pips as $%d", (lotSize, pips, expected) => {
    expect(calculateEstimatedValue(xauusd, lotSize, pips)).toBe(expected);
  });
});

describe("lot-size validation", () => {
  it.each([0.01, 0.02, 0.1, 0.15, 1, 2.5])("accepts %s", (lotSize) => {
    expect(isValidLotSize(xauusd, lotSize)).toBe(true);
  });

  it.each([0, -0.1, 0.001, 0.0001, 0.015])("rejects %s", (lotSize) => {
    expect(isValidLotSize(xauusd, lotSize)).toBe(false);
  });
});
