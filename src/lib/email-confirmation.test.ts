import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { processEmailConfirmationRequest } from "./email-confirmation";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("SSR email confirmation", () => {
  it("verifies a valid token hash once and redirects to a clean dashboard URL", async () => {
    const verifyToken = vi.fn().mockResolvedValue({
      error: null,
      sessionEstablished: true,
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const afterVerification = vi.fn().mockResolvedValue(undefined);
    const response = await processEmailConfirmationRequest(
      new Request("https://www.blackpips.com/auth/confirm?token_hash=valid-token-hash&type=email"),
      { verifyToken, afterVerification },
    );

    expect(verifyToken).toHaveBeenCalledOnce();
    expect(verifyToken).toHaveBeenCalledWith("valid-token-hash");
    expect(afterVerification).toHaveBeenCalledOnce();
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/dashboard");
    expect(response?.headers.get("location")).not.toContain("token_hash");
    expect(response?.headers.get("cache-control")).toContain("no-store");
  });

  it("works without any PKCE verifier or originating-browser state", async () => {
    const verifyToken = vi.fn().mockResolvedValue({ error: null, sessionEstablished: true });
    const request = new Request(
      "https://www.blackpips.com/auth/confirm?token_hash=cross-device-token&type=email",
    );

    const response = await processEmailConfirmationRequest(request, { verifyToken });

    expect(request.headers.get("cookie")).toBeNull();
    expect(verifyToken).toHaveBeenCalledWith("cross-device-token");
    expect(response?.headers.get("location")).toBe("/dashboard");
  });

  it.each(["otp_expired", "otp_disabled", "same_password", "unexpected_failure"])(
    "uses the same safe failure redirect for %s",
    async (code) => {
      const response = await processEmailConfirmationRequest(
        new Request("https://www.blackpips.com/auth/confirm?token_hash=unusable&type=email"),
        {
          verifyToken: vi.fn().mockResolvedValue({
            error: { code, name: "AuthApiError", status: 403 },
          }),
        },
      );

      expect(response?.status).toBe(303);
      expect(response?.headers.get("location")).toBe("/auth/confirm?status=invalid");
      expect(response?.headers.get("location")).not.toContain(code);
    },
  );

  it.each([
    "https://www.blackpips.com/auth/confirm",
    "https://www.blackpips.com/auth/confirm?type=email",
    "https://www.blackpips.com/auth/confirm?token_hash=value&type=signup",
  ])("rejects a missing or malformed confirmation request: %s", async (url) => {
    const verifyToken = vi.fn();
    const response = await processEmailConfirmationRequest(new Request(url), { verifyToken });

    expect(verifyToken).not.toHaveBeenCalled();
    expect(response?.headers.get("location")).toBe("/auth/confirm?status=invalid");
  });

  it("renders the cleaned recovery URL without retrying a used token", async () => {
    const verifyToken = vi.fn();
    const response = await processEmailConfirmationRequest(
      new Request("https://www.blackpips.com/auth/confirm?status=invalid"),
      { verifyToken },
    );

    expect(response).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("does not redirect to the dashboard unless a session was established", async () => {
    const response = await processEmailConfirmationRequest(
      new Request("https://www.blackpips.com/auth/confirm?token_hash=no-session&type=email"),
      { verifyToken: vi.fn().mockResolvedValue({ error: null, sessionEstablished: false }) },
    );

    expect(response?.headers.get("location")).toBe("/auth/confirm?status=invalid");
  });

  it("turns an unexpected verification exception into the same safe recovery state", async () => {
    const response = await processEmailConfirmationRequest(
      new Request("https://www.blackpips.com/auth/confirm?token_hash=network-failure&type=email"),
      { verifyToken: vi.fn().mockRejectedValue(new Error("raw network provider detail")) },
    );

    expect(response?.headers.get("location")).toBe("/auth/confirm?status=invalid");
    expect(response?.headers.get("location")).not.toContain("provider");
  });

  it("uses the cookie-backed server client and never exposes raw verification errors", () => {
    const middleware = read("../integrations/supabase/session-middleware.ts");
    const serverClient = read("../integrations/supabase/server.ts");
    const recoveryPage = read("../routes/auth/confirm.tsx");

    expect(middleware).toContain("createSupabaseServerClient()");
    expect(middleware).toContain("supabase.auth.verifyOtp({");
    expect(middleware).toContain('type: "email"');
    expect(serverClient).toContain("setAll(cookiesToSet, headers)");
    expect(serverClient).toContain("setCookie(name, value, options)");
    expect(recoveryPage).toContain("Verification link expired or invalid");
    expect(recoveryPage).not.toContain("error.message");
    expect(recoveryPage).not.toContain("PKCE code verifier");
  });
});
