import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../components/admin/PremiumLessonUploadQueue.tsx", import.meta.url),
  "utf8",
);
const lessonsSource = readFileSync(new URL("../routes/admin/lessons.tsx", import.meta.url), "utf8");

describe("Premium upload queue contract", () => {
  it("uses the existing private resumable lesson pipeline and truthful completion", () => {
    expect(source).toContain("startResumableCourseVideoUpload");
    expect(source).toContain("courseVideoPath(courseId, lessonId)");
    expect(source).toContain('"admin_set_lesson_media"');
    expect(source).toContain("waitForMediaFaststart");
    expect(source.indexOf('status: "completed"')).toBeGreaterThan(
      source.indexOf("waitForMediaFaststart"),
    );
  });

  it("keeps one backend identity per item across retries", () => {
    expect(source).toContain("p_lesson_id: lessonId");
    expect(source).toContain("lessonId = save.data?.[0]?.id ?? lessonId");
    expect(source).toContain("upsert: Boolean(initial.lessonId)");
    expect(source.indexOf("update(id, { lessonId });")).toBeLessThan(
      source.indexOf("update(id, { lessonId, status:"),
    );
  });

  it("supports multiple selection, per-file progress, retry, cancel and queued removal", () => {
    expect(source).toContain("multiple onFiles={addFiles}");
    expect(source).toContain("progress: progress.percentage");
    expect(source).toContain("Retry");
    expect(source).toContain("Cancel");
    expect(source).toContain("Remove");
  });

  it("is the only Premium lesson creation uploader and invalidates stale cancellation work", () => {
    expect(source).toContain("Add / Upload Premium Lessons");
    expect(source).toContain("generationRef.current.get(id) !== generation");
    expect(source).toContain("activeRef.current.delete(id)");
    expect(lessonsSource).toContain('{(area === "free" || Boolean(form.id)) && (');
    expect(lessonsSource).toContain('{area === "free" && form.mediaSource === "self_hosted" && (');
  });

  it("does not expose thumbnail selection in the Premium editor", () => {
    expect(lessonsSource).toContain('{area === "free" && (');
    expect(lessonsSource).toContain('area === "free" && lessonThumbnails[lesson.id]');
  });
});
