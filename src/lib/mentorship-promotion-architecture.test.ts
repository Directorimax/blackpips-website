import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260902_masterclass_limited_offer.sql", import.meta.url),
  "utf8",
);

describe("Masterclass promotion architecture", () => {
  it("stores the exact Tanzania deadline as an absolute UTC timestamp", () => {
    expect(migration).toContain("2026-09-06 20:59:59+00");
  });

  it("calculates and snapshots the payable amount on the server", () => {
    expect(migration).toContain("when package.slug = 'master-class'");
    expect(migration).toContain("statement_timestamp() < package.promotion_ends_at");
    expect(migration).toContain("server_payable_amount");
    expect(migration).toContain("payable_amount, currency");
    expect(migration).not.toMatch(/p_(?:price|amount|payable)/);
  });

  it("leaves the established Regular and Advanced prices unchanged", () => {
    expect(migration).toContain("when 'regular-class' then 250000");
    expect(migration).toContain("when 'advanced-class' then 500000");
    expect(migration).toContain("when 'master-class' then 750000");
  });

  it("prevents authenticated clients from bypassing the RPC with a direct insert", () => {
    expect(migration).toContain(
      "revoke insert on table public.mentorship_applications from authenticated",
    );
    expect(migration).toContain("security definer");
  });
});
