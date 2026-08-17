import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { createSeoHead } from "@/lib/seo";
import { PRIORITY_DESTINATIONS } from "@/lib/site-data";

export const Route = createFileRoute("/tools/")({
  head: () =>
    createSeoHead({
      title: "Forex Trading Tools",
      description:
        "Explore BLACKPIPS tools for journaling, market sessions, pip calculations, trading insights and structured planning.",
      path: "/tools",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
      ],
    }),
  component: ToolsIndexPage,
});

function ToolsIndexPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">BLACKPIPS Tools</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Trading tools</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Practical workspaces for preparing, reviewing and improving your trading process.
        </p>
      </header>
      <section aria-label="BLACKPIPS trading tools" className="mt-10 grid gap-4 md:grid-cols-2">
        {PRIORITY_DESTINATIONS.map((destination) => (
          <Link
            key={destination.to}
            to={destination.to}
            className="group rounded-2xl border border-border bg-card p-5 shadow-elegant transition hover:-translate-y-0.5 hover:border-gold/35"
          >
            <span className="font-display text-lg font-bold group-hover:text-gold">
              {destination.label}
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              {destination.description}
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-gold">
              Explore {destination.label} <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
