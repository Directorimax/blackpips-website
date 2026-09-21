export const FX_REFERENCE_CACHE_MS = 6 * 60 * 60 * 1000;
export const FRANKFURTER_ECB_ENDPOINT =
  "https://api.frankfurter.dev/v2/providers/ecb/rates?base=EUR&quotes=USD,GBP,JPY,CHF,CAD,AUD,NZD";

const CACHE_KEY = "blackpips.pip_calculator.ecb_rates.v1";
const SUPPORTED_QUOTES = ["USD", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"] as const;

export type FxReferenceRates = {
  unitsPerEur: Record<string, number>;
  provider: string;
  referenceDate: string;
  fetchedAt: string;
};

type RateRow = { base?: unknown; quote?: unknown; rate?: unknown; date?: unknown };

let memoryCache: FxReferenceRates | null = null;
let inFlight: Promise<FxReferenceRates | null> | null = null;

export function parseFrankfurterEcbRates(raw: unknown, fetchedAt = new Date()): FxReferenceRates {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 64) {
    throw new Error("Invalid ECB rate response.");
  }
  const unitsPerEur: Record<string, number> = {};
  let referenceDate = "";
  for (const value of raw) {
    const row = value as RateRow;
    const base = String(row.base ?? "").toUpperCase();
    const quote = String(row.quote ?? "").toUpperCase();
    const rate = typeof row.rate === "number" ? row.rate : Number(row.rate);
    const date = String(row.date ?? "");
    if (
      base !== "EUR" ||
      !SUPPORTED_QUOTES.includes(quote as (typeof SUPPORTED_QUOTES)[number]) ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      (referenceDate && referenceDate !== date)
    ) {
      throw new Error("Invalid ECB rate row.");
    }
    referenceDate = date;
    unitsPerEur[quote] = rate;
  }
  if (!referenceDate || !SUPPORTED_QUOTES.every((quote) => unitsPerEur[quote])) {
    throw new Error("Incomplete ECB rate response.");
  }
  return {
    unitsPerEur,
    provider: "ECB/Frankfurter",
    referenceDate,
    fetchedAt: fetchedAt.toISOString(),
  };
}

export function parseCachedFxRates(value: string | null): FxReferenceRates | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as FxReferenceRates;
    const fetchedAt = Date.parse(parsed.fetchedAt);
    if (
      !Number.isFinite(fetchedAt) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.referenceDate) ||
      !SUPPORTED_QUOTES.every((quote) => {
        const rate = parsed.unitsPerEur?.[quote];
        return Number.isFinite(rate) && rate > 0;
      })
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadFxReferenceRates(options?: {
  fetcher?: typeof fetch;
  storage?: Pick<Storage, "getItem" | "setItem">;
  now?: Date;
}): Promise<FxReferenceRates | null> {
  if (inFlight) return inFlight;
  const request = (async () => {
    const now = options?.now ?? new Date();
    const storage =
      options?.storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
    const cached = memoryCache ?? parseCachedFxRates(storage?.getItem(CACHE_KEY) ?? null);
    if (cached && now.getTime() - Date.parse(cached.fetchedAt) < FX_REFERENCE_CACHE_MS) {
      memoryCache = cached;
      return cached;
    }
    try {
      let raw: unknown;
      if (options?.fetcher) {
        const response = await options.fetcher(FRANKFURTER_ECB_ENDPOINT, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) throw new Error("Reference-rate request failed.");
        const text = await response.text();
        if (text.length > 65_536) throw new Error("Reference-rate response is too large.");
        raw = JSON.parse(text);
      } else {
        const { getFrankfurterEcbRates } =
          await import("@/services/fx-reference-rates/fx-reference-rates.functions");
        raw = await getFrankfurterEcbRates();
      }
      const fresh = parseFrankfurterEcbRates(raw, now);
      memoryCache = fresh;
      storage?.setItem(CACHE_KEY, JSON.stringify(fresh));
      return fresh;
    } catch {
      // A stale cache is last-known-good authoritative data. Without one, conversion is unavailable.
      memoryCache = cached;
      return cached;
    }
  })();
  inFlight = request;
  try {
    return await request;
  } finally {
    if (inFlight === request) inFlight = null;
  }
}

export function resetFxReferenceRateMemoryCacheForTests() {
  memoryCache = null;
  inFlight = null;
}
