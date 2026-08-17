import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { z } from "zod";

import { DEFAULT_AUTH_DESTINATION, getSafeRedirect } from "@/lib/auth-redirect";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: z.object({
    status: z.enum(["recovery"]).optional(),
    redirect: z.string().optional(),
  }),
  head: () =>
    createSeoHead({
      title: "Completing sign-in",
      description: "Completing your BLACKPIPS sign-in.",
      path: "/auth/callback",
      noindex: true,
    }),
  component: AuthCallback,
});

function AuthCallback() {
  const { redirect } = Route.useSearch();
  const destination = getSafeRedirect(redirect) ?? DEFAULT_AUTH_DESTINATION;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16">
      <div className="glass w-full rounded-3xl p-8 text-center shadow-elegant">
        <AlertCircle className="mx-auto h-7 w-7 text-gold" />
        <h1 className="mt-4 font-display text-2xl font-bold">Please start sign-in again</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your sign-in session expired or was opened in a different browser. Please start sign-in
          again.
        </p>
        <Link
          to="/auth"
          search={{ redirect: destination }}
          replace
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Try Sign In Again
        </Link>
      </div>
    </div>
  );
}
