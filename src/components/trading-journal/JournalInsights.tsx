import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  normalizeJournalProfitLoss,
  summarizeJournalEntries,
  type TradingJournalEntry,
} from "@/lib/trading-journal";

export type FetchJournalRange = (start: Date, end: Date) => Promise<TradingJournalEntry[]>;

const money = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const tone = (value: number) => (value > 0 ? "pos" : value < 0 ? "neg" : "");
const human = (value: string) => value.replaceAll("_", " ");

function useRange(fetchRange: FetchJournalRange, start: Date, end: Date) {
  const [entries, setEntries] = useState<TradingJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const key = `${start.toISOString()}|${end.toISOString()}`;
  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    fetchRange(start, end)
      .then((result) => live && setEntries(result))
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchRange]);
  return { entries, loading, failed };
}

function stats(entries: TradingJournalEntry[]) {
  const totals = summarizeJournalEntries(entries);
  const decided = totals.wins + totals.losses;
  const rrs = entries.map((e) => Number(e.risk_reward_ratio)).filter((v) => v > 0);
  const pnls = entries.map((e) => normalizeJournalProfitLoss(e.result, e.profit_loss));
  return {
    ...totals,
    count: entries.length,
    winRate: decided ? (totals.wins / decided) * 100 : 0,
    profitFactor: totals.grossLoss ? totals.grossProfit / totals.grossLoss : null,
    avgWin: totals.wins ? totals.grossProfit / totals.wins : 0,
    avgLoss: totals.losses ? totals.grossLoss / totals.losses : 0,
    avgRR: rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : null,
    best: pnls.length ? Math.max(...pnls) : 0,
    worst: pnls.length ? Math.min(...pnls) : 0,
    bestEntry: entries[pnls.indexOf(Math.max(...pnls))],
    worstEntry: entries[pnls.indexOf(Math.min(...pnls))],
  };
}

function groupBy(entries: TradingJournalEntry[], keyOf: (e: TradingJournalEntry) => string) {
  const map = new Map<string, TradingJournalEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    map.set(key, [...(map.get(key) ?? []), entry]);
  }
  return [...map.entries()].map(([label, items]) => ({ label, ...stats(items) }));
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }
    let frame = 0;
    const startAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/** Animates the first number inside a formatted string, keeping its prefix/suffix. */
