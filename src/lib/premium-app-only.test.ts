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

  it("keeps the learner course branch app-only", () => {
    expect(course).toContain("return isAdmin ? <AdminCourseLessons /> : <LearnerCourseAccess />");
    expect(course).toContain("Your Premium Course is ready in the BLACKPIPS App");
    expect(catalog).toContain('{purchased ? "Continue in BLACKPIPS App" : "View status"}');
  });

  it("offers View Course only after the existing admin check succeeds", () => {
    expect(catalog).toContain("const { isAdmin, loading: adminLoading } = useAdmin()");
    expect(catalog).toContain("View Course");
    expect(course).toContain("const { isAdmin, loading } = useAdmin()");
    expect(course).toContain("<AdminCourseLessons />");
    expect(course).not.toMatch(/localStorage.*admin|@.*blackpips/i);
  });

  it("loads Premium lessons only in the verified admin course branch", () => {
    const adminBranch = course.indexOf("function AdminCourseLessons()");
    const lessonQuery = course.indexOf('.from("lessons")');
    expect(adminBranch).toBeGreaterThan(0);
    expect(lessonQuery).toBeGreaterThan(adminBranch);
    expect(course).toContain('to="/courses/$slug/$lessonSlug"');
  });

  it("redirects non-admin direct lesson visits before mounting playback", () => {
    const accessGate = lesson.indexOf("function AdminPremiumLessonAccess()");
    const adminCheck = lesson.indexOf("if (!isAdmin)", accessGate);
    const playerMount = lesson.indexOf("return <PremiumLesson />", accessGate);
    expect(accessGate).toBeGreaterThan(0);
    expect(adminCheck).toBeGreaterThan(accessGate);
    expect(playerMount).toBeGreaterThan(adminCheck);
    expect(lesson).toContain('<Navigate to="/courses/$slug"');
  });

  it("initializes the existing playback pipeline only inside the admin-mounted lesson", () => {
    expect(lesson).toContain('"get_lesson_playback_descriptor"');
    expect(lesson).toContain('.from("course-media")');
    expect(lesson).toContain("createSignedUrl");
    expect(lesson).toContain("<ProtectedSelfHostedLessonVideo");
    expect(lesson).toContain('"can_access_published_lesson"');
    expect(lesson).not.toContain('.from("purchases")');
  });

  it("does not remove Premium lesson administration", () => {
    expect(adminLessons).toContain("Premium");
  });
});
