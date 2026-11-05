import { useMemo, type CSSProperties } from "react";

type Candle = {
  up: boolean;
  wickTop: number;
  wickHeight: number;
  bodyTop: number;
  bodyHeight: number;
};

/** Deterministic random walk so the drifting chart looks the same on every render. */
export function walkCandles(seed: number, count: number): Candle[] {
  let s = seed;
  let value = 50;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const open = value;
    value = Math.max(18, Math.min(82, value + (rnd() - 0.48) * 9 + Math.sin(i / 7) * 1.8));
    const high = Math.max(open, value) + rnd() * 5 + 1;
    const low = Math.min(open, value) - rnd() * 5 - 1;
    out.push({
      up: value >= open,
      wickTop: 100 - high,
      wickHeight: high - low,
      bodyTop: 100 - Math.max(open, value),
      bodyHeight: Math.max(0.8, Math.abs(value - open)),
    });
  }
  return out;
}

function CandleSet({ candles }: { candles: Candle[] }) {
  return (
    <div className="fx-set">
      {candles.map((c, i) => (
        <span key={i} className={`fx-c ${c.up ? "u" : "d"}`}>
          <b style={{ top: `${c.wickTop}%`, height: `${c.wickHeight}%` }} />
          <i style={{ top: `${c.bodyTop}%`, height: `${c.bodyHeight}%` }} />
        </span>
      ))}
    </div>
  );
}

/** One drifting layer of candles; the set is rendered twice so the loop is seamless. */
export function CandleLayer({
  seed,
  depth,
  style,
}: {
  seed: number;
  depth: "near" | "far";
  style?: CSSProperties;
}) {
  const candles = useMemo(() => walkCandles(seed, 90), [seed]);
  return (
    <div className={`fx-layer ${depth}`} style={style}>
      <CandleSet candles={candles} />
      <CandleSet candles={candles} />
    </div>
  );
}
