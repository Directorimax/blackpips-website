import { describe, expect, it } from "vitest";
import {
  exactTipMediaPaths,
  expiryAt,
  IMAGE_MAX_BYTES,
  MAX_TIP_MEDIA,
  mediaTypeFor,
  remainingTipTime,
  TIP_MEDIA_ACCEPT,
  TIP_REACTIONS,
  tipFileExtension,
  validateTipFile,
  VIDEO_MAX_BYTES,
} from "./trading-tips";

const file = (name: string, type: string, size = 1) => {
  const candidate = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(candidate, "size", { value: size });
  return candidate;
};

describe("remainingTipTime", () => {
  it("formats day, hour, and minute expiry windows", () => {
    const now = Date.now();
    expect(remainingTipTime(new Date(now + (2 * 24 + 8) * 60 * 60 * 1000).toISOString())).toBe(
      "Expires in 2d 8h",
    );
    expect(remainingTipTime(new Date(now + 14 * 60 * 60 * 1000).toISOString())).toBe(
      "Expires in 14h",
    );
    expect(remainingTipTime(new Date(now + 42 * 60 * 1000).toISOString())).toBe("Expires in 42m");
  });
});

describe("Trading Tips media validation", () => {
  it.each([
    ["chart.jpg", "image/jpeg", "jpg", "image"],
    ["chart.jpeg", "image/jpeg", "jpeg", "image"],
    ["chart.png", "image/png", "png", "image"],
    ["chart.webp", "image/webp", "webp", "image"],
    ["lesson.mp4", "video/mp4", "mp4", "video"],
    ["lesson.webm", "video/webm", "webm", "video"],
    ["iphone.mov", "video/quicktime", "mov", "video"],
  ])("accepts %s using MIME and extension", (name, type, extension, mediaType) => {
    const candidate = file(name, type);
    expect(validateTipFile(candidate)).toBeNull();
    expect(tipFileExtension(candidate)).toBe(extension);
    expect(mediaTypeFor(type)).toBe(mediaType);
  });

  it("supports mixed image/video selections up to ten items", () => {
    const mixed = [
      file("one.jpg", "image/jpeg"),
      file("two.webp", "image/webp"),
      file("three.mp4", "video/mp4"),
    ];
    expect(mixed.map(validateTipFile)).toEqual([null, null, null]);
    expect(mixed.length).toBeLessThanOrEqual(MAX_TIP_MEDIA);
    expect(TIP_MEDIA_ACCEPT).toContain("video/quicktime");
  });

  it("enforces image and video limits", () => {
    expect(validateTipFile(file("large.png", "image/png", IMAGE_MAX_BYTES + 1))).toContain("10 MB");
    expect(validateTipFile(file("large.mp4", "video/mp4", VIDEO_MAX_BYTES + 1))).toContain("50 MB");
  });

  it.each([
    ["document.pdf", "application/pdf"],
    ["archive.zip", "application/zip"],
    ["renamed.mp4", "video/quicktime"],
    ["renamed.mov", "video/mp4"],
  ])("rejects unsupported or mismatched media %s", (name, type) => {
    expect(validateTipFile(file(name, type))).not.toBeNull();
  });

  it("defines an exact ten-item maximum", () => {
    expect(Array.from({ length: 11 })).toHaveLength(MAX_TIP_MEDIA + 1);
  });
});

describe("Trading Tips exact cleanup paths", () => {
  const tipId = "11111111-1111-4111-8111-111111111111";
  const mediaId = "22222222-2222-4222-8222-222222222222";
  const valid = `tips/${tipId}/${mediaId}.mov`;

  it("keeps exact persisted paths, de-duplicates retries, and excludes unrelated objects", () => {
    expect(
      exactTipMediaPaths(tipId, [
        valid,
        valid,
        `tips/33333333-3333-4333-8333-333333333333/${mediaId}.mov`,
        `tips/${tipId}/not-a-uuid.mov`,
      ]),
    ).toEqual([valid]);
  });

  it("is idempotent for an already-empty cleanup batch", () => {
    expect(exactTipMediaPaths(tipId, [])).toEqual([]);
    expect(exactTipMediaPaths(tipId, [])).toEqual([]);
  });
});

describe("flexible tip expiry", () => {
  it("keeps permanent tips out of countdowns", () => {
    expect(remainingTipTime(null)).toBe("Permanent");
    expect(expiryAt("forever")).toBeNull();
  });
  it("supports supported lifetime presets", () => {
    expect(new Date(expiryAt("24h")!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(expiryAt("72h")!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(expiryAt("7d")!).getTime()).toBeGreaterThan(Date.now());
  });
  it("defines the bounded media and curated reaction set", () => {
    expect(MAX_TIP_MEDIA).toBe(10);
    expect(TIP_REACTIONS).toEqual(["👍", "❤️", "🔥", "👏", "💯", "🤯"]);
  });
});
