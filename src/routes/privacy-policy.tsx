import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { createSeoHead } from "@/lib/seo";
import { SITE } from "@/lib/site-data";

export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    createSeoHead({
      title: "Privacy Policy",
      description:
        "How BLACK PIPS processes and protects account, learning, payment and support information.",
      path: "/privacy-policy",
    }),
  component: PrivacyPolicyPage,
});

const sections = [
  {
    title: "Information we process",
    body: (
      <>
        <p>Depending on the features you use, BLACK PIPS may process:</p>
        <ul>
          <li>your name, email address, phone number and authentication information;</li>
          <li>profile details such as username, biography, country, timezone and profile image;</li>
          <li>
            course purchases, access decisions, lesson progress, resume position and bookmarks;
          </li>
          <li>
            verified lesson activity, including active study time, completion records and related
            learning statistics;
          </li>
          <li>
            mentorship applications, programme selections and information you submit with them;
          </li>
          <li>certificates, certificate numbers and completion information;</li>
          <li>
            payment-submission information, including payment method, provider reference and proof
            images you choose to upload;
          </li>
          <li>ALC access requests and verification proof images you choose to upload;</li>
          <li>
            information you choose to save in supported tools, including trading-journal entries,
            trading-plan preferences and optional journal screenshots;
          </li>
          <li>support communications you send to us; and</li>
          <li>
            notification device tokens and confirmed protected-content security events where those
            features are enabled.
          </li>
        </ul>
        <p>
          Photo-library access is requested only when you choose an image for a supported upload.
          Screen Lock uses the security configured on your device; BLACK PIPS does not store a
          separate app-lock PIN or password.
        </p>
      </>
    ),
  },
  {
    title: "How we use information",
    body: (
      <p>
        We use this information to create and authenticate accounts, provide the learning access you
        are entitled to, save progress and preferences, review payments and applications, issue and
        verify certificates, deliver support and notifications, maintain service reliability, and
        protect educational material and accounts from unauthorized use.
      </p>
    ),
  },
  {
    title: "Service providers and disclosures",
    body: (
      <>
        <p>BLACK PIPS uses service providers only where required to operate a feature:</p>
        <ul>
          <li>
            our Supabase/Postgres and Storage infrastructure provides account authentication,
            application data and private file storage;
          </li>
          <li>Google Firebase Cloud Messaging may deliver mobile push notifications;</li>
          <li>YouTube processes requests when you load or play embedded YouTube videos; and</li>
          <li>
            Resend may deliver transactional or service emails initiated through our services.
          </li>
        </ul>
        <p>
          Payment details and proof submissions may also identify the payment method or provider you
          selected. BLACK PIPS does not sell personal information. Information may be disclosed when
          required by law, to protect users or the service, or to the providers above under their
          applicable terms and privacy practices.
        </p>
      </>
    ),
  },
  {
    title: "Notifications and device information",
    body: (
      <p>
        If you enable notifications, the app may register a device push token and use it to send
        learning, account or service updates. You can change notification permission in your device
        settings. Basic technical and security information may be processed to diagnose failures,
        enforce protected-content rules and keep authenticated sessions secure. We did not identify
        a separate advertising or behavioural-analytics system in the current app.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        Private learning media, profile images and verification material use authenticated access,
        access controls and temporary signed links where applicable. We use reasonable technical and
        organizational safeguards, but no internet or storage system can be guaranteed completely
        secure. Keep your credentials private and contact us if you suspect unauthorized access.
      </p>
    ),
  },
  {
    title: "Retention",
    body: (
      <p>
        We keep information for as long as needed to provide your account and learning services,
        maintain legitimate business and security records, resolve disputes, and meet legal or
        financial obligations. Retention can differ by record type. Temporary signed links expire,
        but the authorized underlying record or private file may remain while it is required for the
        feature or applicable record-keeping purpose.
      </p>
    ),
  },
  {
    title: "Your choices and rights",
    body: (
      <p>
        You may update supported profile information in the app and control photo and notification
        permissions through your device. You may also ask to access, correct or delete personal
        information by emailing us. A request may require identity verification, and some records
        may be retained where required for security, financial, legal or dispute-resolution
        purposes. Availability of a particular request depends on applicable requirements and the
        records involved.
      </p>
    ),
  },
  {
    title: "Account and data deletion",
    body: (
      <p>
        The current app does not provide an instant self-service deletion button. To request
        deletion of your BLACK PIPS account and associated personal data, email{" "}
        <a
          className="font-medium text-gold underline-offset-4 hover:underline"
          href={`mailto:${SITE.email}?subject=Account%20deletion%20request`}
        >
          {SITE.email}
        </a>{" "}
        from the address connected to your account and state that you want your account deleted. We
        will verify the request, explain any information that must be retained, and process eligible
        account data. Removing the app from a device does not itself delete the account. You can
        start this process from our{" "}
        <Link
          className="font-medium text-gold underline-offset-4 hover:underline"
          to="/delete-account"
        >
          account deletion page
        </Link>
        .
      </p>
    ),
  },
  {
    title: "Children's privacy",
    body: (
      <p>
        The current service does not use personal information to target advertising to children. If
        you believe a child has submitted personal information without appropriate authorization,
        contact us so we can review the account and take appropriate action. This statement does not
        create an age rule that is not otherwise presented during account creation or required by
        applicable law.
      </p>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy when the service, providers or legal requirements change. The
        current version and effective date will remain available on this page. Material changes may
        also be communicated through the app or other appropriate channels.
      </p>
    ),
  },
] as const;

function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Legal
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          This policy explains how BLACK PIPS processes information through its website and mobile
          application.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Effective 15 September 2026</p>
      </header>

      <div className="glass mt-10 rounded-3xl p-5 sm:p-8">
        <div className="space-y-9">
          {sections.map((section) => (
            <section key={section.title} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold sm:text-2xl">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-gold/25 bg-gold/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Mail className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-semibold">Privacy questions or requests</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Email{" "}
              <a className="text-gold hover:underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>{" "}
              or visit our{" "}
              <Link className="text-gold hover:underline" to="/contact">
                contact page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
