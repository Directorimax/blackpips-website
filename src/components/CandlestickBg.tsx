import { useEffect, useRef } from "react";

/** Animated candlestick background. Pure canvas, no deps, respects prefers-reduced-motion. */
export function CandlestickBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const bull = () => getComputedStyle(document.documentElement).getPropertyValue("--bull").trim() || "oklch(0.7 0.17 155)";
    const bear = () => getComputedStyle(document.documentElement).getPropertyValue("--bear").trim() || "oklch(0.62 0.22 25)";
    const gold = () => getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "oklch(0.82 0.15 85)";

    type Candle = { x: number; open: number; close: number; high: number; low: number; up: boolean };
    const spacing = 22;
    let candles: Candle[] = [];
    let last = 0.5;

    const genCandle = (x: number): Candle => {
      const drift = (Math.random() - 0.48) * 0.06;
      const open = last;
      const close = Math.max(0.08, Math.min(0.92, open + drift));
      const high = Math.max(open, close) + Math.random() * 0.04;
      const low = Math.min(open, close) - Math.random() * 0.04;
      last = close;
      return { x, open, close, high, low, up: close >= open };
    };

    const init = () => {
      candles = [];
      const count = Math.ceil(w / spacing) + 4;
      for (let i = 0; i < count; i++) candles.push(genCandle(i * spacing));
    };
    init();

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // move
      for (const c of candles) c.x -= 0.35;
      if (candles.length && candles[0].x < -spacing) {
        candles.shift();
        const nx = candles[candles.length - 1].x + spacing;
        candles.push(genCandle(nx));
      }

      const bullC = bull(), bearC = bear(), goldC = gold();

      for (const c of candles) {
        const cx = c.x;
        const top = (1 - c.high) * h;
        const bot = (1 - c.low) * h;
        const oy = (1 - c.open) * h;
        const cy = (1 - c.close) * h;
        const bodyTop = Math.min(oy, cy);
        const bodyH = Math.max(2, Math.abs(cy - oy));

        ctx.strokeStyle = c.up ? bullC : bearC;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke();

        ctx.fillStyle = c.up ? bullC : bearC;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(cx - 5, bodyTop, 10, bodyH);
      }

      // gold sweep line
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = goldC;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 6]);
      const yLine = h * 0.5 + Math.sin(t * 0.008) * 30;
      ctx.beginPath(); ctx.moveTo(0, yLine); ctx.lineTo(w, yLine); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      t++;
      raf = requestAnimationFrame(draw);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) raf = requestAnimationFrame(draw);
    else draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={ref} className="h-full w-full opacity-70" />
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
