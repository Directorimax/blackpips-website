import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WELCOME_GIFT, WELCOME_GIFT_BUCKET } from "@/lib/welcome-gift";

const giftSchema = z.object({ giftId: z.literal(WELCOME_GIFT.id) }).strict();
const table = (client: unknown) => client as SupabaseClient;

function forbidden(message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = 403;
  return error;
}

const getWelcomeGiftStatusServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(giftSchema)
  .handler(async ({ data, context }) => {
    const { data: claim, error } = await table(context.supabase)
      .from("user_gift_claims")
      .select("claimed_at")
      .eq("user_id", context.userId)
      .eq("gift_id", data.giftId)
      .maybeSingle();
    if (error) throw new Error("Could not load your Welcome Gift status.");
    return { claimed: Boolean(claim), claimedAt: claim?.claimed_at ?? null };
  });

const claimWelcomeGiftServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(giftSchema)
  .handler(async ({ data, context }) => {
    const { assertRateLimit } = await import("@/lib/security.server");
    assertRateLimit("welcome-gift-claim", 10, 60_000, context.userId);
    const { data: claim, error } = await table(context.supabase)
      .from("user_gift_claims")
      .insert({ user_id: context.userId, gift_id: data.giftId })
      .select("claimed_at")
      .single();
    if (error?.code === "23505") {
      const { data: existing } = await table(context.supabase)
        .from("user_gift_claims")
        .select("claimed_at")
        .eq("user_id", context.userId)
        .eq("gift_id", data.giftId)
        .single();
      return { claimed: true, claimedAt: existing?.claimed_at ?? null };
    }
    if (error || !claim) throw new Error("Could not unlock your Welcome Gift.");
    return { claimed: true, claimedAt: claim.claimed_at as string };
  });

const getWelcomeGiftPdfUrlServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(giftSchema)
  .handler(async ({ data, context }) => {
    const { data: claim } = await table(context.supabase)
      .from("user_gift_claims")
      .select("id")
      .eq("user_id", context.userId)
      .eq("gift_id", data.giftId)
      .maybeSingle();
    if (!claim) throw forbidden("Claim this Welcome Gift before opening its resources.");

    const expiresIn = 300;
    const { data: signed, error } = await table(context.supabase)
      .storage.from(WELCOME_GIFT_BUCKET)
      .createSignedUrl(WELCOME_GIFT.pdf.storagePath, expiresIn);
    if (error || !signed?.signedUrl) throw new Error("The Starter Guide is not available yet.");
    return {
      signedUrl: signed.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  });

async function authenticatedHeaders() {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

export async function getWelcomeGiftStatus() {
  return getWelcomeGiftStatusServer({
    data: { giftId: WELCOME_GIFT.id },
    headers: await authenticatedHeaders(),
  });
}

export async function claimWelcomeGift() {
  return claimWelcomeGiftServer({
    data: { giftId: WELCOME_GIFT.id },
    headers: await authenticatedHeaders(),
  });
}

export async function getWelcomeGiftPdfUrl() {
  return getWelcomeGiftPdfUrlServer({
    data: { giftId: WELCOME_GIFT.id },
    headers: await authenticatedHeaders(),
  });
}
