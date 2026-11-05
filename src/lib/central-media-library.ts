export const R2_ACCOUNT_ID = "8993f3eb764015501b4a99a6ee3296e2";
export const R2_BUCKET_NAME = "blackpips-media";
export const MEDIA_UPLOAD_AUTH_TTL_SECONDS = 15 * 60;
export const MEDIA_PLAYBACK_AUTH_TTL_SECONDS = 5 * 60;
export const R2_MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;

export type MediaAssetStatus = "pending" | "available" | "unavailable" | "quarantined";

export type MediaAssetUsage = {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  is_published: boolean;
  lesson_position: number;
};

export type CentralMediaAsset = {
  id: string;
  title: string;
  storage_provider: "contabo" | "r2";
  object_key: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  checksum_sha256: string | null;
  status: MediaAssetStatus;
  usage_count: number;
  usage: MediaAssetUsage[];
};

export const CENTRAL_MEDIA_RPC = {
  list: "admin_list_media_assets_v2",
  lessons: "admin_list_media_lesson_candidates",
  attach: "admin_attach_media_asset",
  unlink: "admin_unlink_media_asset",
  delete: "admin_delete_media_asset",
  uploadAuthorization: "admin_create_media_upload_authorization",
} as const;

export function filterCentralMediaAssets(
  assets: CentralMediaAsset[],
  query: string,
  status: MediaAssetStatus | "all",
) {
  const needle = query.trim().toLowerCase();
  return assets.filter((asset) => {
    if (status !== "all" && asset.status !== status) return false;
    if (!needle) return true;
    return [
      asset.title,
      asset.storage_provider,
      asset.status,
      ...asset.usage.flatMap((usage) => [usage.course_title, usage.lesson_title]),
    ].some((value) => value.toLowerCase().includes(needle));
  });
}

export function describeDuration(seconds: number | null) {
  if (!seconds) return "Duration unavailable";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export type InventoryVideo = {
  sourceObjectPath: string;
  sourceLessonId: string | null;
  course: string | null;
  title: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  durationSeconds: number | null;
  checksumSha256: string | null;
};

export type MigrationManifestEntry = InventoryVideo & {
  destinationObjectKey: string | null;
  duplicateOfSourceObjectPath: string | null;
  status: "ready" | "identity-unverified" | "conflict";
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function normalizeSha256(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return SHA256_PATTERN.test(normalized) ? normalized : null;
}

export function r2ObjectKeyForChecksum(checksumSha256: string, mimeType: string | null) {
  const checksum = normalizeSha256(checksumSha256);
  if (!checksum) throw new Error("A valid SHA-256 checksum is required.");
  const extension =
    mimeType === "video/webm" ? "webm" : mimeType === "video/quicktime" ? "mov" : "mp4";
  return `videos/sha256/${checksum.slice(0, 2)}/${checksum}.${extension}`;
}

export function buildMigrationManifest(videos: InventoryVideo[]): MigrationManifestEntry[] {
  const firstSourceByChecksum = new Map<string, InventoryVideo>();
  const identityByChecksum = new Map<string, string>();

  return [...videos]
    .sort((left, right) => left.sourceObjectPath.localeCompare(right.sourceObjectPath))
    .map((video) => {
      const checksum = normalizeSha256(video.checksumSha256);
      if (!checksum) {
        return {
          ...video,
          destinationObjectKey: null,
          duplicateOfSourceObjectPath: null,
          status: "identity-unverified" as const,
        };
      }

      const identity = `${video.fileSizeBytes ?? "?"}:${video.mimeType ?? "?"}`;
      const previousIdentity = identityByChecksum.get(checksum);
      const first = firstSourceByChecksum.get(checksum);
      if (previousIdentity && previousIdentity !== identity) {
        return {
          ...video,
          destinationObjectKey: null,
          duplicateOfSourceObjectPath: first?.sourceObjectPath ?? null,
          status: "conflict" as const,
        };
      }

      if (!first) {
        firstSourceByChecksum.set(checksum, video);
        identityByChecksum.set(checksum, identity);
      }
      return {
        ...video,
        destinationObjectKey: r2ObjectKeyForChecksum(checksum, video.mimeType),
        duplicateOfSourceObjectPath: first?.sourceObjectPath ?? null,
        status: "ready" as const,
      };
    });
}

export function summarizeManifest(entries: MigrationManifestEntry[]) {
  const uniqueReady = entries.filter(
    (entry) => entry.status === "ready" && !entry.duplicateOfSourceObjectPath,
  );
  return {
    references: entries.length,
    uniqueVerifiedVideos: uniqueReady.length,
    verifiedDuplicates: entries.filter(
      (entry) => entry.status === "ready" && Boolean(entry.duplicateOfSourceObjectPath),
    ).length,
    identityUnverified: entries.filter((entry) => entry.status === "identity-unverified").length,
    conflicts: entries.filter((entry) => entry.status === "conflict").length,
    estimatedUniqueStorageBytes: uniqueReady.reduce(
      (total, entry) => total + (entry.fileSizeBytes ?? 0),
      0,
    ),
  };
}

export function shouldUseMultipartUpload(fileSizeBytes: number) {
  return fileSizeBytes >= R2_MULTIPART_THRESHOLD_BYTES;
}

export function assertSafeR2ObjectKey(objectKey: string) {
  if (!/^videos\/sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.(mp4|mov|webm)$/.test(objectKey)) {
    throw new Error("Object key is outside the managed video namespace.");
  }
  return objectKey;
}
