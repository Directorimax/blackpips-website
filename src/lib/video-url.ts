const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function isVideoId(value: string | null) {
  return Boolean(value && /^[A-Za-z0-9_-]{6,}$/.test(value));
}

/**
 * Returns a safe URL for iframe playback, or null when the provider URL is not
 * one that this application can embed. The original submitted URL is never
 * changed for storage.
 */
export function getEmbeddableVideoUrl(videoUrl: string | null | undefined): string | null {
  const originalUrl = videoUrl?.trim();
  if (!originalUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  if (host === "youtu.be") {
    const videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    return isVideoId(videoId) ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (!youtubeHosts.has(host)) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (parsed.pathname === "/watch") {
    const videoId = parsed.searchParams.get("v");
    return isVideoId(videoId) ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (segments[0] === "shorts") {
    const videoId = segments[1] ?? null;
    return isVideoId(videoId) ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (segments[0] === "embed" && isVideoId(segments[1] ?? null)) {
    return originalUrl;
  }

  return null;
}
