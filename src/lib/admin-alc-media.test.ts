import { describe, expect, it } from "vitest";
import {
  ALC_MEDIA_BUCKET,
  ALC_MEDIA_MAX_BYTES,
  alcPosterPath,
  alcVideoPath,
  validateAlcVideo,
} from "./admin-alc-media";

function file(name: string, type: string, size: number) {
  return { name, type, size } as File;
}

describe("admin ALC private-media contract", () => {
  it("keeps ALC in its separate private bucket and canonical namespace", () => {
    expect(ALC_MEDIA_BUCKET).toBe("alc-media");
    expect(alcVideoPath("module-id", "video-id")).toBe("module-id/video-id/video.mp4");
    expect(alcPosterPath("module-id", "video-id")).toBe("module-id/video-id/poster.webp");
  });

  it("accepts deployed video MIME types through the 3 GiB limit", () => {
    expect(validateAlcVideo(file("a.mp4", "video/mp4", 1))).toBeNull();
    expect(validateAlcVideo(file("a.webm", "video/webm", 1))).toBeNull();
    expect(validateAlcVideo(file("a.mov", "video/quicktime", 1))).toBeNull();
    expect(validateAlcVideo(file("a.avi", "video/x-msvideo", 1))).toMatch(/MP4, WebM/);
    expect(validateAlcVideo(file("a.mp4", "video/mp4", ALC_MEDIA_MAX_BYTES + 1))).toMatch(/3 GiB/);
  });
});
