import {
  type UploadProgress,
  resumableEndpoint,
  startResumableMediaUpload,
} from "@/lib/admin-course-media";

export const ALC_MEDIA_BUCKET = "alc-media";
export const ALC_MEDIA_MAX_BYTES = 3 * 1024 * 1024 * 1024;

export type AlcMediaSource = "none" | "external" | "self_hosted";

export function alcVideoPath(moduleId: string, videoId: string) {
  return `${moduleId}/${videoId}/video.mp4`;
}

export function alcPosterPath(moduleId: string, videoId: string) {
  return `${moduleId}/${videoId}/poster.webp`;
}

export function validateAlcVideo(file: File): string | null {
  const accepted = ["video/mp4", "video/webm", "video/quicktime"];
  if (!accepted.includes(file.type)) return "Choose an MP4, WebM, or QuickTime video.";
  if (file.size <= 0) return "The selected video is empty.";
  if (file.size > ALC_MEDIA_MAX_BYTES) return "The video exceeds the 3 GiB production limit.";
  return null;
}

export function startResumableAlcVideoUpload(options: {
  file: File;
  supabaseUrl: string;
  accessToken: string;
  publishableKey: string;
  moduleId: string;
  videoId: string;
  upsert: boolean;
  onProgress: (progress: UploadProgress) => void;
}) {
  return startResumableMediaUpload({
    file: options.file,
    endpoint: resumableEndpoint(options.supabaseUrl),
    accessToken: options.accessToken,
    publishableKey: options.publishableKey,
    objectPath: alcVideoPath(options.moduleId, options.videoId),
    bucketName: ALC_MEDIA_BUCKET,
    contentType: options.file.type,
    fingerprintNamespace: "blackpips-alc-media",
    upsert: options.upsert,
    onProgress: options.onProgress,
  });
}
