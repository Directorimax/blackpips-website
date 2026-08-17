import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: z.object({ status: z.literal("invalid").optional() }),
  head: () =>
    createSeoHead({
      title: "Email verification",
      description: "Verify your BLACKPIPS email address.",
      path: "/auth/confirm",
      noindex: true,
    }),
  component: EmailConfirmationFailure,
});

function EmailConfirmationFailure() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16">
      <div className="glass w-full rounded-3xl p-8 text-center shadow-elegant">
        <Logo className="justify-center" />
        <AlertCircle className="mx-auto mt-6 h-8 w-8 text-gold" />
        <h1 className="mt-4 font-display text-2xl font-bold">
          Verification link expired or invalid
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This verification link can no longer be used. Return to sign in, or create your account
          again to request a new verification email.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
