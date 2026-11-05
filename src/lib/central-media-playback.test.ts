import { describe, expect, it } from "vitest";
import { centralMediaRenewalDelay, parseCentralMediaPlayback } from "./central-media-playback";

describe("central-media playback contract", () => {
  it("parses an authorized private R2 descriptor without persisting its URL", () => {
    const descriptor = parseCentralMediaPlayback({
      lesson_id: "lesson-one",
      source: "private_r2",
      url: "https://media.example/video.mp4?signature=temporary",
      expires_at: "2026-10-16T10:05:00.000Z",
      mime_type: "video/mp4",
      duration_seconds: 600,
      supports_byte_ranges: true,
      watermark_text: "owner@example.com",
    });
    expect(descriptor.source).toBe("private_r2");
    expect(descriptor.supportsByteRanges).toBe(true);
    expect(centralMediaRenewalDelay(descriptor, Date.parse("2026-10-16T10:00:00.000Z"))).toBe(
      270_000,
    );
  });

  it("rejects private R2 responses without a valid expiry", () => {
    expect(() =>
      parseCentralMediaPlayback({
        lesson_id: "lesson-one",
        source: "private_r2",
        url: "https://media.example/video.mp4",
      }),
    ).toThrow(/Invalid/);
  });

  it("accepts the deployed ok/data response envelope", () => {
    expect(
      parseCentralMediaPlayback({
        ok: true,
        data: {
          lesson_id: "lesson-one",
          source: "private_r2",
          url: "https://media.example/video.mp4?signature=temporary",
          expires_at: "2026-10-16T10:05:00.000Z",
          supports_byte_ranges: true,
        },
      }).source,
    ).toBe("private_r2");
  });
});
