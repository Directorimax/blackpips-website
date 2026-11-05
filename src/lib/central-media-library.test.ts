import { describe, expect, it } from "vitest";
import {
  assertSafeR2ObjectKey,
  buildMigrationManifest,
  r2ObjectKeyForChecksum,
  shouldUseMultipartUpload,
  summarizeManifest,
  filterCentralMediaAssets,
  describeDuration,
  type CentralMediaAsset,
  type InventoryVideo,
} from "./central-media-library";

const checksumA = "a".repeat(64);

function video(overrides: Partial<InventoryVideo> = {}): InventoryVideo {
  return {
    sourceObjectPath: "masterclass/one.mp4",
    sourceLessonId: "lesson-one",
    course: "ALC Masterclass",
    title: "Lesson one",
    fileSizeBytes: 100,
    mimeType: "video/mp4",
    durationSeconds: 60,
    checksumSha256: checksumA,
    ...overrides,
  };
}

describe("central media migration manifest", () => {
  it("deduplicates only by verified SHA-256 and counts storage once", () => {
    const manifest = buildMigrationManifest([
      video(),
      video({ sourceObjectPath: "regular/same-title.mp4", sourceLessonId: "lesson-two" }),
    ]);
    expect(manifest[1].duplicateOfSourceObjectPath).toBe("masterclass/one.mp4");
    expect(summarizeManifest(manifest)).toEqual({
      references: 2,
      uniqueVerifiedVideos: 1,
      verifiedDuplicates: 1,
      identityUnverified: 0,
      conflicts: 0,
      estimatedUniqueStorageBytes: 100,
    });
  });

  it("does not deduplicate matching titles without checksums", () => {
    const manifest = buildMigrationManifest([
      video({ checksumSha256: null }),
      video({ sourceObjectPath: "other/one.mp4", checksumSha256: null }),
    ]);
    expect(manifest.every((entry) => entry.status === "identity-unverified")).toBe(true);
    expect(summarizeManifest(manifest).uniqueVerifiedVideos).toBe(0);
  });

  it("flags impossible checksum metadata conflicts", () => {
    const manifest = buildMigrationManifest([
      video(),
      video({ sourceObjectPath: "other/one.mp4", fileSizeBytes: 101 }),
    ]);
    expect(manifest[1].status).toBe("conflict");
  });

  it("uses content-addressed keys and constrains upload scope", () => {
    const key = r2ObjectKeyForChecksum(checksumA, "video/mp4");
    expect(key).toBe(`videos/sha256/aa/${checksumA}.mp4`);
    expect(assertSafeR2ObjectKey(key)).toBe(key);
    expect(() => assertSafeR2ObjectKey("../private/key")).toThrow(/namespace/);
    expect(shouldUseMultipartUpload(100 * 1024 * 1024)).toBe(true);
  });
});

describe("central media shared client contract", () => {
  const asset: CentralMediaAsset = {
    id: "asset-one",
    title: "Entry type one",
    storage_provider: "r2",
    object_key: `videos/sha256/aa/${checksumA}.mp4`,
    mime_type: "video/mp4",
    file_size_bytes: 100,
    duration_seconds: 3661,
    checksum_sha256: checksumA,
    status: "available",
    usage_count: 2,
    usage: [
      {
        lesson_id: "lesson-one",
        lesson_title: "Entry",
        course_id: "course-one",
        course_title: "Course A",
        is_published: true,
        lesson_position: 1,
      },
      {
        lesson_id: "lesson-two",
        lesson_title: "Entry",
        course_id: "course-two",
        course_title: "Course B",
        is_published: false,
        lesson_position: 3,
      },
    ],
  };

  it("finds one shared asset through every independent lesson usage", () => {
    expect(filterCentralMediaAssets([asset], "course b", "all")).toEqual([asset]);
    expect(asset.usage.map((usage) => usage.lesson_id)).toEqual(["lesson-one", "lesson-two"]);
  });

  it("filters storage state and formats duration", () => {
    expect(filterCentralMediaAssets([asset], "", "pending")).toEqual([]);
    expect(describeDuration(asset.duration_seconds)).toBe("1:01:01");
  });
});
