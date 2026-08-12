import { Link } from "@tanstack/react-router";
import { Clock3, LayoutDashboard } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 pb-16 pt-28">
      <section className="w-full max-w-lg rounded-3xl border border-gold/25 bg-card p-8 text-center shadow-elegant sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
          <Clock3 className="h-6 w-6" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Coming soon
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
        <Link
          to="/dashboard"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <LayoutDashboard className="h-4 w-4" /> Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
