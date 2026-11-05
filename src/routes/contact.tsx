import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, Lock, Mail, MessageCircle, Send } from "lucide-react";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";
import { AvailabilityAwareContactLink } from "@/components/contact/AvailabilityAwareContactLink";
import { ContactAvailabilityPanel } from "@/components/contact/ContactAvailabilityPanel";
import { useContactAvailability } from "@/hooks/useContactAvailability";

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
  const availability = useContactAvailability();
  const closed = availability.isReady && !availability.isOpen;
  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      <section style={{ padding: "32px 0 96px" }}>
        <div className="wrap">
          <div className="orbit rise">
            <div className="orbit-in split contact-grid">
              <div className="stack" style={{ gap: 16 }}>
                <span className="eyebrow" style={{ alignSelf: "flex-start" }}>
                  <span className="tag">Contact</span> Talk to the desk
                </span>
                <h1 className="h1" style={{ fontSize: "clamp(34px, 4.6vw, 56px)" }}>
                  Talk to the BLACKPIPS team.
                </h1>
                <p className="lead">
                  We reply within one business day. For instant answers, WhatsApp is fastest.
                </p>
                <p className="small">
                  Questions about lessons, payments, ALC Access or mentorship — we're here. Looking
                  for quick answers?{" "}
                  <Link to="/faq" className="gold">
                    Read the FAQ
                  </Link>
                  .
                </p>
              </div>
              <div className="stack" style={{ gap: 12 }}>
                {closed && (
                  <div className="contact-closed" role="status">
                    <Lock aria-hidden="true" />
                    <span>
                      <b>The desk is closed right now.</b> {availability.transitionLabel}.
                    </span>
                  </div>
                )}
                <Channel
                  href={SITE.whatsapp}
                  title="WhatsApp"
                  body="Fastest reply"
                  solid
                  closedNote={closed ? availability.transitionLabel : undefined}
                >
                  <MessageCircle aria-hidden="true" />
                </Channel>
                <Channel
                  href={`mailto:${SITE.email}`}
                  title="Email"
                  body={SITE.email}
                  closedNote={closed ? availability.transitionLabel : undefined}
                >
                  <Mail aria-hidden="true" />
                </Channel>
                <Channel
                  href={SITE.instagram}
                  title="Instagram"
                  body="@blackpips"
                  closedNote={closed ? availability.transitionLabel : undefined}
                >
                  <Instagram aria-hidden="true" />
                </Channel>
                <Channel
                  href={SITE.telegram}
                  title="Telegram"
                  body="t.me/blackpips"
                  closedNote={closed ? availability.transitionLabel : undefined}
                >
                  <Send aria-hidden="true" />
                </Channel>
              </div>
            </div>
          </div>
          <ContactAvailabilityPanel />
        </div>
      </section>
    </div>
  );
}

function Channel({
  href,
  title,
  body,
  solid = false,
  closedNote,
  children,
}: {
  href: string;
  title: string;
  body: string;
  solid?: boolean;
  closedNote?: string;
  children: ReactNode;
}) {
  return (
    <AvailabilityAwareContactLink href={href} className="channel">
      <span className={`ico ${solid ? "ico-solid" : ""}`}>{children}</span>
      <span className="stack" style={{ flex: 1, minWidth: 0 }}>
        <span className="h4">{title}</span>
        <span className="small" style={{ overflowWrap: "anywhere" }}>
          {closedNote ?? body}
        </span>
      </span>
      {closedNote && <Lock className="channel-lock" aria-hidden="true" />}
    </AvailabilityAwareContactLink>
  );
}
