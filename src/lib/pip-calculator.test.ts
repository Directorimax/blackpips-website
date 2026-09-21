import { describe, expect, it } from "vitest";
import {
  calculateEstimatedValue,
  convertReferenceCurrency,
  INSTRUMENTS,
  isValidLotSize,
} from "./pip-calculator";

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

describe("Flutter-compatible quote-currency conversion", () => {
  const rates = { USD: 1.1, GBP: 0.85, JPY: 160, CHF: 0.95, CAD: 1.5, AUD: 1.65, NZD: 1.8 };

  it.each([
    ["EURUSD", 0.01, 100, "USD", 10],
    ["USDJPY", 0.01, 100, "USD", 6.875],
    ["EURGBP", 0.1, 210, "USD", 271.7647058824],
    ["EURGBP", 0.1, 210, "EUR", 247.0588235294],
    ["GER40", 1, 20, "GBP", 17],
  ])("matches Flutter semantics for %s", (symbol, lots, move, currency, expected) => {
    const instrument = INSTRUMENTS.find((item) => item.symbol === symbol)!;
    const quoteValue = calculateEstimatedValue(instrument, lots as number, move as number);
    const converted = convertReferenceCurrency(
      quoteValue,
      instrument.quoteCurrency,
      currency as string,
      rates,
    );
    expect(converted).toBeCloseTo(expected as number, 8);
  });

  it("returns no fabricated value when a required rate is missing", () => {
    expect(convertReferenceCurrency(1_000, "JPY", "USD", { USD: 1.2 })).toBeNull();
  });
});
