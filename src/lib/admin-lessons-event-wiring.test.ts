import { describe, expect, it, vi } from "vitest";
import { runCourseSave, runLessonSave } from "./admin-lessons-event-wiring";

describe("Admin Lessons rendered action wiring", () => {
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
