import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, Instagram, Youtube, Send, Clock } from "lucide-react";
import { SITE } from "@/lib/site-data";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact BlackPips" },
      { name: "description", content: "Reach the BlackPips desk. WhatsApp, email, Instagram, YouTube, Telegram — or send us a message." },
      { property: "og:title", content: "Contact BlackPips" },
      { property: "og:description", content: "We reply within one business day." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Contact</div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Talk to the desk</h1>
        <p className="mt-3 text-muted-foreground">We reply within one business day. For instant answers, WhatsApp is fastest.</p>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass rounded-3xl p-8">
          {sent ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="text-gradient-gold font-display text-3xl font-bold">Message received</div>
              <p className="mt-2 text-sm text-muted-foreground">We'll get back to you within one business day.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              className="grid gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
              </div>
              <Field label="Subject" name="subject" />
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Message</span>
                <textarea rows={6} required className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/60" />
              </label>
              <button className="mt-2 justify-self-start rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">Send message</button>
            </form>
          )}
        </div>

        <aside className="space-y-3">
          <a href={SITE.whatsapp} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
            <IconChip><MessageCircle className="h-4 w-4" /></IconChip>
            <div><div className="text-sm font-semibold">WhatsApp</div><div className="text-xs text-muted-foreground">Fastest reply</div></div>
          </a>
          <a href={`mailto:${SITE.email}`} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
            <IconChip><Mail className="h-4 w-4" /></IconChip>
            <div><div className="text-sm font-semibold">Email</div><div className="text-xs text-muted-foreground">{SITE.email}</div></div>
          </a>
          <a href={SITE.instagram} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
            <IconChip><Instagram className="h-4 w-4" /></IconChip>
            <div><div className="text-sm font-semibold">Instagram</div><div className="text-xs text-muted-foreground">@blackpips</div></div>
          </a>
          <a href={SITE.youtube} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
            <IconChip><Youtube className="h-4 w-4" /></IconChip>
            <div><div className="text-sm font-semibold">YouTube</div><div className="text-xs text-muted-foreground">Free lessons</div></div>
          </a>
          <a href={SITE.telegram} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
            <IconChip><Send className="h-4 w-4" /></IconChip>
            <div><div className="text-sm font-semibold">Telegram</div><div className="text-xs text-muted-foreground">Community</div></div>
          </a>
          <div className="glass flex items-center gap-3 rounded-2xl p-4">
            <IconChip><Clock className="h-4 w-4" /></IconChip>
            <div><div className="text-sm font-semibold">Hours</div><div className="text-xs text-muted-foreground">Mon–Fri · 09:00–18:00 UTC</div></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input name={name} type={type} required={required} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/60" />
    </label>
  );
}

function IconChip({ children }: { children: React.ReactNode }) {
  return <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-gold text-primary-foreground shadow-glow">{children}</span>;
}
