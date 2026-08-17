import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, Images, Sparkles } from "lucide-react";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/trading-tips")({
  head: () =>
    createSeoHead({
      title: "Trading Tips",
      description: "Access fresh BLACKPIPS trading insights and educational market tips.",
      path: "/trading-tips",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Trading Tips", path: "/trading-tips" },
      ],
    }),
  component: TradingTipsLanding,
});

function TradingTipsLanding() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
      <SeoBreadcrumbs current="Trading Tips" />
      <section className="rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card p-7 shadow-elegant sm:p-10">
        <Sparkles className="size-9 text-gold" aria-hidden="true" />
        <h1 className="mt-5 font-display text-4xl font-bold sm:text-5xl">Trading Tips</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Read timely educational market observations from the BLACKPIPS desk in a private members
          feed.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Feature icon={Clock3} text="Fresh insights with clear publication timing" />
          <Feature icon={Images} text="Chart media and concise educational context" />
        </div>
        <Link
          to="/tips"
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-gold px-5 text-sm font-bold text-primary-foreground shadow-glow"
        >
          Open Trading Tips <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">Authentication is required.</p>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/45 p-4 text-sm">
      <Icon className="size-4 shrink-0 text-gold" aria-hidden="true" /> {text}
    </div>
  );
}
