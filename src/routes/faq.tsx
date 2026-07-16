import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — BlackPips" },
      { name: "description", content: "Frequently asked questions about payments, courses, mentorship, accounts and technical support at BlackPips." },
      { property: "og:title", content: "BlackPips FAQ" },
      { property: "og:description", content: "Payments, courses, mentorship, accounts and support." },
    ],
  }),
  component: FaqPage,
});

const GROUPS = [
  {
    title: "Payments",
    items: [
      { q: "Which methods do you accept?", a: "Visa, Mastercard, Apple Pay and Google Pay via Stripe. Mobile Money is available in selected regions." },
      { q: "Is my payment secure?", a: "All payments run through PCI-compliant infrastructure with signed URLs and encrypted delivery — we never store card data." },
      { q: "Do I get an invoice?", a: "Yes — a receipt and invoice are emailed automatically on every successful purchase." },
    ],
  },
  {
    title: "Courses",
    items: [
      { q: "How is access delivered?", a: "Instantly after payment. Your dashboard unlocks the course in seconds — no manual approval." },
      { q: "Can I download videos?", a: "No. Videos stream through a secure player to protect the curriculum, but you can resume anywhere on any device." },
      { q: "Do you offer certificates?", a: "Certificates are on the roadmap and will be issued automatically once available." },
    ],
  },
  {
    title: "Mentorship",
    items: [
      { q: "How is mentorship delivered?", a: "Structured video modules plus a private community and mentor Q&A. See the Mentorship page for the full outline." },
      { q: "Can I upgrade tiers later?", a: "Yes — you only pay the price difference when upgrading between Regular, Advanced and Masterclass." },
    ],
  },
  {
    title: "Account",
    items: [
      { q: "Can I use my account on multiple devices?", a: "Yes. Simultaneous sessions are limited to protect content — new logins terminate old ones automatically." },
      { q: "How do I reset my password?", a: "Use the Forgot Password link on the login page — a reset email arrives within a minute." },
    ],
  },
  {
    title: "Technical Support",
    items: [
      { q: "A video won't play — what now?", a: "Refresh, then try a different browser (Chrome or Safari latest). If it still fails, message the desk with your device and browser." },
      { q: "I never received my confirmation email", a: "Check spam, then contact us — we'll resend and manually verify the enrollment." },
    ],
  },
];

function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <header className="text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Help</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Frequently asked questions</h1>
      </header>

      <div className="mt-12 space-y-10">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-2xl font-semibold">{g.title}</h2>
            <div className="mt-4 space-y-3">
              {g.items.map((it, i) => <FaqRow key={i} q={it.q} a={it.a} />)}
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
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span className="font-display text-base font-semibold">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-muted-foreground">{a}</div>}
    </div>
  );
}
