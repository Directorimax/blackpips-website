import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, Users, Award } from "lucide-react";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    createSeoHead({
      title: "About BLACKPIPS",
      description:
        "Learn about BLACKPIPS, its approach to structured forex education and the ALC learning framework.",
      path: "/about",
    }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Our Story</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">A trading desk. Not an influencer brand.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          BlackPips was founded by full-time traders who were tired of watching newcomers chase indicators and copy signals. We built the school we wish we'd had — one that teaches you to think in structure, liquidity and intent.
        </p>
      </header>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {[
          { icon: Target, title: "Mission", body: "Turn ambitious retail traders into decision-grade market readers using the ALC framework." },
          { icon: Eye, title: "Vision", body: "A world where private traders operate with the same clarity as institutional desks — no signals required." },
          { icon: Users, title: "Community", body: "A small, moderated cohort where every student is expected to journal, participate and improve." },
          { icon: Award, title: "Why BlackPips", body: "Curriculum that repeats in live markets, videos edited to the point, and a mentor who's still trading." },
        ].map((b) => (
          <div key={b.title} className="glass rounded-2xl p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-glow">
              <b.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-semibold">{b.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="glass mt-10 rounded-3xl p-8 sm:p-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-28 w-28 shrink-0 rounded-full bg-gradient-gold p-[3px] shadow-glow">
            <div className="grid h-full w-full place-items-center rounded-full bg-background text-gradient-gold font-display text-3xl font-black">A</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gold">Head Instructor</div>
            <h3 className="mt-1 font-display text-2xl font-bold">ALC — Lead Trader, BlackPips</h3>
            <p className="mt-2 text-sm text-muted-foreground">Nine years trading forex majors and XAUUSD. Built the ALC framework across four consecutive years of live journaling. Teaches only what he takes to the market himself.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
