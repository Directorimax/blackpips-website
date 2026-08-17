import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("homepage auth entry routing", () => {
  const homepage = read("../routes/index.tsx");
  const ticker = read("../components/TradingViewTickerTape.tsx");
  const root = read("../routes/__root.tsx");
  const nav = read("../components/Nav.tsx");
  const auth = read("../routes/auth.index.tsx");

  it("routes account creation and sign-in CTAs to deterministic modes", () => {
    expect(homepage).toContain('search={{ mode: "signup" }}');
    expect(homepage).toContain('search={{ mode: "signin" }}');
    expect(nav.match(/search=\{\{ mode: "signup" \}\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(nav.match(/search=\{\{ mode: "signin" \}\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("derives mode from the URL so direct loads, refresh, and history navigation agree", () => {
    expect(auth).toContain('mode: z.enum(["signin", "signup", "forgot"]).optional()');
    expect(auth).toContain('mode: requestedMode = "signin"');
    expect(auth).toContain("setMode(requestedMode)");
    expect(auth).toContain("search: { redirect, mode: nextMode }");
  });

  it("uses the official TradingView tape without hardcoded quotes or API secrets", () => {
    expect(homepage).not.toContain("2,384.10");
    expect(homepage).not.toContain("68,214");
    expect(homepage).toContain("TradingViewTickerTape");
    expect(root).not.toContain("tv-ticker-tape.js");
    expect(ticker).toContain("embed-widget-ticker-tape.js");
    expect(ticker).not.toContain("TWELVE_DATA_API_KEY");
  });

  it("uses verified symbols and reinitializes against the existing theme state", () => {
    for (const symbol of [
      "OANDA:XAUUSD",
      "OANDA:EURUSD",
      "OANDA:GBPUSD",
      "OANDA:USDJPY",
      "OANDA:USDCAD",
      "OANDA:AUDUSD",
      "BITSTAMP:BTCUSD",
    ]) {
      expect(ticker).toContain(symbol);
    }
    expect(ticker).toContain("const { theme } = useTheme()");
    expect(ticker).toContain("colorTheme: theme");
    expect(ticker).toContain("isTransparent: true");
    expect(ticker).toContain("widgetHost.replaceChildren(widgetTarget, script)");
    expect(ticker).toContain("}, [theme])");
  });

  it("keeps the official widget attribution singular and the loader stable", () => {
    expect(root).not.toContain("tv-ticker-tape.js");
    expect(ticker).toContain('document.createElement("script")');
    expect(ticker).toContain("embed-widget-ticker-tape.js");
    expect(ticker.match(/Market data by TradingView/g)).toHaveLength(1);
    expect(ticker).toContain("[contain:inline-size]");
    expect(ticker).toContain("[&>iframe]:!max-w-full");
  });

  it("uses paired responsive spacing without viewport-height blank bands", () => {
    expect(homepage).not.toContain("min-h-[92svh]");
    expect(homepage).toContain("pb-12 pt-28");
    expect(homepage).toContain("pb-7 pt-12 sm:pb-8 sm:pt-16 lg:pb-10 lg:pt-20");
    expect(homepage).toContain("px-4 py-7 sm:py-8 lg:py-10");
    expect(homepage).toContain("pb-14 pt-7 sm:pb-16 sm:pt-8 lg:pb-20 lg:pt-10");
  });
});
