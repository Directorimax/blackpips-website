import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lessons = readFileSync(new URL("../routes/admin/lessons.tsx", import.meta.url), "utf8");
const alc = readFileSync(new URL("../routes/admin/alc-library.tsx", import.meta.url), "utf8");
const status = readFileSync(
  new URL("../components/admin/MediaFaststartStatus.tsx", import.meta.url),
  "utf8",
);
const helper = readFileSync(new URL("./admin-media-faststart.ts", import.meta.url), "utf8");

describe("Admin fast-start integration contract", () => {
  it("checks lesson processing after attachment and restores status on lesson cards", () => {
    expect(lessons).toContain('targetKind: "lesson"');
    expect(lessons).toContain('targetKind="lesson"');
    expect(lessons).toContain("waitForMediaFaststart");
    expect(lessons).toContain("Upload complete. Preparing video for fast playback");
  });

  it("restores ALC self-hosted processing without changing external media", () => {
    expect(alc).toContain('targetKind="alc_video"');
    expect(alc).toContain('video.media_source === "self_hosted"');
    expect(alc).toContain("Upload complete. Preparing video for fast playback.");
    expect(alc).toContain('videoForm.mediaSource === "external"');
  });

  it("supports failed-job retry without invoking upload or publication", () => {
    expect(helper).toContain("admin_retry_media_faststart_job");
    expect(status).toContain("Retry processing");
    expect(status).not.toContain("admin_set_lesson_media");
    expect(status).not.toContain("admin_finalize_alc_self_hosted_video");
    expect(status).not.toContain("p_is_published");
  });
});
