export const PREMIUM_UPLOAD_CONCURRENCY = 2;

export type PremiumUploadStatus = "queued" | "uploading" | "processing" | "completed" | "failed";

export type PremiumUploadQueueItem = {
  id: string;
  file: File;
  title: string;
  description: string;
  position: string;
  phaseNumber: number | null;
  status: PremiumUploadStatus;
  progress: number;
  error: string;
  lessonId: string | null;
};

export function titleFromVideoFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nextQueuedItems(
  items: readonly PremiumUploadQueueItem[],
  activeCount: number,
  concurrency = PREMIUM_UPLOAD_CONCURRENCY,
) {
  return items
    .filter((item) => item.status === "queued")
    .slice(0, Math.max(0, concurrency - activeCount));
}

export function canEditQueuedMetadata(status: PremiumUploadStatus) {
  return status === "queued" || status === "failed";
}
