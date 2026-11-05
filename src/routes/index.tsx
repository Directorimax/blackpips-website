import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Calculator,
  CalendarCheck,
  Check,
  Clock,
  GraduationCap,
  Landmark,
  Lightbulb,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CandleLayer } from "@/components/bp/CandleField";
import { COURSES, HOME_FAQ, JOURNEY, PRIORITY_DESTINATIONS, WHY } from "@/lib/site-data";
import { getAllSessionSnapshots } from "@/lib/market-session-engine";
import { formatTime, formatTimeZoneLabel } from "@/lib/market-session-time";
import { useMarketSessions } from "@/hooks/useMarketSessions";
import { createSeoHead } from "@/lib/seo";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppleIcon, PlayIcon } from "@/components/bp/StoreIcons";
import appHomeScreen from "@/assets/app-home-screen.jpg";

export const Route = createFileRoute("/")({
  head: () =>
    createSeoHead({
      title: "Forex Education and ALC Lessons",
      description:
        "Learn structured forex education through BLACKPIPS premium lessons, free learning resources and mentorship.",
      path: "/",
    }),
  component: Home,
});

const SESSION_COLORS: Record<string, string> = {
  Sydney: "#3B5BDB",
  Tokyo: "#C026D3",
  London: "#4A90E2",
  "New York": "#4CAF50",
};

const TOPICS = [
  "Market Structure",
  "Swing Points",
  "Break of Structure",
  "Liquidity Engineering",
  "Failed LE",
  "Inside & Outside",
  "Flip Zones",
  "MoC & IMB",
  "Directional Bias",
  "Entry T1 → T8",
  "XAUUSD Sessions",
  "Top-Down Analysis",
];

const PROGRAMME_MARKS = ["REG", "ADV", "MC", "T8"];
const PROGRAMME_LEVELS = ["Foundation", "Advanced", "Master", "Specialized"];

const TOOL_ICONS: Record<(typeof PRIORITY_DESTINATIONS)[number]["to"], typeof Clock> = {
  "/tools/trading-journal": BookOpenText,
  "/tools/market-sessions": Clock,
  "/tools/pip-calculator": Calculator,
  "/trading-tips": Lightbulb,
  "/trading-plan": CalendarCheck,
};

const WHY_ICONS = [Landmark, TrendingUp, Zap, ShieldCheck, Users, BarChart3];

const APP_POINTS = [
  { t: "Protected lessons", d: "Premium videos play only inside the app." },
  { t: "Learning activity", d: "Daily goal, streaks and active days — right on your home screen." },
  { t: "Quick access", d: "Journal, tips and the pips calculator one tap away." },
  {
    t: "Same account everywhere",
    d: "Tools, purchases and progress follow you between web and app.",
  },
];

function Home() {
  return (
    <div className="bp bp-page">
      <Hero />
      <Curriculum />
      <TraderTools />
      <Why />
      <Journey />
      <AppSection />
      <FaqSection />
      <Newsletter />
    </div>
  );
}

