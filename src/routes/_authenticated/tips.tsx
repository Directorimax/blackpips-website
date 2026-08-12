import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  remainingTipTime,
  TIP_REACTIONS,
  type TipReaction,
  type TradingTip,
} from "@/lib/trading-tips";
import {
  TipMedia,
  TradingTipLightbox,
  type ResolvedTipImage,
} from "@/components/trading-tips/TipMedia";

export const Route = createFileRoute("/_authenticated/tips")({ component: TradingTipsFeed });

function TradingTipsFeed() {
  const [tips, setTips] = useState<TradingTip[]>([]);
  const [reactions, setReactions] = useState<
    Record<string, { counts: Partial<Record<TipReaction, number>>; selected?: TipReaction }>
  >({});
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ images: ResolvedTipImage[]; index: number } | null>(
    null,
  );
  const openPreview = useCallback(
    (images: ResolvedTipImage[], index: number) => setPreview({ images, index }),
    [],
  );
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("trading_tips")
      .select(
        "id,title,caption,media_type,media_path,mime_type,created_at,expires_at,trading_tip_media(id,media_type,media_path,mime_type,sort_order)",
      )
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });
    if (!error) {
      const loaded = (data ?? []).map((tip) => ({
        ...tip,
        trading_tip_media: [
          ...(((tip.trading_tip_media ?? []) as unknown as TradingTip["trading_tip_media"]) ?? []),
        ].sort((a, b) => a.sort_order - b.sort_order),
      })) as unknown as TradingTip[];
      setTips(loaded);
      if (loaded.length) {
        const { data: summary } = await supabase.rpc("get_trading_tip_reaction_summary", {
          p_tip_ids: loaded.map((tip) => tip.id),
        });
        const next: Record<
          string,
          { counts: Partial<Record<TipReaction, number>>; selected?: TipReaction }
        > = {};
        for (const row of summary ?? []) {
          const item = next[row.tip_id] ?? { counts: {} };
          item.counts[row.emoji as TipReaction] = Number(row.reaction_count);
          if (row.selected_emoji) item.selected = row.selected_emoji as TipReaction;
          next[row.tip_id] = item;
        }
        setReactions(next);
      }
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-7 max-w-2xl sm:mb-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          <Sparkles className="h-3.5 w-3.5" /> Members feed
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Trading intelligence</h1>
        <p className="mt-2 text-muted-foreground sm:text-lg">
          Fresh educational insights from the BlackPips desk.
        </p>
      </header>
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[31rem] animate-pulse rounded-3xl bg-muted" />
          <div className="h-[31rem] animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : tips.length === 0 ? (
        <section className="rounded-3xl border border-gold/20 bg-card p-10 text-center shadow-elegant">
          <Clock3 className="mx-auto h-9 w-9 text-gold" />
          <h2 className="mt-4 text-xl font-semibold">No active tips right now.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon.</p>
        </section>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-2">
          {tips.map((tip) => (
            <article
              key={tip.id}
              className="group overflow-hidden rounded-3xl border border-border/80 bg-card shadow-elegant transition duration-300 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_16px_45px_hsl(var(--gold)/0.12)]"
            >
              <TipMedia
                tipId={tip.id}
                media={tip.trading_tip_media ?? []}
                alt={tip.title ?? "Trading tip"}
                onPreview={openPreview}
                priority={tips.indexOf(tip) < 2}
              />
              <div className="p-5 sm:p-6">
                {tip.title && <h2 className="text-xl font-bold tracking-tight">{tip.title}</h2>}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground sm:text-base">
                  {tip.caption}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                  <time dateTime={tip.created_at}>
                    Published{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(tip.created_at))}
                  </time>
                  <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
                    {remainingTipTime(tip.expires_at)}
                  </span>
                </div>
                <ReactionBar
                  tipId={tip.id}
                  value={reactions[tip.id]}
                  onChange={(next) => setReactions((current) => ({ ...current, [tip.id]: next }))}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {preview && (
        <TradingTipLightbox
          items={preview.images}
          index={preview.index}
          onClose={() => setPreview(null)}
          onIndexChange={(index) =>
            setPreview((current) => (current ? { ...current, index } : null))
          }
        />
      )}
    </main>
  );
}

function ReactionBar({
  tipId,
  value = { counts: {} },
  onChange,
}: {
  tipId: string;
  value?: { counts: Partial<Record<TipReaction, number>>; selected?: TipReaction };
  onChange: (value: {
    counts: Partial<Record<TipReaction, number>>;
    selected?: TipReaction;
  }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [popped, setPopped] = useState<TipReaction | null>(null);
  async function react(emoji: TipReaction) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const previous = value.selected;
    const counts = { ...value.counts };
    const optimisticCounts = { ...counts };
    if (previous === emoji) {
      optimisticCounts[emoji] = Math.max(0, (optimisticCounts[emoji] ?? 0) - 1);
      onChange({ counts: optimisticCounts });
    } else {
      if (previous) optimisticCounts[previous] = Math.max(0, (optimisticCounts[previous] ?? 0) - 1);
      optimisticCounts[emoji] = (optimisticCounts[emoji] ?? 0) + 1;
      onChange({ counts: optimisticCounts, selected: emoji });
      setPopped(emoji);
      window.setTimeout(() => setPopped(null), 420);
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sign in required");
      if (previous === emoji) {
        const { error } = await supabase
          .from("trading_tip_reactions")
          .delete()
          .eq("tip_id", tipId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trading_tip_reactions")
          .upsert({ tip_id: tipId, user_id: user.id, emoji }, { onConflict: "tip_id,user_id" });
        if (error) throw error;
      }
    } catch {
      onChange(value);
      toast.error("Reaction could not be saved. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Tip reactions">
      {TIP_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={busy}
          aria-label={`React ${emoji}${value.counts[emoji] ? `, ${value.counts[emoji]} reactions` : ""}`}
          aria-pressed={value.selected === emoji}
          onClick={() => void react(emoji)}
          className={`relative min-h-9 rounded-full border px-2.5 text-sm transition-colors ${value.selected === emoji ? "border-gold bg-gold/15 text-gold" : "border-border/80 bg-muted/30 hover:border-gold/30 hover:bg-gold/5"}`}
        >
          {emoji}
          {popped === emoji && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 animate-[bounce_400ms_ease-out] text-base"
            >
              {emoji}
            </span>
          )}
          {value.counts[emoji] ? <span className="ml-1">{value.counts[emoji]}</span> : null}
        </button>
      ))}
    </div>
  );
}
