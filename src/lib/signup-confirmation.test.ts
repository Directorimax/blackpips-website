import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CANONICAL_PRODUCTION_ORIGIN,
  getAuthCallbackUrl,
  getEmailConfirmationUrl,
} from "./auth-redirect";
import {
  classifySignupException,
  classifySignupResult,
  logSignupFailure,
} from "./signup-confirmation";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("email signup confirmation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts a new signup that is awaiting email confirmation", () => {
    expect(
      classifySignupResult(
        {
          session: null,
          user: { confirmation_sent_at: "2026-08-17T10:00:00Z", identities: [{}] },
        },
        null,
      ),
    ).toEqual({ status: "confirmation-accepted" });
  });

  it("reports provider/send failures without leaking the raw provider error", () => {
    const rawMessage = "SMTP 535 secret-provider-detail";
    const outcome = classifySignupResult(
      { session: null, user: null },
      { code: "email_address_not_authorized", message: rawMessage, status: 500 },
    );

    expect(outcome).toMatchObject({ status: "failed", category: "delivery-provider" });
    expect(JSON.stringify(outcome)).not.toContain(rawMessage);
  });

  it("reports email rate limits as a retryable failure", () => {
    expect(
      classifySignupResult(
        { session: null, user: null },
        { code: "over_email_send_rate_limit", status: 429 },
      ),
    ).toMatchObject({ status: "failed", category: "rate-limit" });
  });

  it("does not call an obfuscated duplicate signup a successful email send", () => {
    expect(
      classifySignupResult(
        { session: null, user: { confirmation_sent_at: null, identities: [] } },
        null,
      ),
    ).toMatchObject({ status: "failed", category: "possible-existing-account" });
  });

  it.each([
    ["email_exists", "already-registered"],
    ["user_already_exists", "already-registered"],
    ["email_address_invalid", "invalid-email"],
    ["signup_disabled", "signup-disabled"],
    ["email_provider_disabled", "signup-disabled"],
  ])("maps %s to a safe %s response", (code, category) => {
    const outcome = classifySignupException({ code, message: "raw internal Supabase detail" });
    expect(outcome).toMatchObject({ status: "failed", category });
    expect(outcome.message).not.toContain("Supabase");
    expect(outcome.message).not.toContain("raw internal");
  });

  it("logs only safe signup failure metadata", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = classifySignupException({
      code: "unexpected_failure",
      message: "password=NeverLogMe email=private@example.com",
      status: 500,
    });

    logSignupFailure(failure, {
      code: "unexpected_failure",
      message: "password=NeverLogMe email=private@example.com",
      status: 500,
    });

    const serializedArgs = JSON.stringify(error.mock.calls);
    expect(serializedArgs).toContain("unexpected_failure");
    expect(serializedArgs).not.toContain("NeverLogMe");
    expect(serializedArgs).not.toContain("private@example.com");
  });

  it("uses separate canonical OAuth and email-confirmation routes", () => {
    const authRoute = read("../routes/auth.index.tsx");
    const template = read("../../supabase/templates/confirmation.html");

    expect(getAuthCallbackUrl({ origin: "https://blackpips.com", hostname: "blackpips.com" })).toBe(
      `${CANONICAL_PRODUCTION_ORIGIN}/auth/callback`,
    );
    expect(CANONICAL_PRODUCTION_ORIGIN).toBe("https://www.blackpips.com");
    expect(
      getEmailConfirmationUrl({ origin: "https://blackpips.com", hostname: "blackpips.com" }),
    ).toBe(`${CANONICAL_PRODUCTION_ORIGIN}/auth/confirm`);
    expect(authRoute).toContain("emailRedirectTo: getEmailConfirmationUrl(window.location)");
    expect(authRoute).toContain('setMode("check-email")');
    expect(authRoute).toContain("Check your email");
    expect(template).toContain(
      "https://www.blackpips.com/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email",
    );
    expect(template).not.toContain("{{ .ConfirmationURL }}");
    expect(template).not.toContain("exchangeCodeForSession");
  });

  it("provides a rate-limited resend action without arbitrary-email input", () => {
    const authRoute = read("../routes/auth.index.tsx");

    expect(authRoute).toContain("supabase.auth.resend({");
    expect(authRoute).toContain('type: "signup"');
    expect(authRoute).toContain("email: pendingEmail");
    expect(authRoute).toContain("RESEND_COOLDOWN_SECONDS = 60");
    expect(authRoute).toContain("Verification email sent again.");
    expect(authRoute).toContain("Please wait before requesting another email.");
  });

  it("replaces the signup form with dedicated success and existing-account states", () => {
    const authRoute = read("../routes/auth.index.tsx");
    const checkEmailReturn = authRoute.indexOf('if (mode === "check-email" && pendingEmail)');
    const existingAccountReturn = authRoute.indexOf('if (mode === "existing-account"');
    const signupForm = authRoute.indexOf("<form onSubmit={handleSubmit}");

    expect(checkEmailReturn).toBeGreaterThan(-1);
    expect(existingAccountReturn).toBeGreaterThan(-1);
    expect(checkEmailReturn).toBeLessThan(signupForm);
    expect(existingAccountReturn).toBeLessThan(signupForm);
    expect(authRoute).toContain("We&apos;ve sent a verification link to:");
    expect(authRoute).toContain("{pendingEmail}");
    expect(authRoute).toContain("You’re already with BLACKPIPS");
  });

  it("preserves the submitted email for sign-in and password recovery but clears passwords", () => {
    const authRoute = read("../routes/auth.index.tsx");

    expect(authRoute).toContain('onClick={() => switchAuthMode("signin")}');
    expect(authRoute).toContain('onClick={() => switchAuthMode("forgot")}');
    expect(authRoute).toContain('setPassword("")');
    expect(authRoute).toContain('switchAuthMode("signup", { clearEmail: true })');
    expect(authRoute).toContain('setEmail("")');
  });
});
