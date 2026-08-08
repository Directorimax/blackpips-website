import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getEmbeddableVideoUrl } from "@/lib/video-url";

export const Route = createFileRoute("/admin/alc-library")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminAlcLibrary />
    </AuthenticatedRouteGuard>
  ),
});

type Module = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};
type Video = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string;
  sort_order: number;
  is_published: boolean;
};
type ModuleForm = {
  id: string | null;
  title: string;
  description: string;
  order: string;
  published: boolean;
};
type VideoForm = {
  id: string | null;
  moduleId: string;
  title: string;
  description: string;
  videoUrl: string;
  order: string;
  published: boolean;
};

const blankModule = (): ModuleForm => ({
  id: null,
  title: "",
  description: "",
  order: "",
  published: false,
});
const blankVideo = (moduleId = ""): VideoForm => ({
  id: null,
  moduleId,
  title: "",
  description: "",
  videoUrl: "",
  order: "",
  published: false,
});

function AdminAlcLibrary() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(blankModule());
  const [videoForm, setVideoForm] = useState<VideoForm>(blankVideo());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [moduleResult, videoResult] = await Promise.all([
      supabase.rpc("admin_list_alc_modules"),
      supabase.rpc("admin_list_alc_videos"),
    ]);
    if (moduleResult.error || videoResult.error) {
      console.error("[admin-alc-library] load failed", moduleResult.error ?? videoResult.error);
      toast.error("Could not load the ALC library.");
    } else {
      setModules(moduleResult.data ?? []);
      setVideos(videoResult.data ?? []);
      setVideoForm((current) =>
        current.moduleId || !moduleResult.data?.[0]
          ? current
          : { ...current, moduleId: moduleResult.data[0].id },
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const videosByModule = useMemo(
    () =>
      new Map(
        modules.map((module) => [
          module.id,
          videos.filter((video) => video.module_id === module.id),
        ]),
      ),
    [modules, videos],
  );

  async function saveModule(event: React.FormEvent) {
    event.preventDefault();
    const title = moduleForm.title.trim();
    const order = moduleForm.order ? Number(moduleForm.order) : null;
    if (!title) return toast.error("Module title is required.");
    if (order !== null && (!Number.isInteger(order) || order < 1))
      return toast.error("Module order must be a positive whole number.");
    setBusy(true);
    const { error } = await supabase.rpc("admin_save_alc_module", {
      p_module_id: moduleForm.id,
      p_title: title,
      p_description: moduleForm.description.trim() || null,
      p_sort_order: order,
      p_is_published: moduleForm.published,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(moduleForm.id ? "Module updated." : "Module created.");
    setModuleForm(blankModule());
    await load();
  }

  async function saveVideo(event: React.FormEvent) {
    event.preventDefault();
    const order = videoForm.order ? Number(videoForm.order) : null;
    if (!videoForm.moduleId) return toast.error("Select a module.");
    if (!videoForm.title.trim()) return toast.error("Video title is required.");
    if (!getEmbeddableVideoUrl(videoForm.videoUrl))
      return toast.error("Use a supported HTTPS YouTube watch, short, Shorts, or embed URL.");
    if (order !== null && (!Number.isInteger(order) || order < 1))
      return toast.error("Video order must be a positive whole number.");
    setBusy(true);
    const { error } = await supabase.rpc("admin_save_alc_video", {
      p_video_id: videoForm.id,
      p_module_id: videoForm.moduleId,
      p_title: videoForm.title.trim(),
      p_description: videoForm.description.trim() || null,
      p_video_url: videoForm.videoUrl.trim(),
      p_sort_order: order,
      p_is_published: videoForm.published,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(videoForm.id ? "Video updated." : "Video added.");
    setVideoForm(blankVideo(videoForm.moduleId));
    await load();
  }

  async function moveVideo(video: Video, direction: "up" | "down") {
    setBusy(true);
    const { error } = await supabase.rpc("admin_move_alc_video", {
      p_video_id: video.id,
      p_direction: direction,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else await load();
  }

  async function deleteVideo(video: Video) {
    if (!window.confirm(`Delete “${video.title}” from the ALC library?`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_delete_alc_video", { p_video_id: video.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (videoForm.id === video.id) setVideoForm(blankVideo(video.module_id));
    toast.success("Video deleted.");
    await load();
  }

  if (adminLoading || !isAdmin) return null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
        <ShieldCheck className="h-4 w-4" /> Administration
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold">ALC video library</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage the separate library available only to approved ALC Access learners.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <Editor
          title={moduleForm.id ? "Edit module" : "Create module"}
          onSubmit={saveModule}
          busy={busy}
          action={moduleForm.id ? "Save module" : "Create module"}
          onCancel={moduleForm.id ? () => setModuleForm(blankModule()) : undefined}
        >
          <Field label="Module title">
            <input
              className="admin-input"
              maxLength={160}
              required
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            />
          </Field>
          <Field label="Module order">
            <input
              className="admin-input"
              inputMode="numeric"
              placeholder="Automatic"
              value={moduleForm.order}
              onChange={(e) => setModuleForm({ ...moduleForm, order: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="admin-input min-h-24"
              maxLength={1000}
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
            />
          </Field>
          <Check
            label="Published to approved learners"
            checked={moduleForm.published}
            onChange={(published) => setModuleForm({ ...moduleForm, published })}
          />
        </Editor>

        <Editor
          title={videoForm.id ? "Edit video" : "Add video"}
          onSubmit={saveVideo}
          busy={busy}
          action={videoForm.id ? "Save video" : "Add video"}
          onCancel={videoForm.id ? () => setVideoForm(blankVideo(videoForm.moduleId)) : undefined}
        >
          <Field label="Module">
            <select
              className="admin-input"
              required
              value={videoForm.moduleId}
              onChange={(e) => setVideoForm({ ...videoForm, moduleId: e.target.value })}
            >
              <option value="">Select a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Video title">
            <input
              className="admin-input"
              maxLength={160}
              required
              value={videoForm.title}
              onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
            />
          </Field>
          <Field label="Video URL (YouTube HTTPS)">
            <input
              className="admin-input"
              type="url"
              required
              placeholder="https://…"
              value={videoForm.videoUrl}
              onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
            />
          </Field>
          <Field label="Order">
            <input
              className="admin-input"
              inputMode="numeric"
              placeholder="Automatic"
              value={videoForm.order}
              onChange={(e) => setVideoForm({ ...videoForm, order: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="admin-input min-h-24"
              maxLength={1000}
              value={videoForm.description}
              onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
            />
          </Field>
          <Check
            label="Published to approved learners"
            checked={videoForm.published}
            onChange={(published) => setVideoForm({ ...videoForm, published })}
          />
        </Editor>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-xl font-semibold">Modules and videos</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading ALC content…</p>
        ) : modules.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Create a module before adding videos.
          </div>
        ) : (
          modules.map((module) => {
            const moduleVideos = videosByModule.get(module.id) ?? [];
            return (
              <article key={module.id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {module.sort_order}. {module.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {module.description || "No description"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <State published={module.is_published} />
                    <button
                      className="admin-icon"
                      aria-label={`Edit ${module.title}`}
                      onClick={() =>
                        setModuleForm({
                          id: module.id,
                          title: module.title,
                          description: module.description ?? "",
                          order: String(module.sort_order),
                          published: module.is_published,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {moduleVideos.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">No videos in this module.</p>
                  ) : (
                    moduleVideos.map((video, index) => (
                      <div
                        key={video.id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              {video.sort_order}. {video.title}
                            </span>
                            <State published={video.is_published} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {video.description || "No description"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Icon
                            label={`Move ${video.title} up`}
                            disabled={busy || index === 0}
                            onClick={() => void moveVideo(video, "up")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Icon>
                          <Icon
                            label={`Move ${video.title} down`}
                            disabled={busy || index === moduleVideos.length - 1}
                            onClick={() => void moveVideo(video, "down")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Icon>
                          <Icon
                            label={`Edit ${video.title}`}
                            onClick={() =>
                              setVideoForm({
                                id: video.id,
                                moduleId: video.module_id,
                                title: video.title,
                                description: video.description ?? "",
                                videoUrl: video.video_url,
                                order: String(video.sort_order),
                                published: video.is_published,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Icon>
                          <Icon
                            label={`Delete ${video.title}`}
                            onClick={() => void deleteVideo(video)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Icon>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function Editor({
  title,
  children,
  onSubmit,
  busy,
  action,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent) => void;
  busy: boolean;
  action: string;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-muted-foreground"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
      <button
        disabled={busy}
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {busy ? "Saving…" : action}
      </button>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-semibold">
      <input
        type="checkbox"
        className="h-4 w-4 accent-amber-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function State({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${published ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-300" : "border-border text-muted-foreground"}`}
    >
      {published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {published ? "Published" : "Draft"}
    </span>
  );
}
function Icon({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className="admin-icon" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
