import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lessonsSource = readFileSync(new URL("../routes/admin/lessons.tsx", import.meta.url), "utf8");
const alcSource = readFileSync(new URL("../routes/admin/alc-library.tsx", import.meta.url), "utf8");
const courseMutationSource = readFileSync(
  new URL("./admin-course-mutation.ts", import.meta.url),
  "utf8",
);
const tipsSource = readFileSync(
  new URL("../routes/admin/trading-tips.tsx", import.meta.url),
  "utf8",
);
const navSource = readFileSync(new URL("../components/Nav.tsx", import.meta.url), "utf8");

describe("admin lesson learning areas", () => {
  it("keeps Lesson Management focused on Premium and Free courses", () => {
    expect(lessonsSource).toContain('"Premium Lessons"');
    expect(lessonsSource).toContain('"Free Lessons"');
    expect(lessonsSource).not.toContain('"ALC Access"');
    expect(lessonsSource).not.toContain("<AdminAlcLibrary embedded />");
    expect(lessonsSource).not.toContain('navigate({ to: "/admin/alc-library" })');
    expect(lessonsSource).not.toContain(">ALC Library</span>");
    expect(alcSource).toContain('createFileRoute("/admin/alc-library")');
    expect(navSource).toContain('to: "/admin/alc-access"');
    expect(navSource).toContain('to: "/admin/alc-library"');
  });

  it("starts Premium management with a selector and isolates course creation", () => {
    expect(lessonsSource).toContain("Choose Premium Course");
    expect(lessonsSource).toContain("Create Premium Course");
    expect(lessonsSource).toContain("showCourseEditor");
    expect(lessonsSource).toContain('area === "premium" && showCourseEditor');
  });

  it("renders consistent thumbnail-first lesson cards with bounded descriptions", () => {
    expect(lessonsSource).toContain("lessonThumbnails[lesson.id]");
    expect(lessonsSource).toContain("min-h-[410px]");
    expect(lessonsSource).toContain("line-clamp-3");
    expect(lessonsSource).toContain("BLACKPIPS lesson");
    expect(lessonsSource).toContain("sm:grid-cols-2 xl:grid-cols-3");
  });

  it("uses the checked V2 lesson contracts and authoritative category partitions", () => {
    expect(lessonsSource).toContain('"admin_list_lessons_v2"');
    expect(lessonsSource).toContain('"admin_save_lesson_v2"');
    expect(lessonsSource).toContain('"admin_reorder_lesson_v2"');
    expect(lessonsSource).toContain("lesson.learning_category === freeCategory");
    expect(lessonsSource).toContain('p_learning_category: area === "free"');
    expect(lessonsSource).not.toContain('learning_category ?? "basic"');
  });

  it("keeps Free upload and YouTube mutually exclusive while Premium remains upload-only", () => {
    expect(lessonsSource).toContain(
      '<option value="self_hosted">Upload lesson video from device</option>',
    );
    expect(lessonsSource).toContain(
      '{area === "free" && <option value="youtube_legacy">YouTube Link</option>}',
    );
    expect(lessonsSource).toContain('form.mediaSource === "youtube_legacy"');
    expect(lessonsSource).toContain("getEmbeddableVideoUrl(form.videoUrl)");
  });

  it("uses checked thumbnail attachment and private canonical course-media paths", () => {
    expect(lessonsSource).toContain('"admin_set_lesson_thumbnail"');
    expect(lessonsSource).toContain("coursePosterPath(lesson.course_id, lesson.id)");
    expect(lessonsSource).toContain("courseVideoPath(lesson.course_id, lesson.id)");
    expect(lessonsSource).toContain("COURSE_MEDIA_BUCKET");
    expect(lessonsSource).not.toContain("getPublicUrl");
    expect(lessonsSource).toContain("No thumbnail uploaded");
    expect(lessonsSource).toContain("Replace thumbnail");
    expect(lessonsSource).toContain("Clear thumbnail");
  });

  it("keeps course, lesson, and upload actions explicitly isolated", () => {
    expect(lessonsSource).toContain('type="button"');
    expect(lessonsSource).toContain("runCourseSave(saveCourse)");
    expect(lessonsSource).toContain("runLessonSave(saveLesson)");
    expect(lessonsSource).toContain("startResumableCourseVideoUpload");
  });

  it("filters authoritative courses by access_type without using price", () => {
    expect(lessonsSource).toContain('course.access_type === "free"');
    expect(lessonsSource).toContain('course.access_type === "premium"');
    expect(lessonsSource).toContain("course.access_type === area");
    expect(lessonsSource).not.toContain("course.price === 0");
  });

  it("creates and updates courses only through checked RPCs with the selected classification", () => {
    expect(lessonsSource).toContain('"admin_create_course"');
    expect(lessonsSource).toContain('supabase.rpc("admin_update_course", args)');
    expect(lessonsSource).toContain("adminCourseMutationArgs");
    expect(courseMutationSource).toContain("p_access_type: accessType");
    expect(lessonsSource).not.toContain('.from("courses").insert');
    expect(lessonsSource).not.toMatch(/randomUUID|crypto\.randomUUID/);
  });

  it("makes device upload the default premium lesson workflow and exposes save-first guidance", () => {
    expect(lessonsSource).toContain('mediaSource: "self_hosted"');
    expect(lessonsSource).toContain("Upload lesson video from device");
    expect(lessonsSource).toContain("Save the lesson details to activate MP4 upload");
    expect(lessonsSource).toContain("Drag and drop or select media");
  });

  it("reuses the shared dropzone without adding lesson expiry to either admin library", () => {
    expect(lessonsSource).toContain("<MediaDropzone");
    expect(tipsSource).toContain("<MediaDropzone");
    expect(alcSource).not.toContain("ExpiryPicker");
    expect(lessonsSource).not.toContain("ExpiryPicker");
  });

  it("does not publish an incomplete self-hosted lesson", () => {
    expect(lessonsSource).toContain("finish its MP4 upload before publishing");
    expect(lessonsSource).toContain("Finish the MP4 upload before publishing this lesson");
  });

  it("preserves legacy links and adds the checked private ALC media flow", () => {
    expect(alcSource).toContain("Video URL (YouTube HTTPS)");
    expect(alcSource).toContain("admin_save_alc_video");
    expect(alcSource).not.toContain("startResumableCourseVideoUpload");
    expect(alcSource).toContain("<MediaDropzone");
    expect(alcSource).toContain("admin_initialize_alc_self_hosted_video");
    expect(alcSource).toContain("startResumableAlcVideoUpload");
    expect(alcSource).toContain("admin_finalize_alc_self_hosted_video");
    expect(alcSource).toContain("admin_update_alc_self_hosted_video");
    expect(alcSource).toContain("admin_clear_alc_self_hosted_media");
    expect(alcSource).toContain("Uploaded media removed. The video record remains as a draft.");
    expect(alcSource).toContain("Publication is applied only after Storage upload");
  });
});
