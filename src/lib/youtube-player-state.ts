export type LessonPlaybackState = "playing" | "inactive" | null;

export function parseYouTubePlaybackState(value: unknown): LessonPlaybackState {
  let message: unknown = value;
  if (typeof value === "string") {
    try {
      message = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!message || typeof message !== "object") return null;
  const candidate = message as { event?: unknown; info?: unknown };
  if (candidate.event !== "onStateChange") return null;
  if (candidate.info === 1) return "playing";
  if (candidate.info === 0 || candidate.info === 2 || candidate.info === -1) return "inactive";
  return null;
}

export function isTrustedYouTubeOrigin(origin: string) {
  return origin === "https://www.youtube.com" || origin === "https://www.youtube-nocookie.com";
}
