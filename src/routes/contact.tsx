import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Instagram } from "lucide-react";
import { SITE } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";
import { AvailabilityAwareContactLink } from "@/components/contact/AvailabilityAwareContactLink";
import { ContactAvailabilityPanel } from "@/components/contact/ContactAvailabilityPanel";

export const Route = createFileRoute("/contact")({
  head: () =>
    createSeoHead({
      title: "Contact BLACKPIPS",
      description:
        "Contact the BLACKPIPS team for help with your account, payment, education or learning access.",
      path: "/contact",
    }),
  component: Contact,
});

function Contact() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Contact
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Talk to the desk</h1>
        <p className="mt-3 text-muted-foreground">
          We reply within one business day. For instant answers, WhatsApp is fastest.
        </p>
      </header>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AvailabilityAwareContactLink
          href={SITE.whatsapp}
          className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 sm:min-h-24"
        >
          <IconChip>
            <MessageCircle className="h-4 w-4" />
          </IconChip>
          <div className="min-w-0">
            <div className="text-sm font-semibold">WhatsApp</div>
            <div className="text-xs text-muted-foreground">Fastest reply</div>
          </div>
        </AvailabilityAwareContactLink>
        <AvailabilityAwareContactLink
          href={`mailto:${SITE.email}`}
          className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 sm:min-h-24"
        >
          <IconChip>
            <Mail className="h-4 w-4" />
          </IconChip>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Email</div>
            <div className="break-words text-xs text-muted-foreground">{SITE.email}</div>
          </div>
        </AvailabilityAwareContactLink>
        <AvailabilityAwareContactLink
          href={SITE.instagram}
          className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 sm:col-span-2 sm:min-h-24 sm:w-[calc(50%-0.5rem)] sm:justify-self-center lg:col-span-1 lg:w-full"
        >
          <IconChip>
            <Instagram className="h-4 w-4" />
          </IconChip>
          <div>
            <div className="text-sm font-semibold">Instagram</div>
            <div className="text-xs text-muted-foreground">@blackpips</div>
          </div>
        </AvailabilityAwareContactLink>
      </div>
      <ContactAvailabilityPanel />
    </div>
  );
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-gold text-primary-foreground shadow-glow">
      {children}
    </span>
  );
}
