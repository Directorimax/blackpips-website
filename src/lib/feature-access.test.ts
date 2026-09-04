import { describe, expect, it } from "vitest";
import {
  FEATURE_ACCESS,
  isAlcAccessAvailable,
  isFreeLessonsAvailable,
  isPremiumCatalogAvailable,
  isPremiumCourseAvailable,
} from "./feature-access";

describe("learning feature release flags", () => {
  it("keeps the production lesson feature flags disabled", () => {
    expect(FEATURE_ACCESS.freeLessonsEnabled).toBe(false);
    expect(FEATURE_ACCESS.premiumLessonsEnabled).toBe(false);
    expect(FEATURE_ACCESS.alcAccessEnabled).toBe(false);
  });

  it("keeps ordinary users behind Coming Soon independent of build mode", () => {
    expect(isFreeLessonsAvailable()).toBe(false);
    expect(isPremiumCatalogAvailable()).toBe(false);
    expect(isPremiumCourseAvailable("liquidity-engine")).toBe(false);
    expect(isPremiumCourseAvailable("alc-foundations")).toBe(false);
    expect(isPremiumCourseAvailable("eight-entries")).toBe(false);
    expect(isPremiumCourseAvailable("xauusd-mastery")).toBe(false);
    expect(isAlcAccessAvailable()).toBe(false);
  });
});
