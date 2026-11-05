import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import {
  DEFAULT_AUTH_DESTINATION,
  getAuthCallbackUrl,
  getEmailConfirmationUrl,
  getSafeRedirect,
  rememberAuthRedirect,
} from "@/lib/auth-redirect";
import { createSeoHead } from "@/lib/seo";
import { clearSessionLifecycleStorage } from "@/lib/session-lifecycle";
import { Logo } from "@/components/Logo";
import appSignInScreen from "@/assets/app-signin-screen.jpg";
import appHomeScreen from "@/assets/app-home-screen.jpg";
import { AppleIcon, PlayIcon } from "@/components/bp/StoreIcons";
import {
  classifySignupException,
  classifySignupResult,
  logSignupFailure,
} from "@/lib/signup-confirmation";

type Mode =
  "signin" | "signup" | "forgot" | "check-email" | "existing-account" | "account-recovery";

const RESEND_COOLDOWN_SECONDS = 60;

export const Route = createFileRoute("/auth/")({
  validateSearch: z.object({
    redirect: z.string().optional(),
    mode: z.enum(["signin", "signup", "forgot"]).optional(),
  }),
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
  const { redirect, mode: requestedMode = "signin" } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(requestedMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { user, loading } = useAuth();
  const destination = getSafeRedirect(redirect) ?? DEFAULT_AUTH_DESTINATION;

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (!loading && user) navigate({ to: destination, replace: true });
  }, [destination, loading, navigate, user]);

  useEffect(() => {
    if (loading || user || redirect === undefined || getSafeRedirect(redirect)) return;
    navigate({
      to: "/auth",
      search: {
        redirect: undefined,
        mode: requestedMode === "signin" ? undefined : requestedMode,
      },
      replace: true,
    });
  }, [loading, navigate, redirect, requestedMode, user]);

  useEffect(() => {
    setPassword("");
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = window.setTimeout(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1_000,
    );
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  async function handleGoogle() {
    if (busy || googleLoading) return;
    setGoogleLoading(true);
    setBusy(true);
    try {
      rememberAuthRedirect(destination);
      clearSessionLifecycleStorage(window.localStorage);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl(window.location) },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google sign-in could not start:", error);
      toast.error("Google sign-in could not start. Please try again.");
      setBusy(false);
      setGoogleLoading(false);
    }
  }

  function presentSignupFailure(
    failure: Extract<ReturnType<typeof classifySignupException>, { status: "failed" }>,
    error?: unknown,
  ) {
    logSignupFailure(failure, error);
    if (
      failure.category === "already-registered" ||
      failure.category === "possible-existing-account"
    ) {
      setPassword("");
      setMode(failure.category === "already-registered" ? "existing-account" : "account-recovery");
      return;
    }
    toast.error(failure.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const em = emailSchema.parse(email);
        rememberAuthRedirect("/reset-password");
        const { error } = await supabase.auth.resetPasswordForEmail(em, {
          redirectTo: getAuthCallbackUrl(window.location),
        });
        if (error) throw error;
        toast.success("Reset link sent — check your inbox.");
        switchAuthMode("signin");
        return;
      }
      const em = emailSchema.parse(email);
      const pw = passwordSchema.parse(password);
      if (mode === "signup") {
        const nm = nameSchema.parse(name);
        clearSessionLifecycleStorage(window.localStorage);
        let signupResult;
        try {
          signupResult = await supabase.auth.signUp({
            email: em,
            password: pw,
            options: {
              emailRedirectTo: getEmailConfirmationUrl(window.location),
              data: { display_name: nm, full_name: nm },
            },
          });
        } catch (error) {
          const failure = classifySignupException(error);
          presentSignupFailure(failure, error);
          return;
        }

        const outcome = classifySignupResult(signupResult.data, signupResult.error);
        if (outcome.status === "failed") {
          presentSignupFailure(outcome, signupResult.error);
          return;
        }

        if (outcome.status === "signed-in") {
          const { data } = signupResult;
          if (!data.user) throw new Error("We could not create your account. Please try again.");
          toast.success("Welcome to BLACKPIPS.");
          navigate({ to: destination });
        } else {
          rememberAuthRedirect(destination);
          setPendingEmail(em);
          setPassword("");
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setMode("check-email");
        }
      } else {
        clearSessionLifecycleStorage(window.localStorage);
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
          : mode === "signup"
            ? classifySignupException(err).message
            : err instanceof Error
              ? err.message
              : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleResendVerification() {
    if (!pendingEmail || busy || resendCooldown > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: getEmailConfirmationUrl(window.location) },
      });
      if (error) {
        const failure = classifySignupException(error);
        logSignupFailure(failure, error);
        toast.error(
          failure.category === "rate-limit"
            ? "Please wait before requesting another email."
            : failure.message,
        );
        if (failure.category === "rate-limit") {
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        }
        return;
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Verification email sent again.");
    } catch (error) {
      const failure = classifySignupException(error);
      logSignupFailure(failure, error);
      toast.error(failure.message);
    } finally {
      setBusy(false);
    }
  }

  function switchAuthMode(
    nextMode: Extract<Mode, "signin" | "signup" | "forgot">,
    options: { clearEmail?: boolean } = {},
  ) {
    setPendingEmail(null);
    setPassword("");
    setResendCooldown(0);
    if (options.clearEmail) {
      setEmail("");
      setName("");
    }
    setMode(nextMode);
    void navigate({
      to: "/auth",
      search: { redirect, mode: nextMode },
    });
  }

  if (mode === "check-email" && pendingEmail) {
    return (
      <div className="bp bp-page auth-simple">
        <div className="page-bg" aria-hidden="true" />
        <div className="card auth-simple-card center">
          <Logo className="justify-center" />
          <MailCheck className="mx-auto mt-6 h-9 w-9 text-gold" />
          <h1 className="mt-4 font-display text-3xl font-bold">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We&apos;ve sent a verification link to:
          </p>
          <p className="mt-2 break-all font-semibold text-foreground">{pendingEmail}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Open the email and click Verify Email to activate your BLACKPIPS account.
          </p>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={busy || resendCooldown > 0}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend verification email"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => switchAuthMode("signup", { clearEmail: true })}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-accent/50 disabled:opacity-60"
          >
            Use a different email
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => switchAuthMode("signin")}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (mode === "existing-account" || mode === "account-recovery") {
    const confirmedExistingAccount = mode === "existing-account";
    return (
      <div className="bp bp-page auth-simple">
        <div className="page-bg" aria-hidden="true" />
        <div className="card auth-simple-card center">
          <Logo className="justify-center" />
          <h1 className="mt-6 font-display text-3xl font-bold">
            {confirmedExistingAccount ? "You’re already with BLACKPIPS" : "Continue with BLACKPIPS"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {confirmedExistingAccount
              ? "An account already exists for this email. Instead of creating another account, sign in to continue."
              : "We couldn’t start a new signup for this email. If you already have an account, sign in or reset your password to continue."}
          </p>

          <button
            type="button"
            onClick={() => switchAuthMode("signin")}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchAuthMode("forgot")}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-accent/50"
          >
            Forgot password?
          </button>
          <button
            type="button"
            onClick={() => switchAuthMode("signup", { clearEmail: true })}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
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
    <div className="bp bp-page auth-page">
      <div className="auth">
        <aside className="auth-brand">
          <div className="auth-intro">
            <span className="auth-intro-tag">BLACKPIPS app</span>
            <h2 className="auth-intro-title">
              One account. <span className="gold-text">Web and app.</span>
            </h2>
            <p className="auth-intro-text">
              Buy lessons and use the tools here. Watch your lessons and keep your streak in the
              BLACKPIPS app.
            </p>
            <div className="auth-intro-store">
              <a className="btn btn-gold" href="/#app">
                <AppleIcon /> App Store
              </a>
              <a className="btn btn-ghost" href="/#app">
                <PlayIcon /> Google Play
              </a>
            </div>
          </div>
          <div className="auth-show">
            <div className="auth-shots">
              <div className="auth-mock back" aria-hidden="true">
                <img src={appHomeScreen} alt="" />
              </div>
              <div className="auth-mock front" aria-hidden="true">
                <img src={appSignInScreen} alt="" />
              </div>
              <a className="auth-float auth-float-a" href="/#app">
                <AppleIcon />
                <span>
                  <small>Download on the</small>App Store
                </span>
              </a>
              <a className="auth-float auth-float-b" href="/#app">
                <PlayIcon />
                <span>
                  <small>Get it on</small>Google Play
                </span>
              </a>
            </div>
          </div>
        </aside>

        <main className="auth-form">
          <div className="formbox rise">
            {mode !== "forgot" && (
              <div
                className="seg"
                role="tablist"
                aria-label="Account"
                style={{ alignSelf: "flex-start" }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  disabled={busy}
                  className={`seg-btn ${mode === "signin" ? "on" : ""}`}
                  onClick={() => switchAuthMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  disabled={busy}
                  className={`seg-btn ${mode === "signup" ? "on" : ""}`}
                  onClick={() => switchAuthMode("signup")}
                >
                  Create account
                </button>
              </div>
            )}
            <div>
              <h1 className="h2" style={{ fontSize: "clamp(30px, 3vw, 38px)" }}>
                {title}
              </h1>
              <p className="body" style={{ marginTop: 8 }}>
                {sub}
              </p>
            </div>

            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy || googleLoading}
                  className="social"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  {googleLoading ? "Connecting to Google…" : "Continue with Google"}
                </button>
                <div className="or">OR WITH EMAIL</div>
              </>
            )}

            <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
              {mode === "signup" && (
                <label className="field">
                  <span className="label">Full name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                    required
                    maxLength={80}
                    autoComplete="name"
                    className="input"
                    placeholder="Jane Trader"
                  />
                </label>
              )}
              <label className="field">
                <span className="label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="you@email.com"
                />
              </label>
              {mode !== "forgot" && (
                <label className="field">
                  <span className="between">
                    <span className="label">Password</span>
                    {mode === "signin" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => switchAuthMode("forgot")}
                        className="text-link"
                      >
                        Forgot password?
                      </button>
                    )}
                  </span>
                  <span className="pw">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      required
                      minLength={8}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      className="input"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      disabled={busy}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </span>
                </label>
              )}

              <button type="submit" disabled={busy} className="btn btn-gold btn-lg btn-block">
                {busy && <Loader2 className="animate-spin" />}
                {busy
                  ? mode === "signup"
                    ? "Creating account…"
                    : mode === "forgot"
                      ? "Sending reset link…"
                      : "Signing in…"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Sign in"}
              </button>
            </form>

            <p className="small center">
              {mode === "forgot" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => switchAuthMode("signin")}
                  className="text-link"
                >
                  Back to sign in
                </button>
              )}
            </p>
            <p className="small center" style={{ fontSize: 12 }}>
              By continuing you agree to our{" "}
              <Link to="/privacy-policy" style={{ textDecoration: "underline" }}>
                terms and privacy policy
              </Link>
              .
            </p>
          </div>
        </main>
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
