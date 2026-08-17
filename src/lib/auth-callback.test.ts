import { describe, expect, it, vi } from "vitest";

import { createRecoveryLocation, processAuthCallbackRequest } from "./auth-callback";

describe("Supabase PKCE callback", () => {
  it("exchanges a successful code once and redirects to the intended page", async () => {
    const exchangeCode = vi.fn().mockResolvedValue({
      error: null,
      redirectType: null,
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const afterExchange = vi.fn().mockResolvedValue(undefined);
    const response = await processAuthCallbackRequest(
      new Request("https://blackpips.com/auth/callback?code=single-use-code&sb_flow_id=flow12345"),
      { exchangeCode, intendedDestination: "/dashboard/trading-plan", afterExchange },
    );

    expect(exchangeCode).toHaveBeenCalledOnce();
    expect(exchangeCode).toHaveBeenCalledWith("single-use-code", "flow12345");
    expect(afterExchange).toHaveBeenCalledOnce();
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/dashboard/trading-plan");
  });

  it("turns a missing verifier into a safe recovery redirect", async () => {
    const exchangeCode = vi.fn().mockResolvedValue({
      error: { code: "flow_state_not_found", message: "PKCE code verifier not found" },
    });
    const response = await processAuthCallbackRequest(
      new Request("https://blackpips.com/auth/callback?code=expired"),
      { exchangeCode, intendedDestination: "/dashboard" },
    );

    expect(exchangeCode).toHaveBeenCalledOnce();
    expect(response?.headers.get("location")).toBe(
      "/auth/callback?status=recovery&redirect=%2Fdashboard",
    );
    expect(response?.headers.get("location")).not.toContain("PKCE");
  });

  it("handles an invalid provider callback without attempting an exchange", async () => {
    const exchangeCode = vi.fn();
    const response = await processAuthCallbackRequest(
      new Request(
        "https://blackpips.com/auth/callback?error=access_denied&error_description=expired",
      ),
      { exchangeCode },
    );

    expect(exchangeCode).not.toHaveBeenCalled();
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toContain("status=recovery");
  });

  it("routes password recovery through the authoritative callback", async () => {
    const response = await processAuthCallbackRequest(
      new Request("https://blackpips.com/auth/callback?code=recovery-code"),
      { exchangeCode: vi.fn().mockResolvedValue({ error: null, redirectType: "recovery" }) },
    );
    expect(response?.headers.get("location")).toBe("/reset-password");
  });

  it("does not re-exchange a cleaned or refreshed callback URL", async () => {
    const exchangeCode = vi.fn();
    const response = await processAuthCallbackRequest(
      new Request("https://blackpips.com/auth/callback?status=recovery"),
      { exchangeCode },
    );
    expect(response).toBeNull();
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it("safely redirects an authenticated replay without reusing its code", async () => {
    const exchangeCode = vi.fn();
    const response = await processAuthCallbackRequest(
      new Request("https://www.blackpips.com/auth/callback?code=already-used"),
      { exchangeCode, intendedDestination: "/dashboard", authenticatedReplay: true },
    );

    expect(exchangeCode).not.toHaveBeenCalled();
    expect(response?.headers.get("location")).toBe("/dashboard");
  });

  it("rejects external recovery destinations", () => {
    expect(createRecoveryLocation("https://attacker.example/phish")).toBe(
      "/auth/callback?status=recovery",
    );
  });
});
