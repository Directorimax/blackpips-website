import { describe, expect, it } from "vitest";
import {
  isMentorshipPromotionActive,
  mentorshipOfferCountdown,
  mentorshipPayablePrice,
} from "./mentorship-pricing";

const masterclass = {
  slug: "master-class",
  normal_price: 750_000,
  promotion_price: 250_000,
  promotion_ends_at: "2026-09-06T20:59:59Z",
};

describe("Masterclass mentorship promotion", () => {
  it("uses the promotional price before the Tanzania deadline", () => {
    const now = Date.parse("2026-09-06T20:59:58Z");
    expect(isMentorshipPromotionActive(masterclass, now)).toBe(true);
    expect(mentorshipPayablePrice(masterclass, now)).toBe(250_000);
  });

  it("returns to the normal price exactly at the deadline", () => {
    const deadline = Date.parse("2026-09-06T20:59:59Z");
    expect(isMentorshipPromotionActive(masterclass, deadline)).toBe(false);
    expect(mentorshipPayablePrice(masterclass, deadline)).toBe(750_000);
  });

  it("does not discount another mentorship package", () => {
    expect(
      mentorshipPayablePrice(
        { ...masterclass, slug: "advanced-class" },
        Date.parse("2026-09-02T00:00:00Z"),
      ),
    ).toBe(750_000);
  });

  it("calculates a stable days/hours/minutes/seconds countdown", () => {
    expect(
      mentorshipOfferCountdown(masterclass.promotion_ends_at, Date.parse("2026-09-05T19:58:58Z")),
    ).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
  });

  it("uses the exact Sunday Tanzania deadline", () => {
    const deadline = new Date(masterclass.promotion_ends_at);
    expect(deadline.getUTCDay()).toBe(0);
    expect(deadline.toISOString()).toBe("2026-09-06T20:59:59.000Z");
  });
});
