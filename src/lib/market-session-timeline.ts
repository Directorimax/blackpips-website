export const MINUTES_PER_DAY = 24 * 60;
export const TIMELINE_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const TIMELINE_BOUNDARIES = Array.from({ length: 24 }, (_, hour) => hour);

export function minutesToPosition(minutes: number) {
  return (minutes / MINUTES_PER_DAY) * 100;
}
