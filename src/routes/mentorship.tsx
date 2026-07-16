import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Crown, Sparkles } from "lucide-react";
import { MENTORSHIP } from "@/lib/site-data";

export const Route = createFileRoute("/mentorship")({
  head: () => ({
    meta: [
      { title: "Mentorship — BlackPips ALC Program" },
      { name: "description", content: "BlackPips mentorship — Regular, Advanced and Masterclass tiers. The complete ALC curriculum with lifetime access." },
      { property: "og:title", content: "Mentorship — BlackPips" },
      { property: "og:description", content: "Regular $100 · Advanced $200 · Masterclass $300. Full ALC curriculum." },
    ],
  }),
  component: Mentorship,
});

function Mentorship() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Mentorship</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">The complete ALC program</h1>
        <p className="mt-3 text-muted-foreground">Foundation, risk management, psychology, live market analysis, homework, journaling and lifetime updates — three tiers, one methodology.</p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["Complete Forex foundation", "Risk management", "Trading psychology", "Live market analysis", "Homework & practice", "Trading journal template", "Practical exercises", "Lifetime updates"].map((f) => (
          <div key={f} className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {MENTORSHIP.map((m) => (
          <div
            key={m.tier}
            className={`relative flex flex-col rounded-3xl border p-8 transition-all ${m.popular ? "border-gold/50 bg-card shadow-elegant lg:-translate-y-3" : "border-border bg-card"}`}
          >
            {m.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                Most popular
              </div>
            )}
            <div className="flex items-center gap-2 text-gold">
              {m.popular ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              <span className="text-xs font-semibold uppercase tracking-wide">{m.tier}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-gradient-gold font-display text-5xl font-black">${m.price}</span>
              <span className="text-sm text-muted-foreground">/ one-time</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Lifetime access · Instant enrollment</p>

            <button className="mt-6 rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
              Enroll now
            </button>

            <div className="mt-8 border-t border-border pt-6">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Curriculum</div>
              <div className="space-y-4">
                {m.modules.map((mod) => (
                  <div key={mod.name}>
                    <div className="text-sm font-semibold">{mod.name}</div>
                    <ul className="mt-1.5 space-y-1">
                      {mod.items.map((it) => (
                        <li key={it} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
