import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WELCOME_GIFT, WELCOME_GIFT_BUCKET } from "./welcome-gift";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("versioned Welcome Gift configuration", () => {
  it("keeps the secured resource path tied to the gift version", () => {
    expect(WELCOME_GIFT.id).toBe("blackpips-welcome-2026-v1");
    expect(WELCOME_GIFT.pdf.storagePath.split("/")[0]).toBe(WELCOME_GIFT.id);
    expect(WELCOME_GIFT_BUCKET).toBe("welcome-gifts");
  });

  it("exposes only the internal PDF viewing action", () => {
    const panel = read("../components/welcome-gift/WelcomeGiftPanel.tsx");
    const viewer = read("../routes/_authenticated/dashboard.gift.$giftId.tsx");
    expect(panel).toContain("View PDF");
    expect(panel).not.toMatch(/download/i);
    expect(viewer).not.toMatch(/download/i);
  });

  it("scopes save and copy deterrents to the rendered PDF pages", () => {
    const viewer = read("../routes/_authenticated/dashboard.gift.$giftId.tsx");
    expect(viewer).toContain("onContextMenu={(event) => event.preventDefault()}");
    expect(viewer).toContain("onDragStart={(event) => event.preventDefault()}");
    expect(viewer).toContain("onCopy={(event) => event.preventDefault()}");
    expect(viewer).toContain("draggable={false}");
    expect(viewer).toContain('WebkitTouchCallout: "none"');
    expect(viewer).toContain('touchAction: "pan-x pan-y pinch-zoom"');
  });
});

describe("Welcome Gift persistence and access controls", () => {
  const functions = read("../services/welcome-gift/welcome-gift.functions.ts");
  const migration = read("../../supabase/migrations/20260817_add_versioned_welcome_gifts.sql");

  it("enforces one claim per user and gift", () => {
    expect(migration).toContain("unique (user_id, gift_id)");
    expect(functions).toContain('error?.code === "23505"');
  });

  it("limits claim reads and inserts to the authenticated owner", () => {
    expect(migration).toContain("using (auth.uid() = user_id)");
    expect(migration).toContain("with check (auth.uid() = user_id)");
    expect(functions).toContain("user_id: context.userId");
    expect(functions).toContain('.eq("user_id", context.userId)');
  });

  it("requires a claim before signing the private PDF", () => {
    expect(functions).toContain(
      'throw forbidden("Claim this Welcome Gift before opening its resources.")',
    );
    expect(functions).toContain(".createSignedUrl(");
    expect(functions).toContain("WELCOME_GIFT.pdf.storagePath");
    expect(functions).toContain("const expiresIn = 300");
    expect(migration).toContain("alter table public.user_gift_claims enable row level security");
    expect(migration).toContain("public = false");
  });
});