function Hero() {
  return (
    <section className="home-hero">
      <div className="fx" aria-hidden="true">
        <div className="fx-halo" />
        <CandleLayer seed={31} depth="far" style={{ height: "64%", top: "4%" }} />
        <CandleLayer seed={7} depth="near" style={{ height: "66%", top: "0%" }} />
        <div
          className="fx-veil"
          style={{
            background:
              "radial-gradient(ellipse 58% 48% at 50% 34%, var(--bg) 25%, transparent 75%)",
          }}
        />
      </div>

      <div className="wrap center" style={{ position: "relative", zIndex: 2 }}>
        <div className="rise">
          <span className="eyebrow">
            <span className="tag">ALC</span> Premium ALC Education
          </span>
        </div>
        <h1 className="h-hero rise d1" style={{ margin: "26px auto 0", maxWidth: 980 }}>
          Master Forex Trading with <span className="gold-text">ALC Strategy</span>
        </h1>
        <p className="lead rise d2" style={{ maxWidth: 640, margin: "24px auto 0" }}>
          Learn the complete institutional trading approach — from beginner to advanced — through
          premium education engineered for serious traders.
        </p>
        <div
          className="row-wrap rise d3 stack-s"
          style={{ justifyContent: "center", marginTop: 34 }}
        >
          <Link to="/auth" search={{ mode: "signup" }} className="btn btn-gold btn-lg">
            Create your account <ArrowRight className="arrow" aria-hidden="true" />
          </Link>
          <Link to="/auth" search={{ mode: "signin" }} className="btn btn-ghost btn-lg">
            Sign in
          </Link>
        </div>
        <div className="home-stats rise d4">
          <div className="glass stat spot">
            <b className="gold-text">1k+</b>
            <span className="small">Students</span>
          </div>
          <div className="glass stat spot orbit-stroke">
            <b className="gold-text">98%</b>
            <span className="small">Completion</span>
          </div>
          <div className="glass stat spot">
            <b className="gold-text">4.9★</b>
            <span className="small">Avg rating</span>
          </div>
        </div>
      </div>

      <div className="wrap-wide" style={{ marginTop: 56, position: "relative", zIndex: 2 }}>
        <MarketsNow />
      </div>
    </section>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Mirrors the Market Sessions tool: same saved time zone, time format and session engine. */
function MarketsNow() {
  const { now, timeZone, timeFormat, isReady } = useMarketSessions();
  const sessions = getAllSessionSnapshots(now, timeZone, timeFormat);
  const openCount = sessions.filter((s) => s.isOpen).length;
  const day = now.getUTCDay();
  const weekend = day === 6 || (day === 0 && openCount === 0);
  const note = weekend
    ? "Weekend · markets closed"
    : openCount > 1
      ? `${openCount} sessions open · overlap`
      : `${openCount} session open`;

  return (
    <div className="card mkt spot rise d5">
      <div className="between mkt-head">
        <div className="row" style={{ gap: 10 }}>
          <span className={`chip ${openCount > 0 ? "chip-bull" : ""}`}>
            {openCount > 0 && <span className="dot" />}
            {note}
          </span>
          <span className="h4" style={{ fontSize: 14 }}>
            Forex markets right now
          </span>
          {isReady && (
            <span className="small mono" style={{ fontSize: 12 }}>
              {formatTime(now, timeZone, timeFormat)} · {formatTimeZoneLabel(timeZone)}
            </span>
          )}
        </div>
        <Link to="/tools/market-sessions" className="row small mkt-link">
          Open Market Sessions <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="mkt-grid">
        {sessions.map((s) => {
          const color = SESSION_COLORS[s.config.name];
          return (
            <div className="mtile" key={s.config.id}>
              <div className="between">
                <span className="row" style={{ gap: 8 }}>
                  <span className="sw" style={{ background: color }} />
                  <span className="h4">{s.config.name}</span>
                </span>
                <span className={`chip ${s.isOpen ? "chip-bull" : ""}`} style={{ fontSize: 10.5 }}>
                  {s.isOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <span className="clock">
                {s.displayOpenTime}–{s.displayCloseTime}
              </span>
              <span className="small" style={{ fontSize: 12 }}>
                {formatTimeZoneLabel(timeZone)}
              </span>
              <div className="mbar">
                <i style={{ width: `${s.progressPercentage}%`, background: color }} />
              </div>
              <span className="small" style={{ fontSize: 12 }}>
                {s.isOpen ? `Closes in ${s.countdown}` : `Opens in ${s.countdown}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Curriculum() {
  const topics = [...TOPICS, ...TOPICS];
  return (
    <section style={{ padding: "64px 0 8px" }}>
      <p className="micro center" style={{ marginBottom: 22 }}>
        The ALC curriculum, end to end
      </p>
      <div className="marquee">
        <div className="marquee-track">
          {topics.map((topic, i) => (
            <span className="topic" key={`${topic}-${i}`} aria-hidden={i >= TOPICS.length}>
              <GraduationCap aria-hidden="true" />
              {topic}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The signed-in trader's real win rate; example data for visitors. */
function useJournalWinRate() {
  const { user } = useAuth();
  const [rate, setRate] = useState<{ value: number; real: boolean; trades: number }>({
    value: 58,
    real: false,
    trades: 0,
  });
  useEffect(() => {
    if (!user) {
      setRate({ value: 58, real: false, trades: 0 });
      return;
    }
    let alive = true;
    void (async () => {
      // The journal table is not in the generated types; RLS keeps it to its owner.
      const journal = () =>
        (supabase as unknown as SupabaseClient)
          .from("trading_journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
      const [all, wins] = await Promise.all([journal(), journal().eq("result", "win")]);
      if (!alive || all.error || wins.error || !all.count) return;
      setRate({
        value: Math.round(((wins.count ?? 0) / all.count) * 100),
        real: true,
        trades: all.count,
      });
    })();
    return () => {
      alive = false;
    };
  }, [user]);
  return rate;
}

/** Counts up to [target] once the element scrolls into view. */
function useCountUp(target: number) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1600);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, target]);
  return { ref: setNode, shown, seen };
}

function JournalCard() {
  const rate = useJournalWinRate();
  const { ref, shown, seen } = useCountUp(rate.value);
  const circumference = 314;
  return (
    <Link
      ref={ref}
      to="/tools/trading-journal"
      className="card lift spot span-2 reveal bento-journal"
    >
      <div className="row">
        <span className="ico">
          <BookOpenText aria-hidden="true" />
        </span>
        <h3 className="h3">Trading Journal</h3>
      </div>
      <p className="small" style={{ marginTop: -4 }}>
        Track and review trading decisions in a private journal.
      </p>
      <div className="ring-wrap">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--fill2)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#FABE33"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * (seen ? shown : 0)) / 100}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="ring-label">
          <span className="ring-value">{shown}%</span>
          <span className="micro">Win rate</span>
        </div>
      </div>
      <p className="small center" style={{ marginTop: "auto", fontSize: 12 }}>
        {rate.real
          ? `From your ${rate.trades} journaled ${rate.trades === 1 ? "trade" : "trades"}`
          : "Example data"}
      </p>
    </Link>
  );
}

function TraderTools() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="reveal section-head" style={{ maxWidth: 680 }}>
          <p className="kicker">Trader tools</p>
          <h2 className="h2" style={{ marginTop: 16 }}>
            Everything a serious trader needs, <span className="gold-text">in one place.</span>
          </h2>
        </div>
        <div className="bento">
          <div className="card spot span-4 reveal bento-lessons">
            <div className="between">
              <span className="ico ico-solid">
                <GraduationCap aria-hidden="true" />
              </span>
              <span className="chip chip-gold">Watch in the app</span>
            </div>
            <div>
              <h3 className="h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)" }}>
                Lessons that build like a trading plan.
              </h3>
              <p className="body" style={{ marginTop: 10, maxWidth: 520 }}>
                Four premium programmes, from first structure to the eight entries. Every lesson
                plays securely in the BLACKPIPS app.
              </p>
            </div>
            <div className="prog-grid">
              {COURSES.map((course, i) => (
                <Link
                  key={course.slug}
                  to="/courses/$slug"
                  params={{ slug: course.slug }}
                  className="prog-mini"
                >
                  <span className="prog-n">{PROGRAMME_MARKS[i]}</span>
                  <span className="stack" style={{ gap: 6, minWidth: 0 }}>
                    <span className="h4 prog-title">{course.title}</span>
                    <span className="chip prog-level">{PROGRAMME_LEVELS[i]}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link to="/tools" className="btn btn-ghost bento-explore">
              Explore all tools
            </Link>
          </div>
          <JournalCard />
          {PRIORITY_DESTINATIONS.map((destination) => {
            if (destination.to === "/tools/trading-journal") return null;
            const Icon = TOOL_ICONS[destination.to];
            if (destination.to === "/trading-tips") {
              return (
                <Link
                  key={destination.to}
                  to={destination.to}
                  className="card lift spot reveal bento-tip"
                >
                  <span className="ico">
                    <Icon aria-hidden="true" />
                  </span>
                  <div style={{ flex: "1 1 320px" }}>
                    <p className="micro">{destination.label}</p>
                    <p className="h4" style={{ fontSize: 17, marginTop: 6 }}>
                      {destination.description}
                    </p>
                  </div>
                  <span className="chip chip-gold">Fresh insights from BLACKPIPS</span>
                </Link>
              );
            }
            return (
              <Link
                key={destination.to}
                to={destination.to}
                className="card lift spot span-2 reveal"
                style={{ padding: 24 }}
              >
                <div className="row">
                  <span className="ico">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3 className="h3">{destination.label}</h3>
                </div>
                <p className="small" style={{ marginTop: 12 }}>
                  {destination.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="section" style={{ paddingTop: 16 }}>
      <div className="wrap">
        <div className="center reveal" style={{ maxWidth: 720, margin: "0 auto 48px" }}>
          <p className="kicker">Why BLACKPIPS</p>
          <h2 className="h2" style={{ marginTop: 16 }}>
            Built for traders who take this seriously
          </h2>
          <p className="lead" style={{ marginTop: 16 }}>
            No hype, no signals, no shortcuts. Just the framework professional traders actually use.
          </p>
        </div>
        <div className="grid-3">
          {WHY.map((w, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length];
            return (
              <div className="card lift spot why reveal" key={w.title}>
                <span className="ico ico-solid" style={{ width: 40, height: 40, borderRadius: 12 }}>
                  <Icon aria-hidden="true" />
                </span>
                <h3 className="h3">{w.title}</h3>
                <p className="small">{w.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section className="section" style={{ paddingTop: 16 }}>
      <div className="wrap">
        <div className="between reveal section-head">
          <div style={{ maxWidth: 620 }}>
            <p className="kicker">Student journey</p>
            <h2 className="h2" style={{ marginTop: 16 }}>
              From your first candle to institutional execution
            </h2>
          </div>
          <Link to="/courses" className="btn btn-ghost">
            See the lessons
          </Link>
        </div>
        <div className="journey">
          <div className="jline" aria-hidden="true">
            <i />
          </div>
          {JOURNEY.map((j, i) => (
            <div className="stack" style={{ gap: 18 }} key={j.step}>
              <span className={`jdot j${i}`}>{j.step}</span>
              <div>
                <h3 className="h3">{j.title}</h3>
                <p className="small" style={{ marginTop: 8 }}>
                  {j.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppSection() {
  return (
    <section id="app" className="section" style={{ overflow: "hidden" }}>
      <div className="wrap split">
        <div className="reveal">
          <p className="kicker">The BLACKPIPS app</p>
          <h2 className="h2" style={{ marginTop: 16 }}>
            Your trading desk, <span className="gold-text">in your pocket.</span>
          </h2>
          <p className="lead" style={{ marginTop: 18 }}>
            Every premium lesson plays securely in the app. Buy on the website, sign in on your
            phone with the same account, and start learning.
          </p>
          <div className="stack" style={{ gap: 20, marginTop: 32 }}>
            {APP_POINTS.map((p) => (
              <div className="row" style={{ alignItems: "flex-start", gap: 14 }} key={p.t}>
                <span className="ico" style={{ width: 40, height: 40, borderRadius: 12 }}>
                  <Check aria-hidden="true" />
                </span>
                <div>
                  <p className="h4">{p.t}</p>
                  <p className="small" style={{ marginTop: 4 }}>
                    {p.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="row-wrap stack-s" style={{ marginTop: 32 }}>
            <a className="btn btn-dark" href="#app">
              <AppleIcon /> App Store
            </a>
            <a className="btn btn-ghost" href="#app">
              <PlayIcon /> Google Play
            </a>
          </div>
        </div>
        <div className="reveal app-stage">
          <div className="spin-slow app-ring" />
          <div className="app-glow" />
          <div className="phone float tilt3d app-phone" data-tilt="8">
            <div className="phone-screen">
              <img
                className="shot"
                src={appHomeScreen}
                alt="BLACKPIPS app home: continue learning, quick access and learning activity"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section" style={{ paddingTop: 16 }}>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div className="center reveal" style={{ marginBottom: 44 }}>
          <p className="kicker">FAQ</p>
          <h2 className="h2" style={{ marginTop: 16 }}>
            Answers, not marketing
          </h2>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          {HOME_FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                className={`card ${isOpen ? "faq-open" : ""}`}
                style={{ borderRadius: 18 }}
                key={f.q}
              >
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {f.q}
                  <Plus aria-hidden="true" />
                </button>
                {isOpen && (
                  <p
                    className="body rise"
                    style={{ padding: "0 24px 22px", animationDuration: ".5s" }}
                  >
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="center" style={{ marginTop: 28 }}>
          <Link to="/faq" className="btn btn-ghost">
            View All FAQs
          </Link>
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  const [subscribed, setSubscribed] = useState(false);
  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribed(true);
  }
  return (
    <section className="section" style={{ paddingTop: 16 }}>
      <div className="wrap">
        <div className="card spot orbit-stroke newsletter">
          <div className="fx" aria-hidden="true">
            <CandleLayer seed={7} depth="far" style={{ height: "70%", top: "4%" }} />
            <CandleLayer
              seed={31}
              depth="near"
              style={{ height: "76%", top: "14%", animationDuration: "120s" }}
            />
            <div className="fx-veil" />
          </div>
          <div style={{ position: "relative" }}>
            <h2 className="h1" style={{ maxWidth: 780, margin: "0 auto" }}>
              Weekly market intelligence. <span className="gold-text">Zero noise.</span>
            </h2>
            <p className="lead" style={{ maxWidth: 560, margin: "18px auto 0" }}>
              Market bias, structure notes, and educational insights — delivered to your inbox every
              Sunday.
            </p>
            <form className="sub" onSubmit={subscribe}>
              <label className="sr" htmlFor="newsletter-email">
                Email
              </label>
              <input
                id="newsletter-email"
                className="input"
                type="email"
                required
                placeholder="you@trader.com"
                style={{ borderRadius: 999 }}
              />
              <button className="btn btn-gold btn-lg" type="submit">
                {subscribed ? "Subscribed ✓" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
