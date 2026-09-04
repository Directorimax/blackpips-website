export function canAccessLearningFeature(featureEnabled: boolean, isAdmin: boolean) {
  return featureEnabled || isAdmin;
}

export function formatLessonDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "Duration unavailable";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}
