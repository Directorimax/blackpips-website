import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileVideo,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getEmbeddableVideoUrl } from "@/lib/video-url";
import { formatBytes, readVideoDuration, type UploadProgress } from "@/lib/admin-course-media";
import {
  ALC_MEDIA_BUCKET,
  alcPosterPath,
  alcVideoPath,
  type AlcMediaSource,
  startResumableAlcVideoUpload,
  validateAlcVideo,
} from "@/lib/admin-alc-media";

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
  video_url: string | null;
  sort_order: number;
  is_published: boolean;
  media_source: AlcMediaSource;
  video_storage_path: string | null;
  video_poster_path: string | null;
  video_mime_type: string | null;
  video_duration_seconds: number | null;
  media_finalized_at: string | null;
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
  mediaSource: "external" | "self_hosted";
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
  mediaSource: "self_hosted",
});

export function AdminAlcLibrary({ embedded = false }: { embedded?: boolean }) {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(blankModule());
  const [videoForm, setVideoForm] = useState<VideoForm>(blankVideo());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<
    "ready" | "uploading" | "finalizing" | "failed" | "complete"
  >("ready");
  const [uploadError, setUploadError] = useState("");
  const [progress, setProgress] = useState<UploadProgress>({
    uploaded: 0,
    total: 0,
    percentage: 0,
  });
  const cancelRef = useRef<null | (() => Promise<void>)>(null);
  const initializedVideoIdRef = useRef<string | null>(null);
  const storageUploadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [moduleResult, videoResult, mediaResult] = await Promise.all([
      supabase.rpc("admin_list_alc_modules"),
      supabase.rpc("admin_list_alc_videos"),
      supabase.rpc("admin_list_alc_video_media"),
    ]);
    if (moduleResult.error || videoResult.error || mediaResult.error) {
      console.error(
        "[admin-alc-library] load failed",
        moduleResult.error ?? videoResult.error ?? mediaResult.error,
      );
      toast.error("Could not load the ALC library.");
    } else {
      setModules(moduleResult.data ?? []);
      const mediaById = new Map((mediaResult.data ?? []).map((row) => [row.video_id, row]));
      setVideos(
        (videoResult.data ?? []).map((video) => ({
          ...video,
          media_source: mediaById.get(video.id)?.media_source ?? "external",
          video_storage_path: mediaById.get(video.id)?.video_storage_path ?? null,
          video_poster_path: mediaById.get(video.id)?.video_poster_path ?? null,
          video_mime_type: mediaById.get(video.id)?.video_mime_type ?? null,
          video_duration_seconds: mediaById.get(video.id)?.video_duration_seconds ?? null,
          media_finalized_at: mediaById.get(video.id)?.media_finalized_at ?? null,
        })),
      );
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
    if (videoForm.mediaSource === "external" && !getEmbeddableVideoUrl(videoForm.videoUrl))
      return toast.error("Use a supported HTTPS YouTube watch, short, Shorts, or embed URL.");
    if (order !== null && (!Number.isInteger(order) || order < 1))
      return toast.error("Video order must be a positive whole number.");
    if (videoForm.mediaSource === "external") {
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
      toast.success(videoForm.id ? "External video updated." : "External video added.");
      resetVideoForm(videoForm.moduleId);
      await load();
      return;
    }
    await saveSelfHostedVideo(order);
  }

  function resetVideoForm(moduleId = videoForm.moduleId) {
    setVideoForm(blankVideo(moduleId));
    setSelectedFile(null);
    setUploadError("");
    setUploadState("ready");
    setProgress({ uploaded: 0, total: 0, percentage: 0 });
    initializedVideoIdRef.current = null;
    storageUploadedRef.current = false;
  }

  function selectUpload(files: FileList) {
    const file = files[0];
    if (!file) return;
    const validation = validateAlcVideo(file);
    if (validation) {
      setSelectedFile(null);
      setUploadError(validation);
      return;
    }
    setSelectedFile(file);
    setUploadError("");
    setUploadState("ready");
    storageUploadedRef.current = false;
  }

  function chooseVideoSource(mediaSource: "external" | "self_hosted") {
    if (videoForm.id && videoForm.mediaSource !== mediaSource) {
      toast.error(
        "Existing videos keep their current source. Create a new video to use another source.",
      );
      return;
    }
    setVideoForm((current) => ({
      ...current,
      mediaSource,
      videoUrl: mediaSource === "external" ? current.videoUrl : "",
    }));
    setSelectedFile(null);
    setUploadError("");
    setUploadState("ready");
  }

  async function saveSelfHostedVideo(order: number | null) {
    const existing = videoForm.id ? videos.find((video) => video.id === videoForm.id) : null;
    if (!videoForm.id && !selectedFile)
      return toast.error("Choose a video file before initializing the draft.");
    if (selectedFile) {
      const validation = validateAlcVideo(selectedFile);
      if (validation) return toast.error(validation);
    }
    setBusy(true);
    setUploadError("");
    try {
      let videoId = videoForm.id ?? initializedVideoIdRef.current;
      let duration = existing?.video_duration_seconds ?? 0;
      if (selectedFile) duration = await readVideoDuration(selectedFile);
      if (!videoId) {
        const { data, error } = await supabase.rpc("admin_initialize_alc_self_hosted_video", {
          p_module_id: videoForm.moduleId,
          p_title: videoForm.title.trim(),
          p_description: videoForm.description.trim() || null,
          p_sort_order: order,
          p_video_mime_type: selectedFile!.type,
          p_video_duration_seconds: duration,
          p_has_poster: false,
        });
        if (error) throw error;
        videoId = rpcId(data);
        if (!videoId) throw new Error("The backend did not return the initialized video UUID.");
        initializedVideoIdRef.current = videoId;
        setVideoForm((current) => ({ ...current, id: videoId }));
      } else {
        const { error } = await supabase.rpc("admin_update_alc_self_hosted_video", {
          p_video_id: videoId,
          p_title: videoForm.title.trim(),
          p_description: videoForm.description.trim() || null,
          p_sort_order: order,
          p_is_published: selectedFile ? false : videoForm.published,
        });
        if (error) throw error;
      }
      if (selectedFile && !storageUploadedRef.current) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session)
          throw new Error("Your administrator session expired. Sign in again.");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const publishableKey =
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          "";
        if (!supabaseUrl || !publishableKey)
          throw new Error("Storage configuration is unavailable.");
        setUploadState("uploading");
        setProgress({ uploaded: 0, total: selectedFile.size, percentage: 0 });
        const task = startResumableAlcVideoUpload({
          file: selectedFile,
          supabaseUrl,
          accessToken: sessionData.session.access_token,
          publishableKey,
          moduleId: videoForm.moduleId,
          videoId,
          upsert: Boolean(existing?.video_storage_path) || Boolean(initializedVideoIdRef.current),
          onProgress: setProgress,
        });
        cancelRef.current = task.cancel;
        await task.completion;
        cancelRef.current = null;
        storageUploadedRef.current = true;
      }
      if (selectedFile) {
        setUploadState("finalizing");
        const { error } = await supabase.rpc("admin_finalize_alc_self_hosted_video", {
          p_video_id: videoId,
          p_video_mime_type: selectedFile.type,
          p_video_duration_seconds: duration,
          p_has_poster: Boolean(existing?.video_poster_path),
          p_is_published: videoForm.published,
        });
        if (error) throw error;
      }
      setUploadState("complete");
      toast.success(
        selectedFile ? "Uploaded video finalized successfully." : "Uploaded video updated.",
      );
      resetVideoForm(videoForm.moduleId);
      await load();
    } catch (error) {
      console.error("[admin-alc-library] self-hosted save failed", error);
      setUploadError(
        error instanceof Error ? error.message : "The uploaded video could not be saved.",
      );
      setUploadState("failed");
    } finally {
      cancelRef.current = null;
      setBusy(false);
    }
  }

  async function cancelUpload() {
    if (!cancelRef.current) return;
    await cancelRef.current();
    cancelRef.current = null;
    setUploadError("Upload cancelled. The unpublished video draft remains safe to retry.");
    setUploadState("failed");
    setBusy(false);
  }

  async function removeSelfHostedMedia(video: Video) {
    if (
      !window.confirm(`Remove uploaded media from “${video.title}”? The video record will remain.`)
    )
      return;
    setBusy(true);
    try {
      const { error: unpublishError } = await supabase.rpc("admin_update_alc_self_hosted_video", {
        p_video_id: video.id,
        p_title: video.title,
        p_description: video.description,
        p_sort_order: video.sort_order,
        p_is_published: false,
      });
      if (unpublishError) throw unpublishError;
      const paths = [alcVideoPath(video.module_id, video.id)];
      if (video.video_poster_path) paths.push(alcPosterPath(video.module_id, video.id));
      const { error: storageError } = await supabase.storage.from(ALC_MEDIA_BUCKET).remove(paths);
      if (storageError) throw storageError;
      const { error: clearError } = await supabase.rpc("admin_clear_alc_self_hosted_media", {
        p_video_id: video.id,
      });
      if (clearError) throw clearError;
      toast.success("Uploaded media removed. The video record remains as a draft.");
      await load();
    } catch (error) {
      console.error("[admin-alc-library] remove media failed", error);
      toast.error("Media removal did not complete. Retry safely.");
    } finally {
      setBusy(false);
    }
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

  function editVideo(video: Video) {
    resetVideoForm(video.module_id);
    setVideoForm({
      id: video.id,
      moduleId: video.module_id,
      title: video.title,
      description: video.description ?? "",
      videoUrl: video.video_url ?? "",
      order: String(video.sort_order),
      published: video.is_published,
      mediaSource: video.media_source === "external" ? "external" : "self_hosted",
    });
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
    <main className={embedded ? "mt-8" : "mx-auto max-w-6xl px-4 py-16"}>
      {!embedded && (
        <>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
            <ShieldCheck className="h-4 w-4" /> Administration
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">ALC video library</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the separate library available only to approved ALC Access learners.
          </p>
        </>
      )}

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
          action={
            videoForm.mediaSource === "external"
              ? videoForm.id
                ? "Save link"
                : "Add by link"
              : videoForm.id
                ? "Save uploaded video"
                : "Initialize and upload"
          }
          onCancel={videoForm.id ? () => resetVideoForm(videoForm.moduleId) : undefined}
        >
          <div className="grid grid-cols-2 gap-2" aria-label="Video source">
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${videoForm.mediaSource === "self_hosted" ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
              onClick={() => chooseVideoSource("self_hosted")}
            >
              Upload Video
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${videoForm.mediaSource === "external" ? "border-gold/50 bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
              onClick={() => chooseVideoSource("external")}
            >
              Add by Link
            </button>
          </div>
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
          {videoForm.mediaSource === "external" && (
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
          )}
          {videoForm.mediaSource === "self_hosted" && (
            <div>
              <MediaDropzone
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                disabled={busy}
                onFiles={selectUpload}
              >
                <span>
                  <FileVideo className="mx-auto h-7 w-7 text-gold" />
                  <span className="mt-2 block text-sm font-semibold">
                    Drag and drop or select media
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    MP4, WebM, or QuickTime · Up to 3 GiB
                  </span>
                </span>
              </MediaDropzone>
              {selectedFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(selectedFile.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    className="admin-icon"
                    aria-label={`Remove ${selectedFile.name}`}
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {(uploadState === "uploading" || progress.total > 0) && (
                <div className="mt-3" aria-live="polite">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{uploadState === "finalizing" ? "Finalizing" : "Uploading"}</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-gold"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(progress.uploaded)} / {formatBytes(progress.total)}
                  </p>
                </div>
              )}
              {uploadError && (
                <div
                  className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {uploadError}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadState === "uploading" && (
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-2 text-xs font-semibold"
                    onClick={() => void cancelUpload()}
                  >
                    Cancel upload
                  </button>
                )}
                {uploadState === "failed" && selectedFile && (
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-2 text-xs font-semibold text-gold"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
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
          {videoForm.mediaSource === "self_hosted" && (
            <p className="text-xs text-muted-foreground">
              Publication is applied only after Storage upload and checked backend finalization
              succeed.
            </p>
          )}
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
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                              {video.media_source === "self_hosted"
                                ? video.media_finalized_at
                                  ? "Uploaded"
                                  : "Upload pending"
                                : video.media_source === "external"
                                  ? "External"
                                  : "No media"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {video.description || "No description"}
                            {video.video_duration_seconds
                              ? ` · ${formatAlcDuration(video.video_duration_seconds)}`
                              : ""}
                            {video.video_mime_type ? ` · ${video.video_mime_type}` : ""}
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
                          <Icon label={`Edit ${video.title}`} onClick={() => editVideo(video)}>
                            <Pencil className="h-4 w-4" />
                          </Icon>
                          {video.media_source === "self_hosted" && (
                            <Icon
                              label={`Remove uploaded media from ${video.title}`}
                              disabled={busy}
                              onClick={() => void removeSelfHostedMedia(video)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Icon>
                          )}
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

function rpcId(data: unknown): string | null {
  if (typeof data === "string") return data;
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return typeof row.video_id === "string"
    ? row.video_id
    : typeof row.id === "string"
      ? row.id
      : null;
}

function formatAlcDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
