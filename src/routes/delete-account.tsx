import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";
import { createSeoHead } from "@/lib/seo";
import { SITE } from "@/lib/site-data";

const deletionEmail = `mailto:${SITE.email}?subject=${encodeURIComponent(
  "BLACK PIPS Account Deletion Request",
)}&body=${encodeURIComponent(`Hello BLACK PIPS Support,

I would like to request deletion of my BLACK PIPS account and associated eligible personal data.

Registered email:

Please let me know if any additional verification is required.`)}`;

export const Route = createFileRoute("/delete-account")({
  head: () =>
    createSeoHead({
      title: "Delete Your BLACK PIPS Account",
      description: "How to request deletion of your BLACK PIPS account and eligible personal data.",
      path: "/delete-account",
    }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Account management
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
          Delete Your BLACK PIPS Account
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          You may request deletion of your BLACK PIPS account and eligible personal data associated
          with it. This is a reviewed support process and does not delete an account instantly.
        </p>
      </header>

      <section className="glass mx-auto mt-10 max-w-3xl rounded-3xl p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">
              Before you request deletion
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              <p>
                Account deletion covers your BLACK PIPS account and eligible personal data linked to
                it. Some information may need to be retained where legitimately required for
                security, fraud prevention, financial, legal, or regulatory obligations.
              </p>
              <p>
                Uninstalling the BLACK PIPS app does not delete your account. We may need to verify
                your identity before completing a deletion request.
              </p>
              <p>
                Where possible, send the request from the email address registered to your BLACK
                PIPS account. Support will let you know if further verification is required.
              </p>
            </div>
          </div>
        </div>

        <a
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 sm:w-auto"
          href={deletionEmail}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Request Account Deletion
        </a>

        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          For details about how BLACK PIPS processes and retains information, read our{" "}
          <Link
            className="font-medium text-gold underline-offset-4 hover:underline"
            to="/privacy-policy"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
