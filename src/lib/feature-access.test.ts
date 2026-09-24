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
    expect(FEATURE_ACCESS.premiumLessonsEnabled).toBe(true);
    expect(FEATURE_ACCESS.alcAccessEnabled).toBe(false);
  });

  it("keeps premium lessons available independent of build mode", () => {
    expect(isFreeLessonsAvailable()).toBe(false);
    expect(isPremiumCatalogAvailable()).toBe(true);
    expect(isPremiumCourseAvailable("liquidity-engine")).toBe(true);
    expect(isPremiumCourseAvailable("alc-foundations")).toBe(true);
    expect(isPremiumCourseAvailable("eight-entries")).toBe(true);
    expect(isPremiumCourseAvailable("xauusd-mastery")).toBe(true);
    expect(isAlcAccessAvailable()).toBe(false);
  });
});
