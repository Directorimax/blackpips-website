export type LessonMediaSource = "none" | "youtube_legacy" | "self_hosted";

export type LessonPlaybackDescriptor = {
  mediaSource: LessonMediaSource;
  videoStoragePath: string | null;
  videoPosterPath: string | null;
  videoMimeType: string | null;
  videoDurationSeconds: number | null;
  playbackPositionSeconds: number;
  legacyVideoUrl: string | null;
};

export const COURSE_MEDIA_SIGNED_URL_TTL_SECONDS = 300;
export const COURSE_MEDIA_REFRESH_AFTER_MS = 270_000;

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

export function parseLessonPlaybackDescriptor(value: unknown): LessonPlaybackDescriptor {
  const candidate = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Invalid lesson playback descriptor.");
  }
  const row = candidate as Record<string, unknown>;
  const rawSource = optionalString(row.media_source);
  const mediaSource: LessonMediaSource =
    rawSource === "self_hosted" || rawSource === "youtube_legacy" ? rawSource : "none";

  return {
    mediaSource,
    videoStoragePath: optionalString(row.video_storage_path),
    videoPosterPath: optionalString(row.video_poster_path),
    videoMimeType: optionalString(row.video_mime_type),
    videoDurationSeconds: optionalInteger(row.video_duration_seconds),
    playbackPositionSeconds: optionalInteger(row.playback_position_seconds) ?? 0,
    legacyVideoUrl: optionalString(row.video_url) ?? optionalString(row.legacy_video_url),
  };
}
