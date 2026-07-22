import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getEmbeddableVideoUrl } from "@/lib/video-url";

export const Route = createFileRoute("/admin/lessons")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminLessons />
    </AuthenticatedRouteGuard>
  ),
});

type Course = { id: string; title: string; slug: string };
type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  video_url: string | null;
  position: number;
  is_published: boolean;
};
type FormState = {
  id: string | null;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  videoUrl: string;
  position: string;
  isPublished: boolean;
};

const blankForm = (courseId = ""): FormState => ({
  id: null,
  courseId,
  title: "",
  slug: "",
  description: "",
  videoUrl: "",
  position: "",
  isPublished: false,
});

function AdminLessons() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Lesson | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

  const loadLessons = useCallback(async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_lessons", { p_course_id: courseId });
    if (error) {
      console.error("Could not load admin lessons", error);
      toast.error("Could not load lessons.");
    } else {
      setLessons(
        (data ?? []).map(({ lesson_position, ...lesson }) => ({
          ...lesson,
          position: lesson_position,
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    supabase
      .from("courses")
      .select("id,title,slug")
      .order("title")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load courses", error);
          toast.error("Could not load premium courses.");
          setLoading(false);
          return;
        }
        const rows = data ?? [];
        setCourses(rows);
        const firstCourseId = rows[0]?.id ?? "";
        setSelectedCourseId(firstCourseId);
        setForm(blankForm(firstCourseId));
        if (!firstCourseId) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (selectedCourseId) void loadLessons(selectedCourseId);
  }, [loadLessons, selectedCourseId]);

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setForm(blankForm(courseId));
  }

  function editLesson(lesson: Lesson) {
    setForm({
      id: lesson.id,
      courseId: lesson.course_id,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description ?? "",
      videoUrl: lesson.video_url ?? "",
      position: String(lesson.position),
      isPublished: lesson.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: current.id || !current.slug ? slugify(title) : current.slug,
    }));
  }

  async function saveLesson(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const title = form.title.trim();
    if (!title) return toast.error("Lesson title is required.");
    if (!form.courseId) return toast.error("Select a course first.");
    if (form.videoUrl.trim() && !getEmbeddableVideoUrl(form.videoUrl)) {
      return toast.error("Use a supported HTTPS YouTube watch, short, Shorts, or embed URL.");
    }
    const position = form.position.trim() ? Number(form.position) : null;
    if (position !== null && (!Number.isInteger(position) || position < 1)) {
      return toast.error("Position must be a whole number greater than zero.");
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_lesson", {
      p_lesson_id: form.id,
      p_course_id: form.courseId,
      p_title: title,
      p_slug: form.slug.trim() || null,
      p_description: form.description.trim() || null,
      p_video_url: form.videoUrl.trim() || null,
      p_position: position,
      p_is_published: form.isPublished,
    });
    if (error) {
      console.error("Could not save lesson", error);
      toast.error(error.message || "Could not save lesson.");
    } else {
      toast.success(form.id ? "Lesson updated." : "Lesson created.");
      setSelectedCourseId(form.courseId);
      setForm(blankForm(form.courseId));
      await loadLessons(form.courseId);
    }
    setSaving(false);
  }

  async function moveLesson(lesson: Lesson, direction: "up" | "down") {
    if (moving || saving) return;
    setMoving(lesson.id);
    const { error } = await supabase.rpc("admin_move_lesson", {
      p_lesson_id: lesson.id,
      p_direction: direction,
    });
    if (error) {
      console.error("Could not reorder lesson", error);
      toast.error("Could not reorder lesson.");
    } else {
      await loadLessons(selectedCourseId);
    }
    setMoving(null);
  }

  async function togglePublished(lesson: Lesson) {
    if (saving || moving) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_lesson", {
      p_lesson_id: lesson.id,
      p_course_id: lesson.course_id,
      p_title: lesson.title,
      p_slug: lesson.slug,
      p_description: lesson.description,
      p_video_url: lesson.video_url,
      p_position: lesson.position,
      p_is_published: !lesson.is_published,
    });
    if (error) {
      console.error("Could not update lesson visibility", error);
      toast.error("Could not update lesson visibility.");
    } else {
      toast.success(lesson.is_published ? "Lesson unpublished." : "Lesson published.");
      await loadLessons(selectedCourseId);
    }
    setSaving(false);
  }

  async function deleteLesson() {
    if (!deleting || saving) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_delete_lesson", { p_lesson_id: deleting.id });
    if (error) {
      console.error("Could not delete lesson", error);
      toast.error("Could not delete lesson.");
    } else {
      toast.success("Lesson deleted.");
      if (form.id === deleting.id) setForm(blankForm(selectedCourseId));
      setDeleting(null);
      await loadLessons(selectedCourseId);
    }
    setSaving(false);
  }

  if (adminLoading || !isAdmin) return <AdminLoading />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
        <ShieldCheck className="h-4 w-4" /> Administration
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold">Premium lesson management</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create, publish, reorder, and maintain premium course lessons.
      </p>

      <form onSubmit={saveLesson} className="glass mt-8 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            {form.id ? "Edit lesson" : "Create lesson"}
          </h2>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(blankForm(selectedCourseId))}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel editing
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Course">
            <select
              value={form.courseId}
              onChange={(event) => {
                setForm((current) => ({ ...current, courseId: event.target.value }));
                setSelectedCourseId(event.target.value);
              }}
              className="admin-input"
            >
              <option value="">Select a premium course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Position">
            <input
              value={form.position}
              onChange={(event) =>
                setForm((current) => ({ ...current, position: event.target.value }))
              }
              inputMode="numeric"
              placeholder="Automatic"
              className="admin-input"
            />
          </Field>
          <Field label="Lesson title">
            <input
              value={form.title}
              onChange={(event) => updateTitle(event.target.value)}
              maxLength={160}
              className="admin-input"
              required
            />
          </Field>
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
              }
              maxLength={180}
              className="admin-input"
              placeholder="Generated from title"
            />
          </Field>
          <Field label="Video URL (YouTube HTTPS)">
            <input
              value={form.videoUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, videoUrl: event.target.value }))
              }
              type="url"
              placeholder="https://…"
              className="admin-input"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Watch, youtu.be, Shorts, and embed URLs are supported.
            </p>
          </Field>
          <label className="flex items-end gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) =>
                setForm((current) => ({ ...current, isPublished: event.target.checked }))
              }
              className="h-4 w-4 accent-amber-500"
            />
            Published and visible to entitled learners
          </label>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                maxLength={1000}
                className="admin-input min-h-28 resize-y"
              />
            </Field>
          </div>
        </div>
        <button
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{" "}
          {saving ? "Saving…" : form.id ? "Save lesson" : "Create lesson"}
        </button>
      </form>

      <section className="mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold">Course lessons</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordered lesson list for the selected premium course.
            </p>
          </div>
          <select
            value={selectedCourseId}
            onChange={(event) => selectCourse(event.target.value)}
            className="admin-input max-w-xs"
          >
            <option value="">Select a premium course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <AdminLoading />
        ) : !selectedCourseId ? (
          <Empty message="Select a course to manage its lessons." />
        ) : lessons.length === 0 ? (
          <Empty message="No lessons have been created for this course." />
        ) : (
          <div className="glass mt-5 divide-y divide-border overflow-hidden rounded-3xl">
            {lessons.map((lesson, index) => (
              <article
                key={lesson.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/10 text-sm font-semibold text-gold">
                    {lesson.position}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold">{lesson.title}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${lesson.is_published ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-muted-foreground/30 bg-muted text-muted-foreground"}`}
                      >
                        {lesson.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      /{lesson.slug}
                      {lesson.video_url ? " · Video linked" : " · No video URL"}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <button
                    onClick={() => void togglePublished(lesson)}
                    disabled={saving || Boolean(moving)}
                    className="admin-publish-action"
                    aria-label={`${lesson.is_published ? "Unpublish" : "Publish"} ${lesson.title}`}
                  >
                    {lesson.is_published ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {lesson.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-nowrap">
                    <button
                      onClick={() => void moveLesson(lesson, "up")}
                      disabled={Boolean(moving) || index === 0}
                      className="admin-icon"
                      aria-label={`Move ${lesson.title} up`}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void moveLesson(lesson, "down")}
                      disabled={Boolean(moving) || index === lessons.length - 1}
                      className="admin-icon"
                      aria-label={`Move ${lesson.title} down`}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => editLesson(lesson)}
                      className="admin-icon"
                      aria-label={`Edit ${lesson.title}`}
                      title="Edit lesson"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(lesson)}
                      className="admin-icon border-destructive/40 text-destructive"
                      aria-label={`Delete ${lesson.title}`}
                      title="Delete lesson"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <DeleteDialog
        lesson={deleting}
        processing={saving}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void deleteLesson()}
      />
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Empty({ message }: { message: string }) {
  return (
    <div className="glass mt-5 rounded-3xl p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
function AdminLoading() {
  return (
    <div className="flex min-h-32 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
    </div>
  );
}
function DeleteDialog({
  lesson,
  processing,
  onCancel,
  onConfirm,
}: {
  lesson: Lesson | null;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={Boolean(lesson)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
          <AlertDialogDescription>
            {lesson
              ? `Delete “${lesson.title}”? This cannot be undone and removes its learner progress records.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={processing}
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {processing ? "Deleting…" : "Delete lesson"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
