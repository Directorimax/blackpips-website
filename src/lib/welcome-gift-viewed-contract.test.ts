import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260916_add_welcome_gift_first_viewed_at.sql"),
  "utf8",
);
const service = readFileSync(
  resolve(root, "src/services/welcome-gift/welcome-gift.functions.ts"),
  "utf8",
);
const viewer = readFileSync(
  resolve(root, "src/routes/_authenticated/dashboard.gift.$giftId.tsx"),
  "utf8",
);

describe("Welcome Gift viewed-state security contract", () => {
  it("exposes only an authenticated owner-scoped SECURITY DEFINER RPC", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("caller_id uuid := auth.uid()");
    expect(migration).toContain("where user_id = caller_id");
    expect(migration).toContain("gift_id = p_gift_id");
    expect(migration).toContain(
      "set first_viewed_at = coalesce(first_viewed_at, now())",
    );
    expect(migration).toContain(
      "revoke all on function public.mark_welcome_gift_viewed(text) from public",
    );
    expect(migration).toContain(
      "grant execute on function public.mark_welcome_gift_viewed(text) to authenticated",
    );
  });

  it("does not grant direct claim-row update access", () => {
    expect(migration).not.toMatch(/create\s+policy[\s\S]*for\s+update/i);
    expect(migration).not.toMatch(/grant\s+update/i);
  });

  it("uses the RPC and never updates first_viewed_at directly", () => {
    expect(service).toContain('rpc(\n      "mark_welcome_gift_viewed"');
    expect(service).not.toMatch(/\.update\s*\(\s*\{[^}]*first_viewed_at/s);
  });

  it("marks viewed only after the first PDF page render resolves", () => {
    expect(viewer).toContain("task.promise.then(onFirstPageVisible)");
  });
});
