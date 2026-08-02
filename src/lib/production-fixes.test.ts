import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Trading Plan access controls", () => {
  const route = read("../routes/_authenticated/dashboard.trading-plan.tsx");
  const functions = read("../services/trading-plan/trading-plan.functions.ts");
  const rls = read("../../supabase/migrations/20260730_create_trading_plans.sql");

  it("allows authenticated users without querying premium purchases", () => {
    expect(route).not.toContain('.from("purchases")');
    expect(route).not.toContain("Premium workspace");
  });

  it("rejects anonymous saves through authentication middleware", () => {
    expect(
      functions.match(/middleware\(\[requireSupabaseAuth\]\)/g)?.length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("derives ownership server-side and prevents cross-user access", () => {
    expect(functions).toContain("user_id: context.userId");
    expect(functions).toContain('.eq("user_id", context.userId)');
    expect(rls).toContain("using (user_id = auth.uid())");
    expect(rls).toContain("with check (user_id = auth.uid())");
  });
});

describe("payment proof preview", () => {
  const page = read("../routes/admin/payments.tsx");
  const serverFunction = read("../services/payments/payment-proof.functions.ts");

  it("opens proofs in an internal dialog rather than a new tab", () => {
    expect(page).toContain("<PaymentProofDialog");
    expect(page).not.toContain("window.open");
  });

  it("checks admin privileges on the backend before signing a private proof", () => {
    expect(serverFunction).toContain('.rpc("is_admin")');
    expect(serverFunction).toContain("createSignedUrl(payment.proof_url, expiresIn)");
    expect(serverFunction).toContain("const expiresIn = 120");
  });
});
