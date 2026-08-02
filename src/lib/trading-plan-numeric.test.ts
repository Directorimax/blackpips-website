import { describe, expect, it } from "vitest";
import { acceptsNumericInput, validateNumericInput } from "./trading-plan-numeric";

describe("Trading Plan numeric editing", () => {
  const decimalRules = { min: 0, max: 100, integer: false, label: "Risk" };
  const integerRules = { min: 1, max: 100, integer: true, label: "Open trades" };

  it('supports the editing transition "3" to "" to "1.5"', () => {
    expect(acceptsNumericInput("3", false)).toBe(true);
    expect(acceptsNumericInput("", false)).toBe(true);
    expect(validateNumericInput("", decimalRules).valid).toBe(false);
    expect(validateNumericInput("1.5", decimalRules)).toEqual({ valid: true, value: 1.5 });
  });

  it("rejects decimals and letters for integer-only fields", () => {
    expect(acceptsNumericInput("2.5", true)).toBe(false);
    expect(acceptsNumericInput("abc", true)).toBe(false);
    expect(validateNumericInput("2.5", integerRules).valid).toBe(false);
  });

  it("marks out-of-range values invalid so saving can be blocked", () => {
    expect(validateNumericInput("101", decimalRules)).toEqual({
      valid: false,
      error: "Risk must be between 0 and 100.",
    });
  });
});
