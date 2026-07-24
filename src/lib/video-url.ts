const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function isVideoId(value: string | null) {
  return Boolean(value && /^[A-Za-z0-9_-]{6,}$/.test(value));
}

function getYouTubeVideoId(videoUrl: string | null | undefined): string | null {
  const originalUrl = videoUrl?.trim();
  if (!originalUrl) return null;
  try {
    const parsed = new URL(originalUrl);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname.toLowerCase() === "youtu.be") return parsed.pathname.split("/")[1] ?? null;
    if (!youtubeHosts.has(parsed.hostname.toLowerCase())) return null;
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

export function getVideoThumbnailUrl(videoUrl: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(videoUrl);
  return isVideoId(videoId) ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
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
