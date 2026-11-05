export type CentralMediaPlaybackDescriptor = {
  lessonId: string;
  source: "legacy_contabo" | "private_r2";
  url: string;
  expiresAt: Date | null;
  mimeType: string | null;
  durationSeconds: number | null;
  supportsByteRanges: boolean;
  watermarkText: string | null;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseCentralMediaPlayback(value: unknown): CentralMediaPlaybackDescriptor {
  const initial = Array.isArray(value) && value.length === 1 ? value[0] : value;
  const candidate =
    initial && typeof initial === "object" && !Array.isArray(initial)
      ? ((initial as Record<string, unknown>).data ?? initial)
      : initial;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Invalid central-media playback response.");
  }
  const row = candidate as Record<string, unknown>;
  const lessonId = text(row.lesson_id);
  const source = text(row.source);
  const url = text(row.url);
  const expiresText = text(row.expires_at);
  const expiresAt = expiresText ? new Date(expiresText) : null;
  if (
    !lessonId ||
    (source !== "legacy_contabo" && source !== "private_r2") ||
    !url ||
    !URL.canParse(url) ||
    (source === "private_r2" && (!expiresAt || !Number.isFinite(expiresAt.getTime())))
  ) {
    throw new Error("Invalid central-media playback response.");
  }
  return {
    lessonId,
    source,
    url,
    expiresAt,
    mimeType: text(row.mime_type),
    durationSeconds:
      typeof row.duration_seconds === "number" && Number.isFinite(row.duration_seconds)
        ? Math.trunc(row.duration_seconds)
        : null,
    supportsByteRanges: row.supports_byte_ranges === true,
    watermarkText: text(row.watermark_text),
  };
}

export const CENTRAL_MEDIA_RENEWAL_MARGIN_MS = 30_000;

export function centralMediaRenewalDelay(
  descriptor: CentralMediaPlaybackDescriptor,
  now = Date.now(),
) {
  if (!descriptor.expiresAt) return null;
  return Math.max(0, descriptor.expiresAt.getTime() - now - CENTRAL_MEDIA_RENEWAL_MARGIN_MS);
}

export function privateR2TestEnabled(lessonId: string) {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_BLACKPIPS_PRIVATE_R2_TEST === "true" &&
    import.meta.env.VITE_BLACKPIPS_PRIVATE_R2_TEST_LESSON_ID === lessonId
  );
}
