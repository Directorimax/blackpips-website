import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Content-Type": "application/json" };
const ownedPaths = (tipId: string, paths: string[]) => {
  const escaped = tipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^tips/${escaped}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|jpeg|png|webp|mp4|webm|mov)$`,
    "i",
  );
  return [...new Set(paths.filter((path) => pattern.test(path)))];
};
Deno.serve(async (request) => {
  if (
    request.method !== "POST" ||
    request.headers.get("x-cron-secret") !== Deno.env.get("TRADING_TIPS_CRON_SECRET")
  )
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return new Response(JSON.stringify({ error: "Server configuration missing" }), {
      status: 500,
      headers: cors,
    });
  const supabase = createClient(url, key);
  const { data: tips, error } = await supabase
    .from("trading_tips")
    .select("id,trading_tip_media(media_path)")
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString())
    .limit(100);
  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  let removed = 0;
  const failures: string[] = [];
  for (const tip of tips ?? []) {
    const paths = ownedPaths(
      tip.id,
      (tip.trading_tip_media ?? []).map((media: { media_path: string }) => media.media_path),
    );
    const { error: storageError } = paths.length
      ? await supabase.storage.from("trading-tips").remove(paths)
      : { error: null };
    if (storageError) {
      failures.push(tip.id);
      continue;
    }
    const { error: rowError } = await supabase.from("trading_tips").delete().eq("id", tip.id);
    if (rowError) failures.push(tip.id);
    else removed += 1;
  }
  return new Response(JSON.stringify({ removed, failures }), { headers: cors });
});
