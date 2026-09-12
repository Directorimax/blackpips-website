import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  featuredVideoThumbnail,
  MAX_ACTIVE_FEATURED_VIDEOS,
  normalizeYouTubeVideoId,
  type FeaturedVideo,
} from "@/lib/featured-videos";

export const Route = createFileRoute("/admin/featured-videos")({
  component: () => (
    <AuthenticatedRouteGuard>
      <FeaturedVideosAdmin />
    </AuthenticatedRouteGuard>
  ),
});

type FormState = {
  id: string | null;
  title: string;
  youtubeInput: string;
  displayOrder: number;
  isActive: boolean;
};

const emptyForm = (displayOrder: number): FormState => ({
  id: null,
  title: "",
  youtubeInput: "",
  displayOrder,
  isActive: true,
});

function FeaturedVideosAdmin() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_featured_videos");
    setLoading(false);
    if (error) return toast.error(`Could not load featured videos: ${error.message}`);
    setVideos((data ?? []) as FeaturedVideo[]);
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin) void navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const activeCount = useMemo(() => videos.filter((video) => video.is_active).length, [videos]);

  function edit(video: FeaturedVideo) {
    setForm({
      id: video.id,
      title: video.title,
      youtubeInput: video.youtube_video_id,
      displayOrder: video.display_order,
      isActive: video.is_active,
    });
  }

  async function save() {
    if (!form) return;
    const videoId = normalizeYouTubeVideoId(form.youtubeInput);
    if (!form.title.trim()) return toast.error("Enter a video title.");
    if (!videoId) return toast.error("Enter a valid YouTube watch, Shorts, or youtu.be URL.");
    if (form.isActive && !form.id && activeCount >= MAX_ACTIVE_FEATURED_VIDEOS)
      return toast.error(`Only ${MAX_ACTIVE_FEATURED_VIDEOS} featured videos can be active.`);

    setBusy("save");
    const { error } = await supabase.rpc("admin_save_featured_video", {
      p_video_id: form.id,
      p_youtube_video_id: videoId,
      p_title: form.title.trim(),
      p_display_order: form.displayOrder,
      p_is_active: form.isActive,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Featured video updated." : "Featured video added.");
    setForm(null);
    await load();
  }

  async function toggle(video: FeaturedVideo) {
    if (!video.is_active && activeCount >= MAX_ACTIVE_FEATURED_VIDEOS)
      return toast.error(
        `Disable another video first. Only ${MAX_ACTIVE_FEATURED_VIDEOS} may be active.`,
      );
    setBusy(video.id);
    const { error } = await supabase.rpc("admin_save_featured_video", {
      p_video_id: video.id,
      p_youtube_video_id: video.youtube_video_id,
      p_title: video.title,
      p_display_order: video.display_order,
      p_is_active: !video.is_active,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    await load();
  }

  async function move(video: FeaturedVideo, direction: "up" | "down") {
    setBusy(video.id);
    const { error } = await supabase.rpc("admin_move_featured_video", {
      p_video_id: video.id,
      p_direction: direction,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    await load();
  }

  async function remove(video: FeaturedVideo) {
    if (!window.confirm(`Delete “${video.title}” from Featured Videos?`)) return;
    setBusy(video.id);
    const { error } = await supabase.rpc("admin_delete_featured_video", { p_video_id: video.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Featured video deleted.");
    if (form?.id === video.id) setForm(null);
    await load();
  }

  if (adminLoading || !isAdmin)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Administration
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">Featured Videos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage the videos shown on the app Home screen. Up to five may be active at once.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setForm(emptyForm(videos.length + 1))}
          disabled={Boolean(form)}
        >
          <Plus className="size-4" /> Add video
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm">
        <span className="font-semibold text-gold">
          {activeCount}/{MAX_ACTIVE_FEATURED_VIDEOS}
        </span>{" "}
        active featured videos
      </div>

      {form && (
        <section
          className="mt-6 rounded-3xl border border-gold/25 bg-card p-5 shadow-elegant sm:p-6"
          aria-label={form.id ? "Edit featured video" : "Add featured video"}
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-bold">
              {form.id ? "Edit featured video" : "Add featured video"}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setForm(null)}
              aria-label="Close editor"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Title
              <Input
                value={form.title}
                maxLength={160}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              YouTube URL or video ID
              <Input
                value={form.youtubeInput}
                placeholder="https://www.youtube.com/watch?v=…"
                onChange={(event) => setForm({ ...form, youtubeInput: event.target.value })}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Display position
              <Input
                type="number"
                min={1}
                value={form.displayOrder}
                onChange={(event) =>
                  setForm({ ...form, displayOrder: Math.max(1, Number(event.target.value) || 1) })
                }
              />
            </label>
            <label className="flex items-center gap-3 self-end rounded-xl border border-border px-4 py-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />{" "}
              Active
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={busy === "save"}>
              {busy === "save" && <Loader2 className="size-4 animate-spin" />} Save video
            </Button>
          </div>
        </section>
      )}

      <section className="mt-8 space-y-4" aria-label="Featured video list">
        {loading ? (
          <div className="grid min-h-48 place-items-center">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <Video className="mx-auto size-7 text-gold" />
            <p className="mt-3 font-semibold">No featured videos configured</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The learner Home screen should show its normal empty state.
            </p>
          </div>
        ) : (
          videos.map((video, index) => (
            <article
              key={video.id}
              className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
            >
              <img
                src={featuredVideoThumbnail(video.youtube_video_id)}
                alt=""
                className="aspect-video w-full rounded-xl object-cover"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold">{video.title}</h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${video.is_active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border bg-muted text-muted-foreground"}`}
                  >
                    {video.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Position {video.display_order} · {video.youtube_video_id}
                </p>
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-gold hover:underline"
                  onClick={() => void toggle(video)}
                  disabled={busy === video.id}
                >
                  {video.is_active ? "Disable" : "Enable"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 sm:justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move up"
                  disabled={index === 0 || busy === video.id}
                  onClick={() => void move(video, "up")}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={index === videos.length - 1 || busy === video.id}
                  onClick={() => void move(video, "down")}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() => edit(video)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Delete"
                  onClick={() => void remove(video)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
