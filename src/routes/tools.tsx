import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Clock, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Forex Tools — Pip Calculator & Sessions — BlackPips" },
      { name: "description", content: "Free forex tools: pip value calculator, live session clock and live market prices for XAUUSD, majors and crypto." },
      { property: "og:title", content: "Forex Tools — BlackPips" },
      { property: "og:description", content: "Pip calculator, session clock and live prices." },
    ],
  }),
  component: Tools,
});

function Tools() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Trader Tools</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Fast tools for real decisions</h1>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <PipCalculator />
        <Sessions />
      </div>

      <div className="mt-6">
        <LivePrices />
      </div>
    </div>
  );
}

function PipCalculator() {
  const [pair, setPair] = useState("EURUSD");
  const [lots, setLots] = useState(1);
  const [pips, setPips] = useState(20);

  const pipValue = useMemo(() => {
    // Simple approximation: EURUSD-like majors 1 lot 1 pip = $10; JPY pairs = $6.4 approx.
    const perLot = pair.endsWith("JPY") ? 6.4 : pair === "XAUUSD" ? 10 : 10;
    return (perLot * lots * pips).toFixed(2);
  }, [pair, lots, pips]);

  return (
    <div className="glass rounded-3xl p-8">
      <div className="flex items-center gap-2 text-gold">
        <Calculator className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Pip Value Calculator</span>
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold">Estimate your pip value</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs text-muted-foreground">Pair</span>
          <select value={pair} onChange={(e) => setPair(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold/60">
            {["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "XAUUSD"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Lot size</span>
          <input type="number" step="0.01" value={lots} onChange={(e) => setLots(+e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold/60" />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Pips</span>
          <input type="number" value={pips} onChange={(e) => setPips(+e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold/60" />
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Estimated value</div>
        <div className="text-gradient-gold mt-1 font-display text-4xl font-black">${pipValue}</div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Approximation for USD accounts. Actual value depends on your broker and current quote.</p>
    </div>
  );
}

const SESSIONS = [
  { name: "Sydney", openUTC: 22, closeUTC: 7 },
  { name: "Tokyo", openUTC: 0, closeUTC: 9 },
  { name: "London", openUTC: 7, closeUTC: 16 },
  { name: "New York", openUTC: 13, closeUTC: 22 },
];

function Sessions() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getUTCHours();
  const isOpen = (o: number, c: number) => (o < c ? h >= o && h < c : h >= o || h < c);

  return (
    <div className="glass rounded-3xl p-8">
      <div className="flex items-center gap-2 text-gold">
        <Clock className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Market Sessions</span>
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold">Live session clock</h2>
      <p className="text-xs text-muted-foreground">
        UTC +3 now {new Date(now.getTime() + 3 * 60 * 60 * 1000).toUTCString().slice(17, 25)}
      </p>

      <div className="mt-6 space-y-2">
        {SESSIONS.map((s) => {
          const open = isOpen(s.openUTC, s.closeUTC);
          return (
            <div key={s.name} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3">
              <div>
                <div className="font-display text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{String(s.openUTC).padStart(2, "0")}:00 – {String(s.closeUTC).padStart(2, "0")}:00 UTC</div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${open ? "bg-bull/20 text-bull" : "bg-muted text-muted-foreground"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-bull animate-pulse-gold" : "bg-muted-foreground"}`} />
                {open ? "Open" : "Closed"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Price = { symbol: string; label: string; price: number; change: number };
const SEED: Price[] = [
  { symbol: "XAUUSD", label: "Gold", price: 2384.10, change: 0.42 },
  { symbol: "BTCUSD", label: "Bitcoin", price: 68214, change: 1.02 },
  { symbol: "EURUSD", label: "Euro / Dollar", price: 1.0821, change: -0.11 },
  { symbol: "GBPUSD", label: "Pound / Dollar", price: 1.2704, change: 0.18 },
  { symbol: "USDJPY", label: "Dollar / Yen", price: 156.31, change: 0.24 },
  { symbol: "AUDUSD", label: "Aussie / Dollar", price: 0.6612, change: -0.07 },
  { symbol: "USDCAD", label: "Dollar / Loonie", price: 1.3684, change: 0.09 },
  { symbol: "ETHUSD", label: "Ethereum", price: 3520.4, change: 0.55 },
];

function LivePrices() {
  const [prices, setPrices] = useState(SEED);

  useEffect(() => {
    const t = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => {
          const delta = (Math.random() - 0.5) * (p.price > 100 ? p.price * 0.0004 : 0.0009);
          const newPrice = +(p.price + delta).toFixed(p.price > 100 ? 2 : 4);
          const newChange = +(p.change + (Math.random() - 0.5) * 0.05).toFixed(2);
          return { ...p, price: newPrice, change: newChange };
        })
      );
    }, 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass rounded-3xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-gold">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Live Market</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">Live prices</h2>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse-gold rounded-full bg-gold" /> Auto-refresh
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {prices.map((p) => {
          const up = p.change >= 0;
          return (
            <div key={p.symbol} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold">{p.symbol}</span>
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-bull" : "text-bear"}`}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {p.change > 0 ? "+" : ""}{p.change}%
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{p.label}</div>
              <div className="mt-3 font-display text-xl font-bold tabular-nums">{p.price.toLocaleString(undefined, { minimumFractionDigits: p.price > 100 ? 2 : 4 })}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Prices shown are demo ticks for illustration. Wire your preferred market data feed in production.</p>
    </div>
  );
}
