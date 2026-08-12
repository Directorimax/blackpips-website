import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TRADING_TIPS_BUCKET } from "@/lib/trading-tips";

const table = (client: unknown) => client as SupabaseClient;
const idSchema = z.object({ tipId: z.string().uuid() }).strict();
const mediaSchema = z.object({ tipId: z.string().uuid(), mediaId: z.string().uuid() }).strict();
const reactionViewerSchema = z
  .object({
    tipId: z.string().uuid(),
    emoji: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();

export type AdminTipReaction = {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  full_name: string;
  avatar: string | null;
  email: string | null;
};

export const getAdminTradingTipReactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(reactionViewerSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await table(context.supabase).rpc("is_admin");
    if (isAdmin !== true) throw new Error("Administrator access required.");
    const { data: reactions, error } = await table(context.supabase).rpc(
      "admin_get_trading_tip_reactions",
      {
        p_tip_id: data.tipId,
        p_emoji: data.emoji ?? null,
        p_limit: data.limit ?? 50,
        p_offset: data.offset ?? 0,
      },
    );
    if (error) {
      console.error("Could not load admin trading tip reactions", {
        code: error.code,
        message: error.message,
        tipId: data.tipId,
      });
      throw new Error("Could not load reactions.");
    }
    return { reactions: (reactions ?? []) as AdminTipReaction[] };
  });

export const getTradingTipMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(mediaSchema)
  .handler(async ({ data, context }) => {
    const { data: media, error } = await table(context.supabase)
      .from("trading_tip_media")
      .select("media_path,trading_tips!inner(expires_at)")
      .eq("id", data.mediaId)
      .eq("tip_id", data.tipId)
      .maybeSingle();
    const tip = media?.trading_tips as unknown as { expires_at: string | null } | null;
    if (
      error ||
      !media ||
      !tip ||
      (tip.expires_at && new Date(tip.expires_at).getTime() <= Date.now())
    )
      throw new Error("This tip is no longer available.");
    const { data: signed, error: signedError } = await table(context.supabase)
      .storage.from(TRADING_TIPS_BUCKET)
      .createSignedUrl(media.media_path, 60);
    if (signedError || !signed?.signedUrl) throw new Error("Could not load tip media.");
    return { signedUrl: signed.signedUrl, expiresAt: new Date(Date.now() + 60_000).toISOString() };
  });

export const deleteTradingTip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(idSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await table(context.supabase).rpc("is_admin");
    if (isAdmin !== true) {
      const error = new Error("Administrator access required.") as Error & { statusCode: number };
      error.statusCode = 403;
      throw error;
    }
    const { assertRateLimit } = await import("@/lib/security.server");
    assertRateLimit("trading-tips-delete", 30, 60_000, context.userId);
    const { data: tip, error } = await table(context.supabase)
      .from("trading_tips")
      .select("trading_tip_media(media_path)")
      .eq("id", data.tipId)
      .maybeSingle();
    if (error || !tip) throw new Error("Tip was not found.");
    const paths = ((tip.trading_tip_media ?? []) as { media_path: string }[]).map(
      ({ media_path }) => media_path,
    );
    const { error: storageError } = paths.length
      ? await table(context.supabase).storage.from(TRADING_TIPS_BUCKET).remove(paths)
      : { error: null };
    if (storageError) throw new Error("Could not remove the tip media. The tip was not deleted.");
    const { error: deleteError } = await table(context.supabase)
      .from("trading_tips")
      .delete()
      .eq("id", data.tipId);
    if (deleteError)
      throw new Error(
        "Media was removed but the tip record could not be deleted. Please contact support.",
      );
    return { ok: true };
  });

export const deleteTradingTipMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(mediaSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await table(context.supabase).rpc("is_admin");
    if (isAdmin !== true) throw new Error("Administrator access required.");
    const { data: media, error } = await table(context.supabase)
      .from("trading_tip_media")
      .select("media_path")
      .eq("id", data.mediaId)
      .eq("tip_id", data.tipId)
      .maybeSingle();
    if (error || !media) throw new Error("Media was not found.");
    const { count } = await table(context.supabase)
      .from("trading_tip_media")
      .select("id", { count: "exact", head: true })
      .eq("tip_id", data.tipId);
    if ((count ?? 0) <= 1) throw new Error("A tip must keep at least one media item.");
    const { error: storageError } = await table(context.supabase)
      .storage.from(TRADING_TIPS_BUCKET)
      .remove([media.media_path]);
    if (storageError) throw new Error("Could not remove the media. Nothing was changed.");
    const { error: deleteError } = await table(context.supabase)
      .from("trading_tip_media")
      .delete()
      .eq("id", data.mediaId);
    if (deleteError) throw new Error("Media was removed but its record could not be deleted.");
    return { ok: true };
  });
