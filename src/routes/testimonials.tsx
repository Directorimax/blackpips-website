import { createFileRoute } from "@tanstack/react-router";
import { Star, Quote } from "lucide-react";
import { TESTIMONIALS_DATA } from "@/lib/site-data";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials — BlackPips Students" },
      { name: "description", content: "Real stories from BlackPips students — prop firm funded, full-time and part-time traders using the ALC strategy." },
      { property: "og:title", content: "BlackPips Testimonials" },
      { property: "og:description", content: "What our students say about the ALC framework." },
    ],
  }),
  component: TPage,
});

function TPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Testimonials</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Real students. Real screens.</h1>
        <div className="mt-4 inline-flex items-center gap-2">
          <div className="flex text-gold">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
          <span className="text-sm font-semibold">4.9 / 5</span>
          <span className="text-sm text-muted-foreground">from 1,200+ students</span>
        </div>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {TESTIMONIALS_DATA.map((t) => (
          <figure key={t.name} className="glass relative rounded-3xl p-8">
            <Quote className="absolute right-6 top-6 h-8 w-8 text-gold/40" />
            <blockquote className="font-display text-lg leading-relaxed">"{t.quote}"</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-gold text-primary-foreground font-bold shadow-glow">
                {t.name[0]}
              </div>
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
