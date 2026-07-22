import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password — BLACKPIPS" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPassword,
});

const pw = z.string().min(8, "Minimum 8 characters").max(72);

function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const passwordValidation = password ? pw.safeParse(password).error?.issues[0]?.message : null;
  const passwordsDoNotMatch = Boolean(confirmPassword) && password !== confirmPassword;
  const canSubmit =
    !recovering &&
    !recoveryError &&
    !busy &&
    Boolean(password) &&
    Boolean(confirmPassword) &&
    !passwordValidation &&
    !passwordsDoNotMatch;

  useEffect(() => {
    let active = true;

    async function recoverPasswordSession() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const callbackError =
          params.get("error_description") ??
          params.get("error") ??
          hashParams.get("error_description") ??
          hashParams.get("error");

        if (callbackError) {
          throw new Error(callbackError);
        }

        const code = params.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }

          // Remove the one-time recovery code from the visible URL.
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          // Supports legacy/implicit recovery links if Supabase returns tokens in the hash.
          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (setSessionError) {
              throw setSessionError;
            }

            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error(
            "This password reset link is invalid, expired, or has already been used. Please request a new one.",
          );
        }

        if (active) {
          setRecoveryError(null);
        }
      } catch (error) {
        console.error("[auth] Password recovery session failed", error);

        if (active) {
          setRecoveryError(
            error instanceof Error
              ? error.message
              : "We could not verify your password reset link.",
          );
        }
      } finally {
        if (active) {
          setRecovering(false);
        }
      }
    }

    void recoverPasswordSession();

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (recovering || recoveryError) return;

    setBusy(true);

    try {
      const parsedPassword = pw.parse(password);

      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!data.session) {
        throw new Error(
          "Your password reset session has expired. Please request a new reset link.",
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: parsedPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully.");
      setPassword("");
      setConfirmPassword("");

      // End the temporary recovery session so the learner signs in normally.
      await supabase.auth.signOut();

      navigate({ to: "/auth", replace: true });
    } catch (err) {
      console.error("[auth] Password update failed", err);
      toast.error(
        err instanceof z.ZodError
          ? (err.issues[0]?.message ?? "Invalid password.")
          : "We could not update your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-16">
      <form onSubmit={onSubmit} className="glass w-full rounded-3xl p-8 shadow-elegant">
        {recovering ? (
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
            <h1 className="mt-4 font-display text-2xl font-bold">Verifying reset link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we secure your recovery session.
            </p>
          </div>
        ) : recoveryError ? (
          <div className="text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">
              Reset link could not be verified
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{recoveryError}</p>

            <button
              type="button"
              onClick={() => navigate({ to: "/auth", replace: true })}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Return to sign in
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">Set a new password</h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Choose something at least 8 characters long.
            </p>

            <label className="mt-6 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                New password
              </span>

              <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-gold/40">
                <Lock className="h-4 w-4 text-muted-foreground" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
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
              {passwordValidation && (
                <p className="mt-1.5 text-xs text-destructive">{passwordValidation}</p>
              )}
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Confirm password
              </span>
              <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-gold/40">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordsDoNotMatch && (
                <p className="mt-1.5 text-xs text-destructive">Passwords do not match.</p>
              )}
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </>
        )}
      </form>
    </div>
  );
}
