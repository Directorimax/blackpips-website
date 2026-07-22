import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Star,
  PlayCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { CandlestickBg } from "@/components/CandlestickBg";
import { WHY, LEARN, JOURNEY, COURSES, FREE_LESSONS, FAQ, SITE, formatTZS } from "@/lib/site-data";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <Why />
      <Learn />
      <Journey />
      <FeaturedCourses />
      <FeaturedFree />
      <FaqSection />
      <Contact />
      <Newsletter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative -mt-24 flex min-h-[92vh] items-center overflow-hidden">
      <CandlestickBg />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-32 pb-20 text-center">
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
          <Link
            to="/courses"
            className="shine group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
          >
            Start Learning
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/free"
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold hover:text-gold"
          >
            <PlayCircle className="h-4 w-4" /> Explore Free Lessons
          </Link>
        </div>

        <div
          className="animate-float-up mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4 text-center"
          style={{ animationDelay: "0.35s" }}
        >
          {[
            { k: "1k+", v: "Students" },
            { k: "98%", v: "Completion" },
            { k: "4.9★", v: "Avg rating" },
          ].map((s) => (
            <div key={s.v} className="glass rounded-2xl px-4 py-5">
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

function Ticker() {
  const items = [
    "XAUUSD 2,384.10 ▲ 0.42%",
    "EURUSD 1.0821 ▼ 0.11%",
    "GBPUSD 1.2704 ▲ 0.18%",
    "USDJPY 156.31 ▲ 0.24%",
    "BTCUSD 68,214 ▲ 1.02%",
    "AUDUSD 0.6612 ▼ 0.07%",
    "USDCAD 1.3684 ▲ 0.09%",
  ];
  const row = [...items, ...items];
  return (
    <div className="border-y border-border/60 bg-card/40 py-3 overflow-hidden">
      <div className="flex whitespace-nowrap animate-ticker gap-10 text-xs font-medium text-muted-foreground">
        {row.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
            {t}
          </span>
        ))}
      </div>
    </div>
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
    <section className="mx-auto max-w-7xl px-4 py-24">
      <SectionHead
        eyebrow="Why BlackPips"
        title="Built for traders who take this seriously"
        sub="No hype, no signals, no shortcuts. Just the framework professional traders actually use."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

function Learn() {
  return (
    <section className="border-y border-border/60 bg-card/30 py-24">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHead
          eyebrow="Curriculum"
          title="What you will learn"
          sub="The full ALC framework — decoded, sequenced and made repeatable."
        />
        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {LEARN.map((l) => (
            <div key={l} className="glass flex items-center gap-3 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
              <span className="text-sm font-medium">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24">
      <SectionHead
        eyebrow="Student Journey"
        title="From your first candle to institutional execution"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-4">
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

function FeaturedCourses() {
  return (
    <section className="border-y border-border/60 bg-card/30 py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
              Premium
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Featured courses</h2>
          </div>
          <Link to="/courses" className="text-sm font-semibold text-gold hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {COURSES.map((c) => (
            <article
              key={c.slug}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-accent to-secondary">
                <div className="absolute inset-0 bg-hero-glow opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gradient-gold font-display text-5xl font-black opacity-40">
                    {c.level}
                  </div>
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
                  {c.level}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.lessons} lessons</span>
                  <span>·</span>
                  <span>{c.duration}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-gold">
                    <Star className="h-3 w-3 fill-current" /> {c.rating}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-gradient-gold font-display text-xl font-bold">
                    {formatTZS(c.price)}
                  </span>
                  <Link to="/courses" className="text-xs font-semibold text-gold hover:underline">
                    Buy now →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedFree() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
            Free
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Start with a free lesson
          </h2>
        </div>
        <Link to="/free" className="text-sm font-semibold text-gold hover:underline">
          Browse library →
        </Link>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FREE_LESSONS.slice(0, 6).map((f) => (
          <div
            key={f.id}
            className="glass group flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
          >
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-gold shadow-glow">
              <PlayCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{f.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {f.level} · {f.duration}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-y border-border/60 bg-card/30 py-24">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHead eyebrow="FAQ" title="Answers, not marketing" />
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
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
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-4xl px-4 py-24 text-center">
      <SectionHead
        eyebrow="Contact"
        title="Talk to the BlackPips desk"
        sub="Questions about a course, mentorship or payment? We reply within one business day."
      />
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={SITE.whatsapp}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold hover:text-gold"
        >
          WhatsApp
        </a>
        <a
          href={`mailto:${SITE.email}`}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold hover:text-gold"
        >
          {SITE.email}
        </a>
        <Link
          to="/contact"
          className="rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Open contact form
        </Link>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24">
      <div className="glass relative overflow-hidden rounded-3xl p-10 text-center shadow-elegant sm:p-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-gold opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-gold opacity-15 blur-3xl" />
        <h2 className="relative font-display text-3xl font-bold sm:text-4xl">
          Weekly market intelligence, zero noise.
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
          Bias, structure notes and the trades we're watching — sent every Sunday to your inbox.
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
