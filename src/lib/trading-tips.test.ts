import { describe, expect, it } from "vitest";
import { expiryAt, MAX_TIP_MEDIA, remainingTipTime, TIP_REACTIONS } from "./trading-tips";

describe("remainingTipTime", () => {
  it("formats day, hour, and minute expiry windows", () => {
    const now = Date.now();
    expect(remainingTipTime(new Date(now + (2 * 24 + 8) * 60 * 60 * 1000).toISOString())).toBe(
      "Expires in 2d 8h",
    );
    expect(remainingTipTime(new Date(now + 14 * 60 * 60 * 1000).toISOString())).toBe(
      "Expires in 14h",
    );
    expect(remainingTipTime(new Date(now + 42 * 60 * 1000).toISOString())).toBe("Expires in 42m");
  });
});

describe("flexible tip expiry", () => {
  it("keeps permanent tips out of countdowns", () => {
    expect(remainingTipTime(null)).toBe("Permanent");
    expect(expiryAt("forever")).toBeNull();
  });
  it("supports supported lifetime presets", () => {
    expect(new Date(expiryAt("24h")!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(expiryAt("72h")!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(expiryAt("7d")!).getTime()).toBeGreaterThan(Date.now());
  });
  it("defines the bounded media and curated reaction set", () => {
    expect(MAX_TIP_MEDIA).toBe(10);
    expect(TIP_REACTIONS).toEqual(["👍", "❤️", "🔥", "👏", "💯", "🤯"]);
  });
});
