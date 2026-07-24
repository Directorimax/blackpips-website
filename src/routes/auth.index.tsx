import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { sendNotification } from "@/services/email/notification.functions";
import {
  DEFAULT_AUTH_DESTINATION,
  getSafeRedirect,
  rememberAuthRedirect,
} from "@/lib/auth-redirect";
import { createSeoHead } from "@/lib/seo";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth/")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () =>
    createSeoHead({
      title: "Sign in",
      description: "Sign in or create your BLACKPIPS account.",
      path: "/auth",
      noindex: true,
    }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Minimum 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Enter your name").max(80);

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const destination = getSafeRedirect(redirect) ?? DEFAULT_AUTH_DESTINATION;

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (!loading && user) navigate({ to: destination, replace: true });
  }, [destination, loading, navigate, user]);

  async function handleGoogle() {
    setBusy(true);
    try {
      rememberAuthRedirect(destination);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google sign-in could not start:", error);
      toast.error(error instanceof Error ? error.message : "Google sign-in could not start.");
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const em = emailSchema.parse(email);
        const { error } = await supabase.auth.resetPasswordForEmail(em, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent — check your inbox.");
        setMode("signin");
        return;
      }
      const em = emailSchema.parse(email);
      const pw = passwordSchema.parse(password);
      if (mode === "signup") {
        const nm = nameSchema.parse(name);
        const { data, error } = await supabase.auth.signUp({
          email: em,
          password: pw,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { display_name: nm, full_name: nm },
          },
        });
        if (error) throw error;
        if (data.session) {
          if (!data.user) throw new Error("We could not create your account. Please try again.");
          void sendNotification({ data: { type: "welcome", resourceId: data.user.id } }).catch(
            (error) => console.error("Welcome notification could not be queued:", error),
          );
          toast.success("Welcome to BLACKPIPS.");
          navigate({ to: destination });
        } else {
          rememberAuthRedirect(destination);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
        if (!data.session)
          throw new Error("We could not establish your session. Please try again.");
        await supabase.auth.getSession();
        navigate({ to: destination });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "forgot"
        ? "Reset your password"
        : "Welcome back";
  const sub =
    mode === "signup"
      ? "Start learning the ALC framework in minutes."
      : mode === "forgot"
        ? "We'll email you a secure link to set a new password."
        : "Sign in to continue where you left off.";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16">
      <div className="glass w-full rounded-3xl p-8 shadow-elegant">
        <div className="text-center">
          <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
            BLACKPIPS
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
        </div>

        {mode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-accent/50 disabled:opacity-60"
            >
              <GoogleIcon /> Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Full name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="Jane Trader"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-gold/40">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-transparent text-sm outline-none"
                placeholder="you@email.com"
              />
            </div>
          </label>
          {mode !== "forgot" && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Password
              </span>
              <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-gold/40">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-1 text-xs text-muted-foreground">
          {mode === "signin" && (
            <>
              <button onClick={() => setMode("forgot")} className="hover:text-foreground">
                Forgot password?
              </button>
              <div>
                New here?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold text-gold hover:underline"
                >
                  Create an account
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                className="font-semibold text-gold hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("signin")} className="hover:text-foreground">
              Back to sign in
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/" className="underline">
            terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-2 14-5.4l-6.5-5.5c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5c4-3.7 6.5-9.2 6.5-15.5 0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
