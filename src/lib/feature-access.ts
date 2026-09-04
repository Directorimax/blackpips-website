export const FEATURE_ACCESS = {
  freeLessonsEnabled: false,
  premiumLessonsEnabled: false,
  alcAccessEnabled: false,
  mentorshipEnabled: true,
} as const;

export function isFreeLessonsAvailable() {
  return FEATURE_ACCESS.freeLessonsEnabled;
}

export function isPremiumCatalogAvailable() {
  return FEATURE_ACCESS.premiumLessonsEnabled;
}

export function isPremiumCourseAvailable(_slug: string) {
  return FEATURE_ACCESS.premiumLessonsEnabled;
}

export function isAlcAccessAvailable() {
  return FEATURE_ACCESS.alcAccessEnabled;
}
