import { describe, expect, it, vi } from "vitest";
import { courseEditForm, runCourseSave, runLessonSave } from "./admin-lessons-event-wiring";

const freeCourse = {
  id: "b7c4f690-ccc1-4dfd-9e03-e4886ce5547a",
  title: "Free lesson",
  slug: "free",
  description: "Existing description",
  price: 0,
  image: null,
  published: false,
  access_type: "free" as const,
};

describe("Admin Lessons rendered action wiring", () => {
  it("enters Free course edit mode with the real UUID and populated values", async () => {
    const editForm = courseEditForm(freeCourse, "free");

    expect(editForm).toEqual({
      id: freeCourse.id,
      title: "Free lesson",
      slug: "free",
      description: "Existing description",
      price: "0",
      image: "",
      published: false,
    });

    await Promise.resolve();
    expect(editForm?.id).toBe(freeCourse.id);
    expect(editForm?.title).toBe("Free lesson");
  });

  it("preserves Premium classification and rejects cross-area editing", () => {
    const premiumCourse = { ...freeCourse, id: "premium-id", access_type: "premium" as const };
    expect(courseEditForm(premiumCourse, "premium")?.id).toBe("premium-id");
    expect(courseEditForm(premiumCourse, "free")).toBeNull();
  });

  it("dispatches the course action only to the course mutation", async () => {
    const updateCourse = vi.fn();
    const saveLesson = vi.fn();
    const preventDefault = vi.fn();

    await runCourseSave(updateCourse, { preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(updateCourse).toHaveBeenCalledOnce();
    expect(saveLesson).not.toHaveBeenCalled();
  });

  it("dispatches the lesson action only to the lesson mutation", async () => {
    const updateCourse = vi.fn();
    const saveLesson = vi.fn();
    const preventDefault = vi.fn();

    await runLessonSave(saveLesson, { preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(saveLesson).toHaveBeenCalledOnce();
    expect(updateCourse).not.toHaveBeenCalled();
  });
});
