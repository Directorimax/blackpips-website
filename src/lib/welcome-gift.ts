export const WELCOME_GIFT_BUCKET = "welcome-gifts";

export const WELCOME_GIFT = {
  id: "blackpips-welcome-2026-v1",
  title: "Welcome to BLACKPIPS",
  description: "We've prepared a starter gift for you.",
  pdf: {
    title: "BLACKPIPS Starter Guide",
    fileName: "BLACKPIPS-Starter-Guide.pdf",
    storagePath: "blackpips-welcome-2026-v1/blackpips-starter-guide.pdf",
  },
} as const;

export type WelcomeGift = typeof WELCOME_GIFT;
