import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BLOG_POSTS } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/blog")({
  head: () =>
    createSeoHead({
      title: "Forex Education Blog",
      description:
        "Read BLACKPIPS articles on market structure, liquidity, risk management, trading psychology and news analysis.",
      path: "/blog",
    }),
  component: Blog,
});

const CATS = ["All", "Market Structure", "Trading Psychology", "Risk Management", "Liquidity", "News Analysis"];

function Blog() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() =>
    BLOG_POSTS.filter((p) =>
      (cat === "All" || p.category === cat) &&
      p.title.toLowerCase().includes(q.toLowerCase())
    ), [q, cat]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Journal</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Essays for serious traders</h1>
        <p className="mt-3 text-muted-foreground">Deep dives on structure, liquidity, psychology and the mechanics of institutional flow.</p>
      </header>

      <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="glass flex flex-wrap gap-1 rounded-full p-1">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${cat === c ? "bg-gradient-gold text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <article key={p.slug} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elegant">
            <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-accent to-secondary">
              <div className="absolute inset-0 bg-hero-glow opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gradient-gold font-display text-4xl font-black opacity-40">{p.category.split(" ").map(w => w[0]).join("")}</div>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gold">{p.category}</div>
              <h2 className="mt-2 font-display text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
              <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{new Date(p.date ?? "2025-04-01").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
