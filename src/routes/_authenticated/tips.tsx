import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { withCentralTipVideo } from "@/lib/trading-tips";
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
import { createSeoHead } from "@/lib/seo";
import { PageFrame } from "@/components/bp/PageFrame";
import { ReactionEmoji, type ReactionEmojiHandle } from "@/components/trading-tips/ReactionEmoji";

export const Route = createFileRoute("/_authenticated/tips")({
  head: () =>
    createSeoHead({
      title: "Trading Tips Members Feed",
      description: "Private BLACKPIPS trading tips members feed.",
      path: "/tips",
      noindex: true,
    }),
  component: () => (
    <PageFrame>
      <TradingTipsFeed />
    </PageFrame>
  ),
});

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
        "id,title,caption,media_type,media_path,mime_type,created_at,expires_at,media_asset_id,trading_tip_media(id,media_type,media_path,mime_type,sort_order,media_asset_id)",
      )
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });
    if (!error) {
      const loaded = ((data ?? []) as unknown as TradingTip[]).map((tip) => ({
        ...tip,
        trading_tip_media: withCentralTipVideo(tip),
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
    <main className="wrap tips-page">
      <header className="stack rise" style={{ gap: 14, maxWidth: 680, marginBottom: 32 }}>
        <span className="eyebrow" style={{ alignSelf: "flex-start" }}>
          <Sparkles aria-hidden="true" /> Members feed
        </span>
        <h1 className="h1" style={{ fontSize: "clamp(32px, 4.4vw, 52px)" }}>
          Trading intelligence
        </h1>
        <p className="lead">Fresh educational insights from the BlackPips desk.</p>
      </header>
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card journal-skel" style={{ height: 496 }} />
          <div className="card journal-skel" style={{ height: 496 }} />
        </div>
      ) : tips.length === 0 ? (
        <section className="card spot msg-card" style={{ maxWidth: "none" }}>
          <span className="ico">
            <Clock3 aria-hidden="true" />
          </span>
          <h2 className="h3">No active tips right now.</h2>
          <p className="small">Check back soon.</p>
        </section>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-2">
          {tips.map((tip) => (
            <article key={tip.id} className="card lift spot tip-card group">
              <TipMedia
                tipId={tip.id}
                media={tip.trading_tip_media ?? []}
                alt={tip.title ?? "Trading tip"}
                onPreview={openPreview}
                priority={tips.indexOf(tip) < 2}
              />
              <div className="p-5 sm:p-6">
                {tip.title && <h2 className="h3">{tip.title}</h2>}
                <p className="body mt-2 whitespace-pre-wrap break-words">{tip.caption}</p>
                <div className="tip-meta">
                  <time dateTime={tip.created_at}>
                    Published{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(tip.created_at))}
                  </time>
                  <span className="chip chip-gold">{remainingTipTime(tip.expires_at)}</span>
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
        <ReactionButton
          key={emoji}
          emoji={emoji}
          count={value.counts[emoji] ?? 0}
          selected={value.selected === emoji}
          disabled={busy}
          onPick={() => void react(emoji)}
        />
      ))}
    </div>
  );
}

function ReactionButton({
  emoji,
  count,
  selected,
  disabled,
  onPick,
}: {
  emoji: TipReaction;
  count: number;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const player = useRef<ReactionEmojiHandle>(null);
  const [glow, setGlow] = useState(0);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`React ${emoji}${count ? `, ${count} reactions` : ""}`}
      aria-pressed={selected}
      onClick={() => {
        if (!selected) {
          player.current?.celebrate();
          setGlow((n) => n + 1);
        }
        onPick();
      }}
      className={`pick tip-react relative ${selected ? "on" : ""}`}
    >
      {glow > 0 && <span key={glow} className="tip-react-glow" aria-hidden="true" />}
      <ReactionEmoji ref={player} emoji={emoji} />
      {count ? <span className="tip-react-count">{count}</span> : null}
    </button>
  );
}
