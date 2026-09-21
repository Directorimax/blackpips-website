import { createServerFn } from "@tanstack/react-start";

const endpoint =
  "https://api.frankfurter.dev/v2/providers/ecb/rates?base=EUR&quotes=USD,GBP,JPY,CHF,CAD,AUD,NZD";

type FrankfurterRateRow = { date: string; base: string; quote: string; rate: number };

export const getFrankfurterEcbRates = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Reference-rate request failed.");
  const text = await response.text();
  if (text.length > 65_536) throw new Error("Reference-rate response is too large.");
  return JSON.parse(text) as FrankfurterRateRow[];
});
