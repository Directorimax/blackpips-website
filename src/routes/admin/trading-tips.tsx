import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  CalendarClock,
  MessageCircleHeart,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import {
  TipMedia,
  SecureTipVideo,
  TradingTipLightbox,
  type ResolvedTipImage,
} from "@/components/trading-tips/TipMedia";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  expiryAt,
  MAX_TIP_MEDIA,
  mediaTypeFor,
  remainingTipTime,
  TIP_REACTIONS,
  TIP_MEDIA_ACCEPT,
  TRADING_TIPS_BUCKET,
  type TradingTip,
  type TradingTipMedia,
  validateTipFile,
  tipFileExtension,
} from "@/lib/trading-tips";
import {
  deleteTradingTip,
  deleteTradingTipMedia,
  getAdminTradingTipReactions,
  type AdminTipReaction,
} from "@/services/trading-tips/trading-tips.functions";

export const Route = createFileRoute("/admin/trading-tips")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminTradingTips />
    </AuthenticatedRouteGuard>
  ),
});
type Expiry = "24h" | "72h" | "7d" | "forever" | "custom";
const tipSelect =
  "id,title,caption,media_type,media_path,mime_type,created_at,expires_at,trading_tip_media(id,media_type,media_path,mime_type,sort_order)";

async function uploadTipFiles(tipId: string, files: File[], startOrder: number) {
  const uploadedPaths: string[] = [];
  try {
    for (const [offset, file] of files.entries()) {
      const extension = tipFileExtension(file);
      if (!extension) throw new Error(`${file.name}: unsupported media format.`);
      const path = `tips/${tipId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(TRADING_TIPS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`);
      // Track immediately so a following database failure cannot orphan the object.
      uploadedPaths.push(path);
      const { error: mediaError } = await supabase.from("trading_tip_media").insert({
        tip_id: tipId,
        media_type: mediaTypeFor(file.type),
        media_path: path,
        mime_type: file.type,
        sort_order: startOrder + offset,
      });
      if (mediaError) throw new Error(`${file.name}: ${mediaError.message}`);
    }
  } catch (cause) {
    if (uploadedPaths.length) {
      await supabase
        .from("trading_tip_media")
        .delete()
        .eq("tip_id", tipId)
        .in("media_path", uploadedPaths);
      await supabase.storage.from(TRADING_TIPS_BUCKET).remove(uploadedPaths);
    }
    throw cause;
  }
}
function ExpiryPicker({
  value,
  setValue,
  custom,
  setCustom,
}: {
  value: Expiry;
  setValue: (value: Expiry) => void;
  custom: string;
  setCustom: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Expires</p>
      <div className="flex flex-wrap gap-2">
        {(["24h", "72h", "7d", "forever", "custom"] as Expiry[]).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? "default" : "outline"}
            onClick={() => setValue(option)}
          >
            {option === "7d"
              ? "7 days"
              : option === "forever"
                ? "Forever"
                : option === "custom"
                  ? "Custom"
                  : option}
          </Button>
        ))}
      </div>
      {value === "custom" && (
        <Input
          type="datetime-local"
          min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
      )}
    </div>
  );
}
function AdminTradingTips() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [tips, setTips] = useState<TradingTip[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("72h");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<TradingTip | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "expired">("active");
  const [preview, setPreview] = useState<{ images: ResolvedTipImage[]; index: number } | null>(
    null,
  );
  const [reactionSummary, setReactionSummary] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [reactionViewer, setReactionViewer] = useState<{
    tip: TradingTip;
    emoji: string | null;
  } | null>(null);
  const openPreview = useCallback(
    (images: ResolvedTipImage[], index: number) => setPreview({ images, index }),
    [],
  );
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);
  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("trading_tips")
      .select(tipSelect)
      .order("created_at", { ascending: false });
    if (loadError) {
      toast.error("Could not load active tips.");
      return;
    }
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
      const next: Record<string, Record<string, number>> = {};
      for (const row of summary ?? []) {
        next[row.tip_id] ??= {};
        next[row.tip_id][row.emoji] = Number(row.reaction_count);
      }
      setReactionSummary(next);
    } else setReactionSummary({});
  }, []);
  useEffect(() => {
    if (!adminLoading && !isAdmin) void navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);
  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const errors: string[] = [];
    const valid = incoming.filter((file) => {
      const reason = validateTipFile(file);
      if (reason) {
        errors.push(`${file.name}: ${reason}`);
        return false;
      }
      return true;
    });
    if (files.length + valid.length > MAX_TIP_MEDIA)
      errors.push(`A tip can contain at most ${MAX_TIP_MEDIA} media items.`);
    setFileErrors(errors);
    setFiles((current) => [...current, ...valid].slice(0, MAX_TIP_MEDIA));
  }
  async function publish() {
    const expiresAt = expiryAt(expiry, custom);
    if (!files.length || !caption.trim())
      return setError(!files.length ? "Choose at least one media item." : "Enter a caption.");
    if (expiry === "custom" && (!expiresAt || new Date(expiresAt) <= new Date()))
      return setError("Choose a future expiry date and time.");
    setBusy(true);
    setError(null);
    const tipId = crypto.randomUUID();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired.");
      const { error: insertError } = await supabase.from("trading_tips").insert({
        id: tipId,
        title: title.trim() || null,
        caption: caption.trim(),
        created_by: user.id,
        expires_at: expiresAt,
      });
      if (insertError) throw insertError;
      await uploadTipFiles(tipId, files, 0);
      const { data: firstMedia } = await supabase
        .from("trading_tip_media")
        .select("media_path,media_type,mime_type")
        .eq("tip_id", tipId)
        .eq("sort_order", 0)
        .single();
      await supabase
        .from("trading_tips")
        .update({
          media_path: firstMedia?.media_path ?? null,
          media_type: firstMedia?.media_type ?? null,
          mime_type: firstMedia?.mime_type ?? null,
        })
        .eq("id", tipId);
      setFiles([]);
      setTitle("");
      setCaption("");
      setExpiry("72h");
      setCustom("");
      toast.success("Trading tip published.");
      await load();
      setCreating(false);
    } catch (cause) {
      await supabase.from("trading_tips").delete().eq("id", tipId);
      setError(
        cause instanceof Error
          ? `Could not publish: ${cause.message}`
          : "Could not publish the tip. Uploaded media was cleaned up.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(tip: TradingTip) {
    if (!window.confirm("Delete this tip and all of its media permanently?")) return;
    setDeleting(tip.id);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error("Session expired");
      await deleteTradingTip({
        data: { tipId: tip.id },
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      toast.success("Tip deleted.");
      await load();
    } catch {
      toast.error("Could not delete the tip.");
    } finally {
      setDeleting(null);
    }
  }
  if (adminLoading || !isAdmin) return <div className="min-h-screen" />;
  const now = Date.now();
  const visibleTips = tips.filter((tip) => {
    const expired = Boolean(tip.expires_at && new Date(tip.expires_at).getTime() <= now);
    const matchesStatus = status === "all" || (status === "expired" ? expired : !expired);
    const searchable = `${tip.title ?? ""} ${tip.caption}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesStatus && searchable;
  });
  const activeCount = tips.filter(
    (tip) => !tip.expires_at || new Date(tip.expires_at).getTime() > now,
  ).length;
  const expiredCount = tips.length - activeCount;
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Trading Tips</h1>
          <p className="mt-2 text-muted-foreground">
            Create, manage and monitor trading insights shared with learners.
          </p>
        </div>
        <Button className="rounded-xl px-5 shadow-elegant" onClick={() => setCreating(true)}>
          <Plus /> Create New Tip
        </Button>
      </header>
      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-elegant md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["active", "Active Tips", activeCount],
              ["expired", "Expired Tips", expiredCount],
              ["all", "All Tips", tips.length],
            ] as const
          ).map(([key, label, count]) => (
            <Button
              key={key}
              size="sm"
              variant={status === key ? "default" : "outline"}
              onClick={() => setStatus(key)}
              className="rounded-lg"
            >
              <span>{label}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                {count}
              </span>
            </Button>
          ))}
        </div>
        <label className="relative block w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tips"
            className="pl-9"
          />
        </label>
      </section>
      {creating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Create new trading tip"
            className="mx-auto my-5 max-w-2xl rounded-3xl border border-gold/20 bg-card p-5 shadow-elegant sm:my-10 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  New insight
                </p>
                <h2 className="mt-1 text-xl font-bold">Create trading tip</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close create dialog"
                onClick={() => setCreating(false)}
              >
                <X />
              </Button>
            </div>
            <label
              className="mt-5 grid min-h-36 cursor-pointer place-items-center rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-4 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
            >
              <input
                className="sr-only"
                type="file"
                multiple
                accept={TIP_MEDIA_ACCEPT}
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <span>
                <ImagePlus className="mx-auto h-7 w-7 text-gold" />
                <span className="mt-2 block text-sm font-semibold">
                  Drag and drop or select media
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {files.length} / {MAX_TIP_MEDIA} media items · Images 10 MB · Videos 50 MB
                </span>
              </span>
            </label>
            {fileErrors.map((message) => (
              <p key={message} className="mt-2 text-sm text-destructive">
                {message}
              </p>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {previews.map(({ file, url }, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative overflow-hidden rounded-xl border"
                >
                  <button
                    type="button"
                    className="absolute right-1 top-1 z-10 rounded-full bg-black/70 p-1 text-white"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {file.type.startsWith("video/") ? (
                    <SecureTipVideo src={url} />
                  ) : (
                    <img
                      className="aspect-video w-full object-cover"
                      src={url}
                      alt={`Selected ${index + 1}`}
                    />
                  )}
                  <div className="flex justify-between p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!index}
                      onClick={() =>
                        setFiles((items) => {
                          const next = [...items];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })
                      }
                    >
                      ←
                    </Button>
                    <span className="text-xs">{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === files.length - 1}
                      onClick={() =>
                        setFiles((items) => {
                          const next = [...items];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          return next;
                        })
                      }
                    >
                      →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <Input
                value={title}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional title"
              />
              <Textarea
                value={caption}
                maxLength={3000}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Caption or description"
                rows={5}
              />
              <ExpiryPicker
                value={expiry}
                setValue={setExpiry}
                custom={custom}
                setCustom={setCustom}
              />
              <p className="text-xs text-muted-foreground">
                {expiry === "forever"
                  ? "Never expires"
                  : expiry === "custom" && custom
                    ? `Expires ${new Date(custom).toLocaleString()}`
                    : `Expires ${expiry === "7d" ? "in 7 days" : `in ${expiry}`}`}
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={busy} onClick={() => void publish()}>
                {busy ? <Loader2 className="animate-spin" /> : <Upload />}Publish tip
              </Button>
            </div>
          </section>
        </div>
      )}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {status === "active"
              ? "Active tips"
              : status === "expired"
                ? "Expired tips"
                : "All tips"}
          </h2>
          <span className="text-sm text-muted-foreground">{visibleTips.length} shown</span>
        </div>
        {visibleTips.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-border p-6 text-center text-muted-foreground">
            <div>
              <Archive className="mx-auto mb-3 h-7 w-7 text-gold" />
              <p className="font-medium text-foreground">No matching tips</p>
              <p className="mt-1 text-sm">Adjust the filters or create a new insight.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleTips.map((tip) => (
              <article
                key={tip.id}
                className="group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-elegant transition hover:-translate-y-0.5 hover:border-gold/30"
              >
                {tip.expires_at && new Date(tip.expires_at).getTime() <= now ? (
                  <div className="grid aspect-[4/3] place-items-center bg-muted/50 text-center text-muted-foreground">
                    <div>
                      <Archive className="mx-auto mb-2 h-6 w-6 text-gold/70" />
                      <span className="text-xs">Expired insight</span>
                    </div>
                  </div>
                ) : (
                  <TipMedia
                    tipId={tip.id}
                    media={tip.trading_tip_media ?? []}
                    alt={tip.title ?? "Trading tip"}
                    onPreview={openPreview}
                  />
                )}
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      {tip.title && <h3 className="font-bold">{tip.title}</h3>}
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {tip.caption}
                      </p>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5 text-gold" />
                        <span
                          className={
                            tip.expires_at && new Date(tip.expires_at).getTime() <= now
                              ? "font-semibold text-destructive"
                              : "font-semibold text-gold"
                          }
                        >
                          {tip.expires_at && new Date(tip.expires_at).getTime() <= now
                            ? "Expired"
                            : remainingTipTime(tip.expires_at)}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Edit tip"
                        onClick={() => setEditing(tip)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Delete tip"
                        disabled={deleting === tip.id}
                        onClick={() => void remove(tip)}
                      >
                        {deleting === tip.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 className="text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <AdminReactionSummary
                    counts={reactionSummary[tip.id] ?? {}}
                    onView={(emoji) => setReactionViewer({ tip, emoji })}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <EditTip
          tip={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
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
      {reactionViewer && (
        <AdminReactionViewer
          tip={reactionViewer.tip}
          emoji={reactionViewer.emoji}
          onClose={() => setReactionViewer(null)}
        />
      )}
    </main>
  );
}

function AdminReactionSummary({
  counts,
  onView,
}: {
  counts: Record<string, number>;
  onView: (emoji: string | null) => void;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <MessageCircleHeart className="h-3.5 w-3.5 text-gold" /> Reactions{" "}
        <span className="font-normal">{total} total</span>
      </div>
      {total ? (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIP_REACTIONS.filter((emoji) => counts[emoji]).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onView(emoji)}
                className="rounded-full border border-gold/20 bg-gold/5 px-2 py-1 text-xs transition hover:border-gold hover:bg-gold/15"
                aria-label={`View ${counts[emoji]} ${emoji} reactions`}
              >
                {emoji} <span className="font-semibold text-gold">{counts[emoji]}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-gold hover:underline"
            onClick={() => onView(null)}
          >
            View all reactions
          </button>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No learner reactions yet.</p>
      )}
    </div>
  );
}

function AdminReactionViewer({
  tip,
  emoji,
  onClose,
}: {
  tip: TradingTip;
  emoji: string | null;
  onClose: () => void;
}) {
  const [reactions, setReactions] = useState<AdminTipReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) throw new Error();
        const result = await getAdminTradingTipReactions({
          data: { tipId: tip.id, emoji },
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (alive) setReactions(result.reactions);
      } catch {
        if (alive) setError("Could not load reaction details.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [emoji, tip.id]);
  const title = emoji ? `${emoji} Reactions` : "All reactions";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(36rem,85dvh)] max-w-md overflow-hidden rounded-3xl border-gold/20 bg-card p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {tip.title || "Trading tip"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(min(36rem,85dvh)-5.75rem)] overflow-y-auto p-3">
          {loading ? (
            <div className="grid min-h-32 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : reactions.length ? (
            <div className="space-y-1">
              {reactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="flex items-center gap-3 rounded-2xl p-3 hover:bg-gold/5"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-xs font-bold text-gold">
                    {reaction.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{reaction.full_name}</p>
                    {reaction.email && (
                      <p className="truncate text-xs text-muted-foreground">{reaction.email}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(reaction.created_at))}
                    </p>
                  </div>
                  <span className="text-lg" aria-label={reaction.emoji}>
                    {reaction.emoji}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No reactions found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function EditTip({
  tip,
  onClose,
  onSaved,
}: {
  tip: TradingTip;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(tip.title ?? "");
  const [caption, setCaption] = useState(tip.caption);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [expiry, setExpiry] = useState<Expiry>(tip.expires_at ? "custom" : "forever");
  const [custom, setCustom] = useState(tip.expires_at ? tip.expires_at.slice(0, 16) : "");
  const media = tip.trading_tip_media ?? [];
  async function save() {
    const expiresAt = expiryAt(expiry, custom);
    if (
      !caption.trim() ||
      (expiry === "custom" && (!expiresAt || new Date(expiresAt) <= new Date()))
    )
      return toast.error("Provide a caption and a future custom expiry.");
    setBusy(true);
    try {
      const { error } = await supabase
        .from("trading_tips")
        .update({ title: title.trim() || null, caption: caption.trim(), expires_at: expiresAt })
        .eq("id", tip.id);
      if (error) throw error;
      if (files.length) {
        const start = media.length;
        await uploadTipFiles(tip.id, files, start);
      }
      toast.success("Tip updated.");
      await onSaved();
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setBusy(false);
    }
  }
  async function removeMedia(item: TradingTipMedia) {
    if (!window.confirm("Remove this published media item permanently?")) return;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error();
      await deleteTradingTipMedia({
        data: { tipId: tip.id, mediaId: item.id },
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      toast.success("Media removed. Save or close to refresh.");
      await onSaved();
    } catch {
      toast.error("Could not remove media. A tip must retain one item.");
    }
  }
  async function reorderMedia(index: number, direction: -1 | 1) {
    const next = [...media];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const { error } = await supabase.rpc("admin_reorder_trading_tip_media", {
      p_tip_id: tip.id,
      p_media_ids: next.map((item) => item.id),
    });
    if (error) return toast.error("Could not reorder media.");
    toast.success("Media order updated.");
    await onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Edit trading tip"
        className="mx-auto mt-12 max-w-2xl rounded-3xl bg-card p-6 shadow-elegant"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit tip</h2>
          <Button variant="ghost" size="icon" aria-label="Close edit dialog" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {media.map((item, index) => (
            <div className="flex items-center justify-between rounded-lg border p-2" key={item.id}>
              <span className="text-sm">Media {item.sort_order + 1}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  aria-label={`Move media ${index + 1} earlier`}
                  onClick={() => void reorderMedia(index, -1)}
                >
                  ←
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === media.length - 1}
                  aria-label={`Move media ${index + 1} later`}
                  onClick={() => void reorderMedia(index, 1)}
                >
                  →
                </Button>
                <Button size="sm" variant="outline" onClick={() => void removeMedia(item)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <Input
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
          />
          <Textarea
            value={caption}
            maxLength={3000}
            rows={5}
            onChange={(e) => setCaption(e.target.value)}
          />
          <ExpiryPicker value={expiry} setValue={setExpiry} custom={custom} setCustom={setCustom} />
          <Input
            type="file"
            multiple
            accept={TIP_MEDIA_ACCEPT}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              const valid = selected.filter((file) => {
                const reason = validateTipFile(file);
                if (reason) toast.error(`${file.name}: ${reason}`);
                return !reason;
              });
              if (media.length + files.length + valid.length > MAX_TIP_MEDIA)
                toast.error(`Maximum ${MAX_TIP_MEDIA} media items.`);
              else setFiles((current) => [...current, ...valid]);
              event.currentTarget.value = "";
            }}
          />
          {files.map((file, i) => (
            <div className="flex justify-between text-sm" key={`${file.name}-${i}`}>
              <span>{file.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFiles((current) => current.filter((_, index) => index !== i))}
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy && <Loader2 className="animate-spin" />}Save changes
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
