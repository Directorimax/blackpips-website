import { describe, expect, it } from "vitest";
import { formatContactCountdown, getContactAvailability } from "./contact-availability";

describe("getContactAvailability", () => {
  it("is closed immediately before Monday opening", () => {
    const availability = getContactAvailability(new Date("2026-08-03T03:59:59Z"));
    expect(availability.isOpen).toBe(false);
    expect(availability.nextTransition.toISOString()).toBe("2026-08-03T04:00:00.000Z");
    expect(availability.countdownMilliseconds).toBe(1000);
  });

  it("opens exactly at Monday 07:00 EAT", () => {
    const availability = getContactAvailability(new Date("2026-08-03T04:00:00Z"));
    expect(availability.isOpen).toBe(true);
    expect(availability.nextTransition.toISOString()).toBe("2026-08-03T17:00:00.000Z");
  });

  it("remains open immediately before Saturday closing", () => {
    const availability = getContactAvailability(new Date("2026-08-08T16:59:59Z"));
    expect(availability.isOpen).toBe(true);
    expect(availability.countdownMilliseconds).toBe(1000);
  });

  it("closes exactly at Saturday 20:00 EAT", () => {
    const availability = getContactAvailability(new Date("2026-08-08T17:00:00Z"));
    expect(availability.isOpen).toBe(false);
    expect(availability.nextTransition.toISOString()).toBe("2026-08-10T04:00:00.000Z");
    expect(availability.transitionLabel).toBe("Next available Monday at 07:00 EAT");
  });

  it("stays closed throughout Sunday and points to Monday", () => {
    const availability = getContactAvailability(new Date("2026-08-09T09:00:00Z"));
    expect(availability.isOpen).toBe(false);
    expect(availability.nextTransition.toISOString()).toBe("2026-08-10T04:00:00.000Z");
  });

  it("uses the Tanzania instant rather than the visitor timezone", () => {
    const instant = new Date("2026-08-03T04:00:00-00:00");
    expect(getContactAvailability(instant).isOpen).toBe(true);
  });
});

describe("formatContactCountdown", () => {
  it("formats multi-day countdowns without rolling hours back to zero", () => {
    expect(formatContactCountdown((35 * 60 * 60 + 5 * 60 + 9) * 1000)).toBe("35h 05m 09s");
  });
});