function CountUp({ text }: { text: string }) {
  const match = text.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  const target = match ? Number(match[2].replaceAll(",", "")) : 0;
  const decimals = match?.[2].split(".")[1]?.length ?? 0;
  const value = useCountUp(target);
  if (!match) return <>{text}</>;
  return (
    <>
      {match[1]}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {match[3]}
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  valueTone,
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  valueTone?: string;
  index?: number;
}) {
  return (
    <div className="ji-kpi ji-in" style={{ animationDelay: `${index * 70}ms` }}>
      <span className="ji-label">{label}</span>
      <strong className={`ji-value ${valueTone ?? ""}`}>
        <CountUp text={value} />
      </strong>
      {sub && <span className="ji-sub">{sub}</span>}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: ReturnType<typeof groupBy> }) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.pnl)));
  return (
    <section className="card ji-panel">
      <h3 className="ji-title">{title}</h3>
      {rows.length ? (
        <div className="ji-rows">
          {rows.map((row) => (
            <div key={row.label} className="ji-row">
              <div className="ji-row-top">
                <span className="capitalize">{human(row.label)}</span>
                <span className="ji-muted">
                  {row.count} trades · {Math.round(row.winRate)}%
                </span>
                <strong className={tone(row.pnl)}>{money(row.pnl)}</strong>
              </div>
              <div className="ji-bar">
                <i
                  className={`ji-grow ${tone(row.pnl)}`}
                  style={{ width: `${(Math.abs(row.pnl) / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ji-muted">No trades yet.</p>
      )}
    </section>
  );
}

function State({ loading, failed, empty }: { loading: boolean; failed: boolean; empty: boolean }) {
  if (loading)
    return (
      <div className="card ji-state">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading your trades…
      </div>
    );
  if (failed)
    return <div className="card ji-state">We could not load your trades. Please try again.</div>;
  if (empty) return <div className="card ji-state">No trades in this period yet.</div>;
  return null;
}

const RANGES = [
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "365", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: 0 },
] as const;

export function JournalAnalytics({ fetchRange }: { fetchRange: FetchJournalRange }) {
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]["id"]>("90");
  const { start, end } = useMemo(() => {
    const now = new Date();
    const range = RANGES.find((r) => r.id === rangeId)!;
    const from = range.days
      ? new Date(now.getTime() - range.days * 86_400_000)
      : new Date(2000, 0, 1);
    return { start: from, end: new Date(now.getTime() + 86_400_000) };
  }, [rangeId]);
  const { entries, loading, failed } = useRange(fetchRange, start, end);
  const s = useMemo(() => stats(entries), [entries]);
  const monthly = useMemo(
    () =>
      groupBy(entries, (e) => e.trade_at.slice(0, 7))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(-12),
    [entries],
  );
  const equity = useMemo(() => {
    let run = 0;
    return entries.map((e) => (run += normalizeJournalProfitLoss(e.result, e.profit_loss)));
  }, [entries]);

  return (
    <section className="ji" aria-label="Advanced analytics">
      <div className="ji-toolbar">
        <div>
          <h2 className="h3">Advanced Analytics</h2>
          <p className="ji-muted">Performance across sessions, pairs and setups.</p>
        </div>
        <div className="seg" role="group" aria-label="Analytics period">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={rangeId === r.id}
              className={`seg-btn ${rangeId === r.id ? "on" : ""}`}
              onClick={() => setRangeId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <State loading={loading} failed={failed} empty={!entries.length} />
      {!loading && !failed && entries.length > 0 && (
        <>
          <div className="ji-kpis">
            <Kpi
              index={0}
              label="Net P/L"
              value={money(s.pnl)}
              valueTone={tone(s.pnl)}
              sub={`${s.count} trades`}
            />
            <Kpi
              index={1}
              label="Win rate"
              value={`${Math.round(s.winRate)}%`}
              sub={`${s.wins}W · ${s.losses}L · ${s.breakEvens}BE`}
            />
            <Kpi
              index={2}
              label="Profit factor"
              value={s.profitFactor === null ? "—" : s.profitFactor.toFixed(2)}
              sub="Gross win ÷ gross loss"
            />
            <Kpi
              index={3}
              label="Avg R:R"
              value={s.avgRR === null ? "—" : `1:${s.avgRR.toFixed(2)}`}
              sub="Planned reward to risk"
            />
          </div>
          <div className="ji-pair">
            <WinLoss avgWin={s.avgWin} avgLoss={s.avgLoss} wins={s.wins} losses={s.losses} />
            <TradeCard label="Best trade" entry={s.bestEntry} />
            <TradeCard label="Worst trade" entry={s.worstEntry} />
          </div>
          <section className="card ji-panel">
            <h3 className="ji-title">Equity curve</h3>
            <EquityCurve points={equity} />
          </section>
          <div className="ji-grid">
            <Breakdown title="By session" rows={groupBy(entries, (e) => e.session)} />
            <Breakdown title="By direction" rows={groupBy(entries, (e) => e.direction)} />
            <Breakdown
              title="Top pairs"
              rows={groupBy(entries, (e) => e.pair)
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)}
            />
            <Breakdown
              title="By strategy"
              rows={groupBy(entries, (e) => e.strategy || "No strategy")
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)}
            />
          </div>
          <Breakdown
            title="Monthly trend"
            rows={monthly.map((m) => ({
              ...m,
              label: new Date(`${m.label}-01T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              }),
            }))}
          />
        </>
      )}
    </section>
  );
}

