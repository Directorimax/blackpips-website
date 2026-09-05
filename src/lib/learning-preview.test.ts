import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canAccessLearningFeature, formatLessonDuration } from "./learning-preview";

const gate = readFileSync(
  new URL("../components/LearningFeatureGate.tsx", import.meta.url),
  "utf8",
);
const adminHook = readFileSync(new URL("../hooks/useAdmin.ts", import.meta.url), "utf8");
const freeRoute = readFileSync(new URL("../routes/free.tsx", import.meta.url), "utf8");
const courseGate = readFileSync(new URL("../routes/courses/$slug.tsx", import.meta.url), "utf8");
const courseRoute = readFileSync(
  new URL("../routes/courses/$slug/$lessonSlug.tsx", import.meta.url),
  "utf8",
);
const alcRoute = readFileSync(new URL("../routes/alc-access.tsx", import.meta.url), "utf8");

describe("admin-only learning preview", () => {
  it("allows a released feature or an authoritative admin, and denies everyone else", () => {
    expect(canAccessLearningFeature(false, true)).toBe(true);
    expect(canAccessLearningFeature(false, false)).toBe(false);
    expect(canAccessLearningFeature(true, false)).toBe(true);
  });

  it("resolves the admin role from profiles and fails closed while the current user is unresolved", () => {
    expect(adminHook).toContain('.from("profiles")');
    expect(adminHook).toContain('.select("role")');
    expect(adminHook).toContain('data?.role === "admin"');
    expect(adminHook).toContain("resolvedRole.userId === user.id");
    expect(adminHook).not.toMatch(/@.*blackpips|isAdmin\s*=\s*true|localStorage.*admin/i);
    expect(gate).toContain("if (loading)");
    expect(gate).toContain("canAccessLearningFeature(featureEnabled, isAdmin)");
  });

  it("gates Free, Premium direct routes, and ALC with the shared role-aware component", () => {
    expect(freeRoute).toContain("<LearningFeatureGate");
    expect(courseGate).toContain("<LearningFeatureGate");
    expect(alcRoute).toContain("<LearningFeatureGate");
  });
});

describe("live Free Lessons catalog", () => {
  it("uses published backend Free courses and published lessons without static fallback", () => {
    expect(freeRoute).not.toContain("FREE_LESSONS");
    expect(freeRoute).toContain('.from("courses")');
    expect(freeRoute).toContain('.eq("access_type", "free")');
    expect(freeRoute).toContain('.eq("published", true)');
    expect(freeRoute).toContain('.from("lessons")');
    expect(freeRoute).toContain('.eq("is_published", true)');
    expect(freeRoute).toContain('.order("position", { ascending: true })');
    expect(freeRoute).not.toMatch(/price\s*===?\s*0/);
  });

  it("formats authoritative duration metadata", () => {
    expect(formatLessonDuration(1664)).toBe("27:44");
    expect(formatLessonDuration(null)).toBe("Duration unavailable");
  });

  it("uses real course and lesson UUIDs with the existing private playback contract", () => {
    expect(freeRoute).toContain("lesson.id");
    expect(freeRoute).toContain("lesson.course_id");
    expect(courseRoute).toContain('"can_access_published_lesson"');
    expect(courseRoute).toContain('"get_lesson_playback_descriptor"');
    expect(courseRoute).toContain('.from("course-media")');
    expect(courseRoute).toContain("createSignedUrl");
  });

  it("uses authoritative Basic/Advanced categories and private signed thumbnails", () => {
    expect(freeRoute).toContain('useState<"basic" | "advanced">("basic")');
    expect(freeRoute).toContain("lesson.learning_category === category");
    expect(freeRoute).not.toContain('learning_category ?? "basic"');
    expect(freeRoute).toContain('"get_lesson_thumbnail_descriptor"');
    expect(freeRoute).toContain('.from("course-media")');
    expect(freeRoute).toContain("createSignedUrl");
    expect(freeRoute).toContain("?? 300");
    expect(freeRoute).toContain("min-h-[170px]");
    expect(freeRoute).toContain("line-clamp-2");
    expect(freeRoute).toContain("BLACKPIPS lesson");
    expect(freeRoute).toContain("240_000");
    expect(freeRoute).toContain("refreshThumbnails");
  });
});
