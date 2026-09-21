import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FX_REFERENCE_CACHE_MS,
  loadFxReferenceRates,
  parseFrankfurterEcbRates,
  resetFxReferenceRateMemoryCacheForTests,
} from "./fx-reference-rates";

const rows = ["USD", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"].map((quote, index) => ({
  base: "EUR",
  quote,
  rate: index + 1,
  date: "2026-09-16",
}));

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

describe("ECB/Frankfurter reference rates", () => {
  beforeEach(resetFxReferenceRateMemoryCacheForTests);

  it("validates the complete, internally consistent rate set", () => {
    expect(parseFrankfurterEcbRates(rows, new Date("2026-09-17T00:00:00Z"))).toMatchObject({
      provider: "ECB/Frankfurter",
      referenceDate: "2026-09-16",
      unitsPerEur: { USD: 1, GBP: 2, JPY: 3 },
    });
    expect(() => parseFrankfurterEcbRates(rows.slice(1))).toThrow("Incomplete");
  });

  it("uses the six-hour cache without another request", async () => {
    const cache = storage();
    const fetcher = vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 }));
    await loadFxReferenceRates({ fetcher, storage: cache, now: new Date("2026-09-17T00:00:00Z") });
    resetFxReferenceRateMemoryCacheForTests();
    await loadFxReferenceRates({
      fetcher,
      storage: cache,
      now: new Date(+new Date("2026-09-17T00:00:00Z") + FX_REFERENCE_CACHE_MS - 1),
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired cache and falls back to stale last-known-good data on failure", async () => {
    const cache = storage();
    await loadFxReferenceRates({
      fetcher: async () => new Response(JSON.stringify(rows), { status: 200 }),
      storage: cache,
      now: new Date("2026-09-17T00:00:00Z"),
    });
    resetFxReferenceRateMemoryCacheForTests();
    const stale = await loadFxReferenceRates({
      fetcher: async () => {
        throw new Error("offline");
      },
      storage: cache,
      now: new Date("2026-09-17T07:00:00Z"),
    });
    expect(stale?.referenceDate).toBe("2026-09-16");
  });

  it("returns null instead of fabricating rates when network and cache are unavailable", async () => {
    await expect(
      loadFxReferenceRates({
        fetcher: async () => {
          throw new Error("offline");
        },
        storage: storage(),
      }),
    ).resolves.toBeNull();
  });
});
