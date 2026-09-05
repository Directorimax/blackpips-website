import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  adminCourseMutationArgs,
  courseMutationPersisted,
  updateAdminCourseAndVerify,
} from "./admin-course-mutation";

const componentSource = readFileSync(
  new URL("../routes/admin/lessons.tsx", import.meta.url),
  "utf8",
);

const form = {
  title: "Free lesson",
  slug: "free",
  description: "Free course",
  price: 0,
  image: "",
  published: true,
};

describe("Admin course update payload", () => {
  it("sends checked Free publication state and classification", () => {
    expect(adminCourseMutationArgs(form, "free")).toMatchObject({
      p_published: true,
      p_access_type: "free",
    });
    expect(adminCourseMutationArgs({ ...form, published: false }, "free")).toMatchObject({
      p_published: false,
      p_access_type: "free",
    });
  });

  it("preserves Premium classification independently of price", () => {
    expect(adminCourseMutationArgs({ ...form, price: 0 }, "premium")).toMatchObject({
      p_price: 0,
      p_access_type: "premium",
    });
  });

  it("requires the authoritative row to match UUID, publication, and access type", () => {
    const expected = { id: "course-id", published: true, accessType: "free" as const };
    expect(
      courseMutationPersisted({ id: "course-id", published: true, access_type: "free" }, expected),
    ).toBe(true);
    expect(
      courseMutationPersisted({ id: "course-id", published: false, access_type: "free" }, expected),
    ).toBe(false);
    expect(
      courseMutationPersisted(
        { id: "different-id", published: true, access_type: "free" },
        expected,
      ),
    ).toBe(false);
  });

  it("captures the actual edit form state and verifies the same course UUID", async () => {
    const update = vi.fn().mockResolvedValue({ error: null });
    const refetch = vi.fn().mockResolvedValue({
      data: { id: "course-id", published: true, access_type: "free" },
      error: null,
    });
    const result = await updateAdminCourseAndVerify({
      courseId: "course-id",
      values: { ...form, published: true },
      accessType: "free",
      update,
      refetch,
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        p_course_id: "course-id",
        p_published: true,
        p_access_type: "free",
      }),
    );
    expect(refetch).toHaveBeenCalledWith("course-id");
  });

  it("sends an explicit false publication state and preserves Premium classification", async () => {
    const update = vi.fn().mockResolvedValue({ error: null });
    const result = await updateAdminCourseAndVerify({
      courseId: "premium-id",
      values: { ...form, price: 0, published: false },
      accessType: "premium",
      update,
      refetch: vi.fn().mockResolvedValue({
        data: { id: "premium-id", published: false, access_type: "premium" },
        error: null,
      }),
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ p_published: false, p_access_type: "premium" }),
    );
  });

  it("fails without reporting success when the authoritative state mismatches", async () => {
    const result = await updateAdminCourseAndVerify({
      courseId: "course-id",
      values: form,
      accessType: "free",
      update: vi.fn().mockResolvedValue({ error: null }),
      refetch: vi.fn().mockResolvedValue({
        data: { id: "course-id", published: false, access_type: "free" },
        error: null,
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not confirmed");
  });

  it("returns RPC errors without performing the authoritative refetch", async () => {
    const refetch = vi.fn();
    const result = await updateAdminCourseAndVerify({
      courseId: "course-id",
      values: form,
      accessType: "free",
      update: vi.fn().mockResolvedValue({ error: { message: "RPC denied" } }),
      refetch,
    });
    expect(result).toMatchObject({ ok: false, message: "RPC denied" });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("binds the real course editor action directly to the verified course update path", () => {
    expect(componentSource).toContain('id="admin-course-form"');
    expect(componentSource).toContain("runCourseSave(saveCourse");
    expect(componentSource).toContain("checked={courseForm.published}");
    expect(componentSource).toContain("published: event.target.checked");
    expect(componentSource).toContain("const submission = { ...courseForm, title, slug, price }");
    expect(componentSource).toContain("updateAdminCourseAndVerify({");
    expect(componentSource).toContain('supabase.rpc("admin_update_course", args)');
    expect(componentSource).toContain('courseForm.id ? "Update course" : "Create course"');
  });

  it("keeps course and lesson actions in separate forms with explicit button handlers", () => {
    const courseStart = componentSource.indexOf('id="admin-course-form"');
    const courseEnd = componentSource.indexOf("</form>", courseStart);
    const lessonStart = componentSource.indexOf('id="admin-lesson-form"');
    const lessonEnd = componentSource.indexOf("</form>", lessonStart);
    const courseMarkup = componentSource.slice(courseStart, courseEnd);
    const lessonMarkup = componentSource.slice(lessonStart, lessonEnd);

    expect(courseStart).toBeGreaterThan(-1);
    expect(courseEnd).toBeLessThan(lessonStart);
    expect(lessonEnd).toBeGreaterThan(lessonStart);
    expect(courseMarkup).toContain("runCourseSave(saveCourse");
    expect(courseMarkup).not.toContain("saveLesson");
    expect(lessonMarkup).toContain("runLessonSave(saveLesson");
    expect(lessonMarkup).not.toContain("saveCourse");
    expect(courseMarkup).toContain('type="button"');
    expect(lessonMarkup).toContain('type="button"');
  });

  it("opens exceptional Premium course creation from the destination selector", () => {
    expect(componentSource).toContain('<option value="__create__">');
    expect(componentSource).toContain('value === "__create__"');
    expect(componentSource).toContain("setShowCourseEditor(true)");
    expect(componentSource).toContain('id="admin-course-form"');
    expect(componentSource).not.toContain("onClick={editSelectedCourse}");
  });
});
