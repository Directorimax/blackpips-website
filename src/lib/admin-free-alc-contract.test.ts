import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lessons = readFileSync(new URL("../routes/admin/lessons.tsx", import.meta.url), "utf8");
const alc = readFileSync(new URL("../routes/admin/alc-library.tsx", import.meta.url), "utf8");
const courseMedia = readFileSync(new URL("./admin-course-media.ts", import.meta.url), "utf8");
const alcMedia = readFileSync(new URL("./admin-alc-media.ts", import.meta.url), "utf8");

describe("Free course and ALC Admin integration contracts", () => {
  it("keeps explicit Free/Premium course identity behind checked RPCs", () => {
    expect(lessons).toContain("p_access_type: area");
    expect(lessons).toContain('supabase.rpc("admin_create_course"');
    expect(lessons).toContain('supabase.rpc("admin_update_course"');
    expect(lessons).not.toContain('.from("courses").insert');
    expect(lessons).not.toContain("price === 0");
    expect(lessons).not.toMatch(/randomUUID|crypto\.randomUUID/);
  });

  it("keeps Free and Premium lessons on the established course-media pipeline", () => {
    expect(lessons).toContain("COURSE_MEDIA_BUCKET");
    expect(lessons).toContain("courseVideoPath(lesson.course_id, lesson.id)");
    expect(lessons).toContain("startResumableCourseVideoUpload");
    expect(lessons).toContain("admin_set_lesson_media");
    expect(courseMedia).toContain('export const COURSE_MEDIA_BUCKET = "course-media"');
  });

  it("keeps ALC navigation dedicated and external links compatible", () => {
    expect(lessons).not.toContain("ALC Access");
    expect(alc).toContain('createFileRoute("/admin/alc-library")');
    expect(alc).toContain('supabase.rpc("admin_save_alc_video"');
    expect(alc).toContain('mediaSource === "external"');
    expect(alc).toContain("Existing videos keep their current source");
  });

  it("uses checked initialize/upload/finalize and explicit media state", () => {
    expect(alc).toContain('supabase.rpc("admin_initialize_alc_self_hosted_video"');
    expect(alc).toContain("startResumableAlcVideoUpload");
    expect(alc).toContain('supabase.rpc("admin_finalize_alc_self_hosted_video"');
    expect(alc).toContain('supabase.rpc("admin_list_alc_video_media"');
    expect(alc).toContain('media_source === "self_hosted"');
    expect(alc).toContain('setUploadState("finalizing")');
    expect(alc).toContain("Uploaded video finalized successfully.");
  });

  it("keeps replacement and removal bounded to canonical ALC objects", () => {
    expect(alc).toContain("p_is_published: selectedFile ? false : videoForm.published");
    expect(alc).toContain("alcVideoPath(video.module_id, video.id)");
    expect(alc).toContain("alcPosterPath(video.module_id, video.id)");
    expect(alc).toContain("admin_clear_alc_self_hosted_media");
    expect(alc).toContain("The video record will remain");
    expect(alcMedia).toContain('export const ALC_MEDIA_BUCKET = "alc-media"');
    expect(alcMedia).toContain("`${moduleId}/${videoId}/video.mp4`");
  });

  it("uses authenticated TUS and exposes mobile-compatible file selection", () => {
    expect(alc).toContain("supabase.auth.getSession()");
    expect(alc).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(alc).toContain('accept="video/mp4,video/webm,video/quicktime');
    expect(courseMedia).toContain("authorization: `Bearer ${options.accessToken}`");
    expect(courseMedia).toContain('"x-upsert": options.upsert ? "true" : "false"');
  });

  it("does not introduce privileged credentials or public/signed URL persistence", () => {
    const changedSources = `${lessons}\n${alc}\n${courseMedia}\n${alcMedia}`;
    expect(changedSources).not.toMatch(/service[_-]?role/i);
    expect(changedSources).not.toContain("createSignedUrl");
    expect(changedSources).not.toContain("getPublicUrl");
    expect(changedSources).not.toContain("alc_access_requests");
  });
});