function EquityCurve({ points }: { points: number[] }) {
  const data = [0, ...points];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 600;
  const h = 160;
  const xy = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * w,
    h - ((v - min) / span) * (h - 16) - 8,
  ]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const zeroY = h - ((0 - min) / span) * (h - 16) - 8;
  const last = data[data.length - 1];
  return (
    <svg
      className={`ji-curve ${tone(last)}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Equity curve ending at ${money(last)}`}
    >
      <line x1="0" x2={w} y1={zeroY} y2={zeroY} className="ji-zero" />
      <polygon points={`0,${h} ${line} ${w},${h}`} className="ji-area" />
      <polyline points={line} className="ji-line" pathLength={1} />
    </svg>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function weekStart(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function JournalWeeklyReview({ fetchRange }: { fetchRange: FetchJournalRange }) {
  const [start, setStart] = useState(() => weekStart(new Date()));
  const end = useMemo(
    () => new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7),
    [start],
  );
  const prevStart = useMemo(
    () => new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7),
    [start],
  );
  const { entries, loading, failed } = useRange(fetchRange, prevStart, end);
  const week = entries.filter((e) => new Date(e.trade_at) >= start);
  const last = entries.filter((e) => new Date(e.trade_at) < start);
  const s = stats(week);
  const p = stats(last);
  const isCurrent = start.getTime() === weekStart(new Date()).getTime();
  const days = WEEKDAYS.map((label, index) => {
    const items = week.filter((e) => (new Date(e.trade_at).getDay() + 6) % 7 === index);
    return { label, count: items.length, pnl: stats(items).pnl };
  });
  const maxDay = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));
  const sorted = [...week].sort(
    (a, b) =>
      normalizeJournalProfitLoss(b.result, b.profit_loss) -
      normalizeJournalProfitLoss(a.result, a.profit_loss),
  );
  const bestPair = groupBy(week, (e) => e.pair).sort((a, b) => b.pnl - a.pnl)[0];
  const bestSession = groupBy(week, (e) => e.session).sort((a, b) => b.pnl - a.pnl)[0];
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const delta = s.pnl - p.pnl;

  return (
    <section className="ji" aria-label="Weekly review">
      <div className="ji-toolbar">
        <div>
          <h2 className="h3">Weekly Review</h2>
          <p className="ji-muted">
            {fmt(start)} – {fmt(new Date(end.getTime() - 86_400_000))}, {start.getFullYear()}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Previous week"
            onClick={() => setStart(prevStart)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={isCurrent}
            onClick={() => setStart(weekStart(new Date()))}
          >
            This week
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Next week"
            disabled={isCurrent}
            onClick={() => setStart(new Date(end))}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <State loading={loading} failed={failed} empty={!week.length} />
      {!loading && !failed && week.length > 0 && (
        <>
          <div className="ji-kpis">
            <Kpi
              index={4}
              label="Week P/L"
              value={money(s.pnl)}
              valueTone={tone(s.pnl)}
              sub={`${money(delta)} vs last week`}
            />
            <Kpi index={5} label="Trades" value={String(s.count)} sub={`${p.count} last week`} />
            <Kpi
              index={6}
              label="Win rate"
              value={`${Math.round(s.winRate)}%`}
              sub={`${Math.round(p.winRate)}% last week`}
            />
            <Kpi
              index={7}
              label="Profit factor"
              value={s.profitFactor === null ? "—" : s.profitFactor.toFixed(2)}
            />
            <Kpi
              index={8}
              label="Avg R:R"
              value={s.avgRR === null ? "—" : `1:${s.avgRR.toFixed(2)}`}
            />
          </div>
          <div className="ji-grid">
            <section className="card ji-panel">
              <h3 className="ji-title">By weekday</h3>
              <div className="ji-days">
                {days.map((d) => (
                  <div key={d.label} className="ji-day" title={`${d.count} trades`}>
                    <div className="ji-day-col">
                      <i
                        className={`ji-grow-y ${tone(d.pnl)}`}
                        style={{
                          height: `${Math.max(d.count ? 6 : 0, (Math.abs(d.pnl) / maxDay) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className={`ji-day-val ${tone(d.pnl)}`}>
                      {d.count ? money(d.pnl) : "—"}
                    </span>
                    <span className="ji-muted">{d.label}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="card ji-panel">
              <h3 className="ji-title">Highlights</h3>
              <ul className="ji-list">
                <li>
                  <span>Best trade</span>
                  <strong
                    className={tone(
                      normalizeJournalProfitLoss(sorted[0].result, sorted[0].profit_loss),
                    )}
                  >
                    {sorted[0].pair} ·{" "}
                    {money(normalizeJournalProfitLoss(sorted[0].result, sorted[0].profit_loss))}
                  </strong>
                </li>
                <li>
                  <span>Worst trade</span>
                  <strong
                    className={tone(
                      normalizeJournalProfitLoss(sorted.at(-1)!.result, sorted.at(-1)!.profit_loss),
                    )}
                  >
                    {sorted.at(-1)!.pair} ·{" "}
                    {money(
                      normalizeJournalProfitLoss(sorted.at(-1)!.result, sorted.at(-1)!.profit_loss),
                    )}
                  </strong>
                </li>
                {bestPair && (
                  <li>
                    <span>Best pair</span>
                    <strong>
                      {bestPair.label} · {money(bestPair.pnl)}
                    </strong>
                  </li>
                )}
                {bestSession && (
                  <li>
                    <span>Best session</span>
                    <strong className="capitalize">
                      {human(bestSession.label)} · {money(bestSession.pnl)}
                    </strong>
                  </li>
                )}
                <li>
                  <span>Long / short</span>
                  <strong>
                    {week.filter((e) => e.direction === "long").length} /{" "}
                    {week.filter((e) => e.direction === "short").length}
                  </strong>
                </li>
              </ul>
            </section>
          </div>
          <section className="card ji-panel">
            <h3 className="ji-title">Trades this week</h3>
            <ul className="ji-list">
              {week.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong className="mono">{e.pair}</strong>{" "}
                    <span className="ji-muted capitalize">
                      {new Date(e.trade_at).toLocaleDateString(undefined, { weekday: "short" })} ·{" "}
                      {e.direction} · {human(e.session)}
                    </span>
                  </span>
                  <strong className={tone(normalizeJournalProfitLoss(e.result, e.profit_loss))}>
                    {money(normalizeJournalProfitLoss(e.result, e.profit_loss))}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}

function WinLoss({
  avgWin,
  avgLoss,
  wins,
  losses,
}: {
  avgWin: number;
  avgLoss: number;
  wins: number;
  losses: number;
}) {
  const total = avgWin + avgLoss || 1;
  const ratio = avgLoss ? avgWin / avgLoss : null;
  return (
    <div className="ji-kpi ji-in ji-wl">
      <span className="ji-label">Average win vs average loss</span>
      <div className="ji-wl-vals">
        <div>
          <span className="ji-sub">Avg win · {wins}</span>
          <strong className="ji-value pos">
            <CountUp text={money(avgWin)} />
          </strong>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="ji-sub">Avg loss · {losses}</span>
          <strong className="ji-value neg">
            <CountUp text={money(-avgLoss)} />
          </strong>
        </div>
      </div>
      <div className="ji-wl-bar" aria-hidden="true">
        <i className="ji-grow pos" style={{ width: `${(avgWin / total) * 100}%` }} />
        <i className="ji-grow neg" style={{ width: `${(avgLoss / total) * 100}%` }} />
      </div>
      <span className="ji-sub">
        {ratio === null
          ? "No losing trades in this period"
          : `Your average win is ${ratio.toFixed(2)}× your average loss`}
      </span>
    </div>
  );
}

function TradeCard({ label, entry }: { label: string; entry?: TradingJournalEntry }) {
  if (!entry) return null;
  const pnl = normalizeJournalProfitLoss(entry.result, entry.profit_loss);
  return (
    <div className={`ji-kpi ji-in ji-trade ${tone(pnl)}`}>
      <span className="ji-label">{label}</span>
      <strong className={`ji-value ${tone(pnl)}`}>
        <CountUp text={money(pnl)} />
      </strong>
      <span className="ji-trade-meta">
        <b className="mono">{entry.pair}</b>
        <span className="capitalize">
          {entry.direction} · {human(entry.session)}
        </span>
      </span>
      <span className="ji-sub">
        {new Date(entry.trade_at).toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>
  );
}
