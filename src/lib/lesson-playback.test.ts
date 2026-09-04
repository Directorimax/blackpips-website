import { describe, expect, it } from "vitest";
import { parseLessonPlaybackDescriptor } from "./lesson-playback";

describe("lesson playback descriptors", () => {
  it("parses self-hosted media without turning storage paths into public URLs", () => {
    expect(
      parseLessonPlaybackDescriptor({
        media_source: "self_hosted",
        video_storage_path: "course/lesson/video.mp4",
        video_poster_path: "course/lesson/poster.webp",
        video_mime_type: "video/mp4",
        video_duration_seconds: 82,
        playback_position_seconds: 12,
      }),
    ).toEqual({
      mediaSource: "self_hosted",
      videoStoragePath: "course/lesson/video.mp4",
      videoPosterPath: "course/lesson/poster.webp",
      videoMimeType: "video/mp4",
      videoDurationSeconds: 82,
      playbackPositionSeconds: 12,
      legacyVideoUrl: null,
    });
  });

  it("accepts the single-row RPC response shape and preserves legacy YouTube", () => {
    const descriptor = parseLessonPlaybackDescriptor([
      { media_source: "youtube_legacy", legacy_video_url: "https://youtu.be/example" },
    ]);
    expect(descriptor.mediaSource).toBe("youtube_legacy");
    expect(descriptor.legacyVideoUrl).toBe("https://youtu.be/example");
  });

  it("treats unknown or missing media sources as no media", () => {
    expect(parseLessonPlaybackDescriptor({ media_source: "unexpected" }).mediaSource).toBe("none");
  });
});
