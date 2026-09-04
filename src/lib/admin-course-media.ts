import { Upload } from "tus-js-client";

export const COURSE_MEDIA_BUCKET = "course-media";
export const COURSE_MEDIA_MAX_BYTES = 3 * 1024 * 1024 * 1024;
export const COURSE_MEDIA_CHUNK_BYTES = 6 * 1024 * 1024;

export type MediaSource = "none" | "youtube_legacy" | "self_hosted";
export type UploadProgress = { uploaded: number; total: number; percentage: number };

export function courseVideoPath(courseId: string, lessonId: string) {
  return `${courseId}/${lessonId}/video.mp4`;
}

export function coursePosterPath(courseId: string, lessonId: string) {
  return `${courseId}/${lessonId}/poster.webp`;
}

export function validateCourseVideo(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "mp4" || file.type !== "video/mp4") {
    return "Choose an MP4 file encoded with H.264 video and AAC audio. Convert MOV files before uploading.";
  }
  if (file.size <= 0) return "The selected video is empty.";
  if (file.size > COURSE_MEDIA_MAX_BYTES) return "The video exceeds the 3 GiB production limit.";
  return null;
}

export function validatePoster(file: File): string | null {
  if (!["image/webp", "image/jpeg"].includes(file.type)) {
    return "Choose a WebP or JPEG poster image.";
  }
  if (file.size <= 0) return "The selected poster is empty.";
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export async function readVideoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      const timeout = window.setTimeout(
        () => reject(new Error("Video metadata timed out.")),
        15_000,
      );
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        if (Number.isFinite(video.duration) && video.duration > 0) {
          resolve(video.duration);
        } else {
          reject(new Error("The video duration could not be read."));
        }
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("The browser could not read this MP4. Confirm H.264/AAC encoding."));
      };
      video.src = url;
    });
    return Math.round(duration);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function posterAsWebp(file: File): Promise<Blob> {
  if (file.type === "image/webp") return file;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Poster conversion is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob) throw new Error("The poster could not be converted to WebP.");
    return blob;
  } finally {
    bitmap.close();
  }
}

export type ResumableUploadOptions = {
  file: File;
  endpoint: string;
  accessToken: string;
  publishableKey: string;
  objectPath: string;
  bucketName?: string;
  contentType?: string;
  fingerprintNamespace?: string;
  upsert: boolean;
  onProgress: (progress: UploadProgress) => void;
};

export function startResumableMediaUpload(options: ResumableUploadOptions) {
  const bucketName = options.bucketName ?? COURSE_MEDIA_BUCKET;
  const upload = new Upload(options.file, {
    endpoint: options.endpoint,
    chunkSize: COURSE_MEDIA_CHUNK_BYTES,
    retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    fingerprint: () =>
      Promise.resolve(
        [
          options.fingerprintNamespace ?? `blackpips-${bucketName}`,
          options.objectPath,
          options.file.name,
          options.file.size,
          options.file.lastModified,
        ].join(":"),
      ),
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      apikey: options.publishableKey,
      "x-upsert": options.upsert ? "true" : "false",
    },
    metadata: {
      bucketName,
      objectName: options.objectPath,
      contentType: options.contentType ?? options.file.type ?? "application/octet-stream",
    },
    onProgress: (uploaded, total) =>
      options.onProgress({
        uploaded,
        total,
        percentage: total > 0 ? Math.round((uploaded / total) * 100) : 0,
      }),
  });

  const completion = new Promise<void>((resolve, reject) => {
    upload.options.onSuccess = () => resolve();
    upload.options.onError = (error) => reject(error);
    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch(reject);
  });

  return {
    completion,
    cancel: () => upload.abort(true),
  };
}

export function startResumableCourseVideoUpload(options: ResumableUploadOptions) {
  return startResumableMediaUpload({
    ...options,
    bucketName: COURSE_MEDIA_BUCKET,
    contentType: "video/mp4",
    fingerprintNamespace: "blackpips-course-media",
  });
}

export function resumableEndpoint(supabaseUrl: string) {
  return new URL("/storage/v1/upload/resumable", supabaseUrl).toString();
}
