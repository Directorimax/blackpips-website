import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ_GROUPS } from "@/lib/site-data";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ - BLACKPIPS" },
      {
        name: "description",
        content:
          "Frequently asked questions about BLACKPIPS courses, payments, mentorship, trading education and support.",
      },
      { property: "og:title", content: "BLACKPIPS FAQ" },
      { property: "og:description", content: "Courses, payments, mentorship and support." },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <header className="text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Help
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
          Frequently asked questions
        </h1>
      </header>

      <div className="mt-12 space-y-10">
        {FAQ_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="font-display text-2xl font-semibold">{group.title}</h2>
            <div className="mt-4 space-y-3">
              {group.items.map((item) => (
                <FaqRow key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="font-display text-base font-semibold">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-muted-foreground">{a}</div>}
    </div>
  );
}
