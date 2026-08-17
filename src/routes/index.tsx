import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, ChevronDown } from "lucide-react";
import { useState } from "react";
import { CandlestickBg } from "@/components/CandlestickBg";
import { TradingViewTickerTape } from "@/components/TradingViewTickerTape";
import { useAuth } from "@/contexts/useAuth";
import { HOME_FAQ, JOURNEY, PRIORITY_DESTINATIONS, WHY } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

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

function Home() {
  return (
    <>
      <Hero />
      <TradingViewTickerTape />
      <PriorityTools />
      <Why />
      <Journey />
      <FaqSection />
      <Newsletter />
    </>
  );
}

function PriorityTools() {
  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-7 pt-12 sm:pb-8 sm:pt-16 lg:pb-10 lg:pt-20"
      aria-labelledby="trading-tools-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Trader tools</p>
          <h2
            id="trading-tools-heading"
            className="mt-2 font-display text-3xl font-bold sm:text-4xl"
          >
            Build a stronger trading process
          </h2>
        </div>
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-sm font-bold text-gold">
          Explore all tools <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PRIORITY_DESTINATIONS.map((destination) => (
          <Link
            key={destination.to}
            to={destination.to}
            className="group rounded-2xl border border-border bg-card p-4 shadow-elegant transition hover:-translate-y-0.5 hover:border-gold/35"
          >
            <h3 className="font-display font-bold group-hover:text-gold">{destination.label}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {destination.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  const { user } = useAuth();

  return (
    <section className="relative -mt-24 overflow-hidden">
      <CandlestickBg />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-28 text-center sm:pb-14 sm:pt-32 lg:pb-16">
        <div className="glass animate-float-up mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <span>Premium ALC Education</span>
        </div>
        <h1
          className="animate-float-up mt-6 text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          style={{ animationDelay: "0.05s" }}
        >
          Master Forex Trading with <span className="text-gradient-gold">ALC Strategy</span>
        </h1>
        <p
          className="animate-float-up mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg"
          style={{ animationDelay: "0.15s" }}
        >
          Learn the complete institutional trading approach — from beginner to advanced — through
          premium education engineered for serious traders.
        </p>
        <div
          className="animate-float-up mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.25s" }}
        >
          {user ? (
            <Link
              to="/free"
              className="shine group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Start Learning for Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="shine group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
              >
                Create your account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold hover:text-gold"
              >
                Sign in
              </Link>
            </>
          )}
        </div>

        <div
          className="animate-float-up mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-2 text-center sm:mt-14 sm:gap-4"
          style={{ animationDelay: "0.35s" }}
        >
          {[
            { k: "1k+", v: "Students" },
            { k: "98%", v: "Completion" },
            { k: "4.9★", v: "Avg rating" },
          ].map((s) => (
            <div key={s.v} className="glass rounded-2xl px-2 py-5 sm:px-4">
              <div className="text-gradient-gold font-display text-2xl font-bold sm:text-3xl">
                {s.k}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-balance font-display text-3xl font-bold sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-3 text-balance text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Why() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-7 sm:py-8 lg:py-10">
      <SectionHead
        eyebrow="Why BLACKPIPS"
        title="Built for traders who take this seriously"
        sub="No hype, no signals, no shortcuts. Just the framework professional traders actually use."
      />
      <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map((w, i) => (
          <div
            key={w.title}
            className="glass group rounded-2xl p-6 transition-transform hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-glow">
              {i % 3 === 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : i % 3 === 1 ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <h3 className="font-display text-lg font-semibold">{w.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{w.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 pt-7 sm:pb-16 sm:pt-8 lg:pb-20 lg:pt-10">
      <SectionHead
        eyebrow="Student Journey"
        title="From your first candle to institutional execution"
      />
      <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-4 lg:gap-6">
        {JOURNEY.map((j) => (
          <div
            key={j.step}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-transform hover:-translate-y-1"
          >
            <div className="text-gradient-gold font-display text-4xl font-black">{j.step}</div>
            <h3 className="mt-3 font-display text-lg font-semibold">{j.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{j.desc}</p>
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-gold opacity-10 blur-2xl" />
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-y border-border/60 bg-card/30 py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHead eyebrow="FAQ" title="Answers, not marketing" />
        <div className="mt-8 space-y-3 sm:mt-10">
          {HOME_FAQ.map((f, i) => (
            <div key={f.q} className="glass rounded-2xl">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-display text-base font-semibold">{f.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gold transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            to="/faq"
            className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            View All FAQs
          </Link>
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16 lg:py-20">
      <div className="glass relative overflow-hidden rounded-3xl p-10 text-center shadow-elegant sm:p-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-gold opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-gold opacity-15 blur-3xl" />
        <h2 className="relative font-display text-3xl font-bold sm:text-4xl">
          Weekly market intelligence. Zero noise.
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
          Market bias, structure notes, and educational insights — delivered to your inbox every
          Sunday.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thanks — we'll be in touch.");
          }}
          className="relative mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
        >
          <input
            required
            type="email"
            placeholder="you@trader.com"
            className="glass w-full rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/60"
          />
          <button className="rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
