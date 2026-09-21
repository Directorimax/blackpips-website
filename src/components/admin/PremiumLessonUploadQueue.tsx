import { FileVideo, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  formatBytes,
  readVideoDuration,
  resumableEndpoint,
  startResumableCourseVideoUpload,
  courseVideoPath,
  validateCourseVideo,
} from "@/lib/admin-course-media";
import { waitForMediaFaststart } from "@/lib/admin-media-faststart";
import {
  PREMIUM_UPLOAD_CONCURRENCY,
  canEditQueuedMetadata,
  nextQueuedItems,
  titleFromVideoFilename,
  type PremiumUploadQueueItem,
} from "@/lib/premium-upload-queue";
import { MediaDropzone } from "./MediaDropzone";

type Props = {
  courseId: string;
  phaseCount?: number;
  onChanged: () => Promise<void>;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function PremiumLessonUploadQueue({ courseId, phaseCount, onChanged }: Props) {
  const [items, setItems] = useState<PremiumUploadQueueItem[]>([]);
  const itemsRef = useRef(items);
  const activeRef = useRef(new Map<string, number>());
  const generationRef = useRef(new Map<string, number>());
  const cancelRef = useRef(new Map<string, { generation: number; cancel: () => Promise<void> }>());
  const mountedRef = useRef(true);
  itemsRef.current = items;

  const update = useCallback(
    (id: string, values: Partial<PremiumUploadQueueItem>) =>
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...values } : item)),
      ),
    [],
  );

  const runItem = useCallback(
    async (initial: PremiumUploadQueueItem, generation: number) => {
      const id = initial.id;
      let lessonId = initial.lessonId;
      const assertCurrent = () => {
        if (generationRef.current.get(id) !== generation) throw new Error("Upload cancelled.");
      };
      try {
        assertCurrent();
        const snapshot = itemsRef.current.find((item) => item.id === id) ?? initial;
        if (!snapshot.title.trim()) throw new Error("Enter a lesson title before upload.");
        const validation = validateCourseVideo(snapshot.file);
        if (validation) throw new Error(validation);
        const position = snapshot.position.trim() ? Number(snapshot.position) : null;
        if (position !== null && (!Number.isInteger(position) || position < 1)) {
          throw new Error("Position must be a whole number greater than zero.");
        }
        if (phaseCount && snapshot.phaseNumber === null) throw new Error("Choose a phase.");

        const save = await supabase.rpc("admin_save_lesson_v3", {
          p_lesson_id: lessonId,
          p_course_id: courseId,
          p_title: snapshot.title.trim(),
          p_slug: slugify(snapshot.title),
          p_description: snapshot.description.trim() || null,
          p_video_url: null,
          p_position: position,
          p_is_published: false,
          p_learning_category: null,
          p_phase_number: snapshot.phaseNumber,
        });
        if (save.error) throw new Error(save.error.message);
        lessonId = save.data?.[0]?.id ?? lessonId;
        if (!lessonId) throw new Error("The backend did not return a lesson UUID.");
        // Retain an authoritative draft identity even if cancellation happened while
        // the RPC was in flight, so a later retry updates instead of duplicating it.
        update(id, { lessonId });
        assertCurrent();
        update(id, { lessonId, status: "uploading", error: "" });

        const { data: sessionData } = await supabase.auth.getSession();
        assertCurrent();
        const session = sessionData.session;
        if (!session) throw new Error("Your administrator session expired. Sign in again.");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const publishableKey =
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          "";
        if (!supabaseUrl || !publishableKey)
          throw new Error("Storage configuration is unavailable.");

        const duration = await readVideoDuration(snapshot.file);
        assertCurrent();
        const task = startResumableCourseVideoUpload({
          file: snapshot.file,
          endpoint: resumableEndpoint(supabaseUrl),
          accessToken: session.access_token,
          publishableKey,
          objectPath: courseVideoPath(courseId, lessonId),
          upsert: Boolean(initial.lessonId),
          onProgress: (progress) => {
            if (generationRef.current.get(id) === generation) {
              update(id, { progress: progress.percentage });
            }
          },
        });
        cancelRef.current.set(id, { generation, cancel: task.cancel });
        await task.completion;
        assertCurrent();
        if (cancelRef.current.get(id)?.generation === generation) cancelRef.current.delete(id);
        update(id, { status: "processing", progress: 100 });

        const { error: mediaError } = await supabase.rpc(
          "admin_set_lesson_media" as never,
          {
            p_lesson_id: lessonId,
            p_media_source: "self_hosted",
            p_video_mime_type: "video/mp4",
            p_video_duration_seconds: duration,
            p_has_poster: false,
          } as never,
        );
        if (mediaError) throw mediaError;
        assertCurrent();
        const processing = await waitForMediaFaststart({
          targetKind: "lesson",
          targetId: lessonId,
        });
        if (processing?.state === "failed") {
          throw new Error(processing.lastError || "Video processing failed.");
        }
        assertCurrent();
        if (position !== null) {
          const { error } = await supabase.rpc("admin_reorder_lesson_v3", {
            p_lesson_id: lessonId,
            p_learning_category: null,
            p_phase_number: snapshot.phaseNumber,
            p_position: position,
          });
          if (error) throw new Error(error.message);
        }
        assertCurrent();
        update(id, { status: "completed", progress: 100, error: "", lessonId });
        await onChanged();
      } catch (error) {
        if (!mountedRef.current) return;
        if (generationRef.current.get(id) !== generation) return;
        update(id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Upload failed.",
          lessonId,
        });
      } finally {
        if (cancelRef.current.get(id)?.generation === generation) cancelRef.current.delete(id);
        if (activeRef.current.get(id) === generation) activeRef.current.delete(id);
        if (mountedRef.current) setItems((current) => [...current]);
      }
    },
    [courseId, onChanged, phaseCount, update],
  );

  useEffect(() => {
    const next = nextQueuedItems(items, activeRef.current.size);
    for (const item of next) {
      const generation = (generationRef.current.get(item.id) ?? 0) + 1;
      generationRef.current.set(item.id, generation);
      activeRef.current.set(item.id, generation);
      update(item.id, { status: "uploading", error: "" });
      void runItem(item, generation);
    }
  }, [items, runItem, update]);

  useEffect(() => {
    mountedRef.current = true;
    const cancellations = cancelRef.current;
    return () => {
      mountedRef.current = false;
      for (const task of cancellations.values()) void task.cancel();
    };
  }, []);

  function addFiles(files: FileList) {
    const additions: PremiumUploadQueueItem[] = [];
    for (const file of Array.from(files)) {
      const validation = validateCourseVideo(file);
      if (validation) {
        toast.error(`${file.name}: ${validation}`);
        continue;
      }
      additions.push({
        id: crypto.randomUUID(),
        file,
        title: titleFromVideoFilename(file.name),
        description: "",
        position: "",
        phaseNumber: phaseCount ? 1 : null,
        status: "queued",
        progress: 0,
        error: "",
        lessonId: null,
      });
    }
    setItems((current) => [...current, ...additions]);
  }

  async function cancel(id: string) {
    const currentGeneration = generationRef.current.get(id) ?? 0;
    generationRef.current.set(id, currentGeneration + 1);
    activeRef.current.delete(id);
    const task = cancelRef.current.get(id);
    cancelRef.current.delete(id);
    update(id, { status: "failed", error: "Upload cancelled. Retry when ready." });
    try {
      if (task?.generation === currentGeneration) await task.cancel();
    } catch {
      // The item is already invalidated locally; abort errors must not revive stale work.
    } finally {
      setItems((current) => [...current]);
    }
  }

  if (!courseId) return null;
  return (
    <section className="glass mt-8 rounded-3xl p-5 sm:p-6" aria-label="Premium video upload queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Add / Upload Premium Lessons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Two private videos upload at a time. Every successful file remains independent.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setItems((current) => current.filter((item) => item.status !== "completed"))
            }
            className="text-xs font-semibold text-muted-foreground"
          >
            Clear completed
          </button>
        )}
      </div>
      <div className="mt-4">
        <MediaDropzone accept="video/mp4,.mp4" multiple onFiles={addFiles}>
          <span>
            <FileVideo className="mx-auto h-7 w-7 text-gold" />
            <span className="mt-2 block text-sm font-semibold">
              Drag and drop or select one or more MP4 videos
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Resumable private uploads · {PREMIUM_UPLOAD_CONCURRENCY} concurrent
            </span>
          </span>
        </MediaDropzone>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const editable = canEditQueuedMetadata(item.status);
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                <FileVideo className="mt-1 h-5 w-5 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{item.file.name}</p>
                    <span className="text-xs font-semibold capitalize text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_8rem]">
                    <input
                      aria-label={`Title for ${item.file.name}`}
                      value={item.title}
                      disabled={!editable}
                      onChange={(event) => update(item.id, { title: event.target.value })}
                      className="admin-input"
                      placeholder="Lesson title"
                    />
                    <input
                      aria-label={`Position for ${item.file.name}`}
                      value={item.position}
                      disabled={!editable}
                      onChange={(event) => update(item.id, { position: event.target.value })}
                      className="admin-input"
                      inputMode="numeric"
                      placeholder="Position"
                    />
                    {phaseCount ? (
                      <select
                        aria-label={`Phase for ${item.file.name}`}
                        value={item.phaseNumber ?? ""}
                        disabled={!editable}
                        onChange={(event) =>
                          update(item.id, { phaseNumber: Number(event.target.value) })
                        }
                        className="admin-input"
                      >
                        {Array.from({ length: phaseCount }, (_, index) => index + 1).map(
                          (phase) => (
                            <option key={phase} value={phase}>
                              Phase {phase}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      <span />
                    )}
                  </div>
                  <textarea
                    aria-label={`Description for ${item.file.name}`}
                    value={item.description}
                    disabled={!editable}
                    onChange={(event) => update(item.id, { description: event.target.value })}
                    className="admin-input mt-3 min-h-16 resize-y"
                    placeholder="Description (optional)"
                  />
                  {(item.status !== "queued" || item.progress > 0) && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-gold"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && <p className="mt-2 text-sm text-destructive">{item.error}</p>}
                  <div className="mt-3 flex gap-3">
                    {item.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => update(item.id, { status: "queued", error: "" })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gold"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Retry
                      </button>
                    )}
                    {item.status === "uploading" && (
                      <button
                        type="button"
                        onClick={() => void cancel(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                    {item.status === "queued" && (
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((candidate) => candidate.id !== item.id),
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                    {item.status === "processing" && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing playback
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
