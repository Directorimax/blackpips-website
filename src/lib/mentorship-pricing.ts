export const MASTERCLASS_PACKAGE_SLUG = "master-class";

export type MentorshipPriceConfig = {
  slug: string;
  normal_price: number;
  promotion_price: number | null;
  promotion_ends_at: string | null;
};

export type OfferCountdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function isMentorshipPromotionActive(
  packageOption: MentorshipPriceConfig,
  nowMilliseconds: number,
) {
  if (
    packageOption.slug !== MASTERCLASS_PACKAGE_SLUG ||
    packageOption.promotion_price === null ||
    packageOption.promotion_ends_at === null
  ) {
    return false;
  }
  const end = Date.parse(packageOption.promotion_ends_at);
  return Number.isFinite(end) && nowMilliseconds < end;
}

export function mentorshipPayablePrice(
  packageOption: MentorshipPriceConfig,
  nowMilliseconds: number,
) {
  return isMentorshipPromotionActive(packageOption, nowMilliseconds)
    ? packageOption.promotion_price!
    : packageOption.normal_price;
}

export function mentorshipOfferCountdown(endsAt: string, nowMilliseconds: number): OfferCountdown {
  const remainingSeconds = Math.max(0, Math.floor((Date.parse(endsAt) - nowMilliseconds) / 1000));
  return {
    days: Math.floor(remainingSeconds / 86_400),
    hours: Math.floor((remainingSeconds % 86_400) / 3_600),
    minutes: Math.floor((remainingSeconds % 3_600) / 60),
    seconds: remainingSeconds % 60,
  };
}
