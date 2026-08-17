import { useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

export const TRADINGVIEW_TICKER_SYMBOLS = [
  { proName: "OANDA:XAUUSD", description: "XAUUSD" },
  { proName: "OANDA:EURUSD", description: "EURUSD" },
  { proName: "OANDA:GBPUSD", description: "GBPUSD" },
  { proName: "OANDA:USDJPY", description: "USDJPY" },
  { proName: "OANDA:USDCAD", description: "USDCAD" },
  { proName: "OANDA:AUDUSD", description: "AUDUSD" },
  { proName: "BITSTAMP:BTCUSD", description: "BTCUSD" },
] as const;

const WIDGET_SCRIPT_URL =
  "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";

export function TradingViewTickerTape() {
  const { theme } = useTheme();
  const widgetHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const widgetHost = widgetHostRef.current;
    if (!widgetHost) return;

    const widgetTarget = document.createElement("div");
    widgetTarget.className = "tradingview-widget-container__widget h-[46px] w-full";
    widgetTarget.setAttribute("aria-label", "TradingView market ticker");

    const placeholder = document.createElement("div");
    placeholder.className =
      "flex h-[46px] items-center justify-center bg-transparent text-xs text-muted-foreground";
    placeholder.textContent = "Loading market data…";
    widgetTarget.appendChild(placeholder);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: TRADINGVIEW_TICKER_SYMBOLS,
      showSymbolLogo: true,
      colorTheme: theme,
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en",
    });

    widgetHost.replaceChildren(widgetTarget, script);
    return () => widgetHost.replaceChildren();
  }, [theme]);

  return (
    <section
      className="w-full min-w-0 max-w-full overflow-x-clip border-y border-border/60 bg-card/40"
      aria-label="Market prices"
    >
      <div
        ref={widgetHostRef}
        className="tradingview-widget-container min-h-[46px] w-full min-w-0 max-w-full overflow-hidden bg-transparent [contain:inline-size] [&>iframe]:!m-0 [&>iframe]:!block [&>iframe]:!w-full [&>iframe]:!min-w-0 [&>iframe]:!max-w-full"
        data-theme={theme}
      >
        <div className="flex h-[46px] items-center justify-center text-xs text-muted-foreground">
          Loading market data…
        </div>
      </div>
      <div className="h-5 text-center text-[10px] leading-5 text-muted-foreground/80">
        <a
          href="https://www.tradingview.com/markets/?utm_source=www.blackpips.com&utm_medium=widget&utm_campaign=ticker-tape"
          target="_blank"
          rel="noopener nofollow"
          className="transition-colors hover:text-foreground"
        >
          Market data by TradingView
        </a>
      </div>
    </section>
  );
}
