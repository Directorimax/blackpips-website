import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_ACCESS } from "./feature-access";

const catalog = readFileSync(new URL("../routes/courses/index.tsx", import.meta.url), "utf8");
const course = readFileSync(new URL("../routes/courses/$slug/index.tsx", import.meta.url), "utf8");
const lesson = readFileSync(
  new URL("../routes/courses/$slug/$lessonSlug.tsx", import.meta.url),
  "utf8",
);
const adminLessons = readFileSync(new URL("../routes/admin/lessons.tsx", import.meta.url), "utf8");

describe("Premium purchases on web with learning in the app", () => {
  it("keeps the required learning feature flags", () => {
    expect(FEATURE_ACCESS).toEqual({
      freeLessonsEnabled: false,
      premiumLessonsEnabled: true,
      alcAccessEnabled: false,
      mentorshipEnabled: true,
    });
  });

  it("preserves buying and distinguishes pending from purchased access", () => {
    expect(catalog).toContain('to: "/payment/$slug"');
    expect(catalog).toContain('eq("status", "pending")');
    expect(catalog).toContain("Continue in BLACKPIPS App");
    expect(course).toContain("Your payment is awaiting approval");
    expect(course).toContain("Purchased · Lifetime Access");
  });

  it("does not fetch or render Premium lesson media on learner routes", () => {
    expect(course).not.toContain('.from("lessons")');
    expect(course).not.toContain("createSignedUrl");
    expect(lesson).toContain('<Navigate to="/courses/$slug"');
    expect(lesson).not.toMatch(/video|createSignedUrl|get_lesson_playback_descriptor/i);
  });

  it("does not remove Premium lesson administration", () => {
    expect(adminLessons).toContain("Premium");
  });
});
