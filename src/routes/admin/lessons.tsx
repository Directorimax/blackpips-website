import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileVideo,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
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
import {
  COURSE_MEDIA_BUCKET,
  type MediaSource,
  type UploadProgress,
  coursePosterPath,
  courseVideoPath,
  formatBytes,
  posterAsWebp,
  readVideoDuration,
  resumableEndpoint,
  startResumableCourseVideoUpload,
  validateCourseVideo,
  validatePoster,
} from "@/lib/admin-course-media";
import { getEmbeddableVideoUrl } from "@/lib/video-url";
import {
  adminCourseMutationArgs,
  updateAdminCourseAndVerify,
  type CourseAccessType,
} from "@/lib/admin-course-mutation";

export const Route = createFileRoute("/admin/lessons")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminLessons />
    </AuthenticatedRouteGuard>
  ),
});

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  published: boolean;
  access_type: CourseAccessType;
};
type LearningArea = CourseAccessType;
type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  video_url: string | null;
  position: number;
  is_published: boolean;
  media_source: MediaSource;
  video_storage_path: string | null;
  video_poster_path: string | null;
  video_mime_type: string | null;
  video_duration_seconds: number | null;
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
  mediaSource: MediaSource;
};
type CourseForm = {
  id: string | null;
  title: string;
  slug: string;
  description: string;
  price: string;
  image: string;
  published: boolean;
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
  mediaSource: "self_hosted",
});
const blankCourse = (): CourseForm => ({
  id: null,
  title: "",
  slug: "",
  description: "",
  price: "0",
  image: "",
  published: false,
});

type MediaStatusRow = Pick<
  Lesson,
  | "media_source"
  | "video_storage_path"
  | "video_poster_path"
  | "video_mime_type"
  | "video_duration_seconds"
>;

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
  const [area, setArea] = useState<LearningArea>("premium");
  const [courseForm, setCourseForm] = useState<CourseForm>(blankCourse());
  const [courseSaving, setCourseSaving] = useState(false);
  const areaCourses = courses.filter((course) => course.access_type === area);

  const loadLessons = useCallback(async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_lessons", { p_course_id: courseId });
    if (error) {
      console.error("Could not load admin lessons", error);
      toast.error("Could not load lessons.");
    } else {
      const baseLessons = (data ?? []).map(({ lesson_position, ...lesson }) => ({
        ...lesson,
        position: lesson_position,
      }));
      try {
        const withMedia = await Promise.all(
          baseLessons.map(async (lesson) => {
            const { data: mediaData, error: mediaError } = await (
              supabase.rpc as unknown as (
                name: string,
                args: Record<string, unknown>,
              ) => Promise<{
                data: Array<MediaStatusRow & { lesson_id: string }> | null;
                error: unknown;
              }>
            )("admin_get_lesson_media", { p_lesson_id: lesson.id });
            if (mediaError) throw mediaError;
            const media = mediaData?.[0];
            return {
              ...lesson,
              media_source: media?.media_source ?? "none",
              video_storage_path: media?.video_storage_path ?? null,
              video_poster_path: media?.video_poster_path ?? null,
              video_mime_type: media?.video_mime_type ?? null,
              video_duration_seconds: media?.video_duration_seconds ?? null,
            } as Lesson;
          }),
        );
        setLessons(withMedia);
      } catch (mediaError) {
        console.error("Could not load lesson media status", mediaError);
        toast.error("Lessons loaded, but private media status is unavailable.");
      }
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
      .select("id,title,slug,description,price,image,published,access_type")
      .order("title")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load courses", error);
          toast.error("Could not load lesson courses.");
          setLoading(false);
          return;
        }
        const rows = (data ?? []).filter(
          (course): course is Course =>
            course.access_type === "free" || course.access_type === "premium",
        );
        setCourses(rows);
        const firstCourseId = rows.find((course) => course.access_type === "premium")?.id ?? "";
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

  function selectArea(nextArea: LearningArea) {
    const firstCourseId = courses.find((course) => course.access_type === nextArea)?.id ?? "";
    setArea(nextArea);
    setSelectedCourseId(firstCourseId);
    setLessons([]);
    setForm(blankForm(firstCourseId));
    setCourseForm(blankCourse());
    if (!firstCourseId) setLoading(false);
  }

  function editCourse(course: Course) {
    if (course.access_type !== area) return;
    setCourseForm({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description ?? "",
      price: String(course.price),
      image: course.image ?? "",
      published: course.published,
    });
  }

  async function saveCourse(event: React.FormEvent) {
    event.preventDefault();
    if (courseSaving) return;
    const title = courseForm.title.trim();
    const slug = slugify(courseForm.slug || title);
    const price = Number(courseForm.price);
    if (!title || !slug) return toast.error("Course title and slug are required.");
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid course price.");
    const submission = { ...courseForm, title, slug, price };
    const editingCourseId = courseForm.id;
    setCourseSaving(true);
    let updatedCourseId: string | null = null;
    if (editingCourseId) {
      const updateResult = await updateAdminCourseAndVerify({
        courseId: editingCourseId,
        values: submission,
        accessType: area,
        update: async (args) => {
          const { error } = await supabase.rpc("admin_update_course", args);
          return { error };
        },
        refetch: async (courseId) => {
          const { data, error } = await supabase
            .from("courses")
            .select("id,published,access_type")
            .eq("id", courseId)
            .single();
          return { data, error };
        },
      });
      if (!updateResult.ok) {
        setCourseSaving(false);
        console.error("Course update was not authoritatively confirmed");
        return toast.error(updateResult.message);
      }
      updatedCourseId = editingCourseId;
    } else {
      const result = await supabase.rpc(
        "admin_create_course",
        adminCourseMutationArgs(submission, area),
      );
      if (result.error) {
        setCourseSaving(false);
        return toast.error(result.error.message);
      }
      updatedCourseId = typeof result.data === "string" ? result.data : null;
    }
    const { data } = await supabase
      .from("courses")
      .select("id,title,slug,description,price,image,published,access_type")
      .order("title");
    setCourseSaving(false);
    if (!data)
      return toast.error("Course saved, but its authoritative state could not be reloaded.");
    const rows = (data ?? []).filter(
      (course): course is Course =>
        course.access_type === "free" || course.access_type === "premium",
    );
    setCourses(rows);
    toast.success(
      editingCourseId
        ? `${area === "free" ? "Free" : "Premium"} course updated.`
        : `${area === "free" ? "Free" : "Premium"} course created.`,
    );
    setCourseForm(blankCourse());
    const selected =
      rows.find(
        (course) =>
          course.access_type === area && (!editingCourseId || course.id === updatedCourseId),
      ) ?? rows.find((course) => course.access_type === area);
    if (selected) selectCourse(selected.id);
  }

  function editLesson(lesson: Lesson, scroll = true) {
    setForm({
      id: lesson.id,
      courseId: lesson.course_id,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description ?? "",
      videoUrl: lesson.video_url ?? "",
      position: String(lesson.position),
      isPublished: lesson.is_published,
      mediaSource: lesson.media_source,
    });
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (
      form.mediaSource === "youtube_legacy" &&
      (!form.videoUrl.trim() || !getEmbeddableVideoUrl(form.videoUrl))
    ) {
      return toast.error("Use a supported HTTPS YouTube watch, short, Shorts, or embed URL.");
    }
    const position = form.position.trim() ? Number(form.position) : null;
    if (position !== null && (!Number.isInteger(position) || position < 1)) {
      return toast.error("Position must be a whole number greater than zero.");
    }
    const existingLesson = form.id ? lessons.find((lesson) => lesson.id === form.id) : null;
    if (
      form.isPublished &&
      form.mediaSource === "self_hosted" &&
      !existingLesson?.video_storage_path
    ) {
      return toast.error("Save the lesson as a draft and finish its MP4 upload before publishing.");
    }
    if (existingLesson?.media_source === "self_hosted" && form.mediaSource !== "self_hosted") {
      return toast.error("Use Remove video before changing an attached private video's source.");
    }
    const videoUrlForSave =
      form.mediaSource === "youtube_legacy"
        ? form.videoUrl.trim()
        : form.mediaSource === "self_hosted" && existingLesson?.media_source === "youtube_legacy"
          ? existingLesson.video_url
          : null;
    setSaving(true);
    const { data, error } = await supabase.rpc("admin_save_lesson", {
      p_lesson_id: form.id,
      p_course_id: form.courseId,
      p_title: title,
      p_slug: form.slug.trim() || null,
      p_description: form.description.trim() || null,
      p_video_url: videoUrlForSave,
      p_position: position,
      p_is_published: form.isPublished,
    });
    if (error) {
      console.error("Could not save lesson", error);
      toast.error("Could not save lesson. Please review the fields and try again.");
    } else {
      const saved = data?.[0];
      if (saved && form.mediaSource !== "self_hosted") {
        const { error: mediaError } = await supabase.rpc(
          "admin_set_lesson_media" as never,
          {
            p_lesson_id: saved.id,
            p_media_source: form.mediaSource,
            p_video_mime_type: null,
            p_video_duration_seconds: null,
            p_has_poster: false,
          } as never,
        );
        if (mediaError) {
          console.error("Could not save lesson media source", mediaError);
          toast.error("Lesson saved, but its media source could not be updated.");
          setSaving(false);
          await loadLessons(form.courseId);
          return;
        }
      }
      toast.success(form.id ? "Lesson updated." : "Lesson created. You can now attach media.");
      setSelectedCourseId(form.courseId);
      await loadLessons(form.courseId);
      if (saved) {
        const created = (await loadLessonForEditing(form.courseId, saved.id)) ?? null;
        if (created) {
          editLesson(
            form.mediaSource === "self_hosted"
              ? { ...created, media_source: "self_hosted" }
              : created,
            false,
          );
        } else setForm(blankForm(form.courseId));
      } else {
        setForm(blankForm(form.courseId));
      }
    }
    setSaving(false);
  }

  async function loadLessonForEditing(courseId: string, lessonId: string) {
    const { data, error } = await supabase.rpc("admin_list_lessons", { p_course_id: courseId });
    if (error) return null;
    const row = data?.find((item) => item.id === lessonId);
    if (!row) return null;
    const { data: media, error: mediaError } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Array<MediaStatusRow> | null; error: unknown }>
    )("admin_get_lesson_media", {
      p_lesson_id: lessonId,
    });
    if (mediaError) return null;
    const status = media?.[0];
    return {
      ...row,
      position: row.lesson_position,
      media_source: status?.media_source ?? "none",
      video_storage_path: status?.video_storage_path ?? null,
      video_poster_path: status?.video_poster_path ?? null,
      video_mime_type: status?.video_mime_type ?? null,
      video_duration_seconds: status?.video_duration_seconds ?? null,
    } as Lesson;
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
    if (
      !lesson.is_published &&
      lesson.media_source === "self_hosted" &&
      !lesson.video_storage_path
    ) {
      toast.error("Finish the MP4 upload before publishing this lesson.");
      return;
    }
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
      <h1 className="mt-2 font-display text-3xl font-bold">Lesson management</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a learning area, then manage its existing course or library structure.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Learning area">
        {(
          [
            ["premium", "Premium Lessons", GraduationCap],
            ["free", "Free Lessons", FileVideo],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => selectArea(value)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${area === value ? "border-gold/50 bg-gold/10 text-foreground" : "border-border bg-card/50 text-muted-foreground hover:border-gold/30 hover:text-foreground"}`}
            aria-pressed={area === value}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={saveCourse} className="glass mt-8 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            {courseForm.id ? "Edit course" : `Create ${area} course`}
          </h2>
          {courseForm.id && (
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground"
              onClick={() => setCourseForm(blankCourse())}
            >
              Cancel editing
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Course title">
            <input
              className="admin-input"
              required
              maxLength={160}
              value={courseForm.title}
              onChange={(event) =>
                setCourseForm((current) => ({
                  ...current,
                  title: event.target.value,
                  slug: current.id || current.slug ? current.slug : slugify(event.target.value),
                }))
              }
            />
          </Field>
          <Field label="Slug">
            <input
              className="admin-input"
              required
              value={courseForm.slug}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, slug: slugify(event.target.value) }))
              }
            />
          </Field>
          <Field label="Price (TZS)">
            <input
              className="admin-input"
              inputMode="decimal"
              value={courseForm.price}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, price: event.target.value }))
              }
            />
          </Field>
          <Field label="Image URL">
            <input
              className="admin-input"
              type="url"
              placeholder="Optional HTTPS image"
              value={courseForm.image}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, image: event.target.value }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                className="admin-input min-h-24"
                value={courseForm.description}
                onChange={(event) =>
                  setCourseForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber-500"
              checked={courseForm.published}
              onChange={(event) =>
                setCourseForm((current) => ({ ...current, published: event.target.checked }))
              }
            />
            Published course
          </label>
        </div>
        <button
          type="submit"
          disabled={courseSaving}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {courseSaving ? "Saving…" : courseForm.id ? "Save course" : "Create course"}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          This checked Admin operation explicitly preserves <code>access_type='{area}'</code>.
        </p>
      </form>
      {(area === "premium" || area === "free") && (
        <>
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
                  <option value="">Select a {area} course</option>
                  {areaCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {selectedCourseId && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-gold"
                    onClick={() => {
                      const course = courses.find((item) => item.id === selectedCourseId);
                      if (course) editCourse(course);
                    }}
                  >
                    Edit selected course
                  </button>
                )}
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
              <Field label="Video source">
                <select
                  value={form.mediaSource}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mediaSource: event.target.value as MediaSource,
                    }))
                  }
                  className="admin-input"
                >
                  <option value="none">No video</option>
                  <option value="self_hosted">Upload lesson video from device</option>
                  <option value="youtube_legacy">YouTube legacy</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Uploading from a device is the recommended workflow for recorded lessons.
                </p>
              </Field>
              {form.mediaSource === "youtube_legacy" && (
                <Field label="YouTube URL (legacy HTTPS)">
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
                    Watch, youtu.be, Shorts, and embed URLs are supported during migration.
                  </p>
                </Field>
              )}
              <label className="flex items-end gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isPublished: event.target.checked }))
                  }
                  className="h-4 w-4 accent-amber-500"
                />
                {area === "free"
                  ? "Published and visible to authenticated learners"
                  : "Published and visible to entitled learners"}
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
              disabled={saving || !form.courseId}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{" "}
              {saving ? "Saving…" : form.id ? "Save lesson" : "Create lesson"}
            </button>
            {form.mediaSource === "self_hosted" && !form.id && (
              <div className="mt-5">
                <MediaDropzone accept="video/mp4,.mp4" disabled onFiles={() => undefined}>
                  <span>
                    <FileVideo className="mx-auto h-7 w-7 text-gold" />
                    <span className="mt-2 block text-sm font-semibold">
                      Drag and drop or select media
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Save the lesson details to activate MP4 upload · Up to 3 GiB
                    </span>
                  </span>
                </MediaDropzone>
                <p className="mt-2 text-sm text-muted-foreground">
                  Step 1: create the lesson to obtain its secure UUID. Step 2: this upload area
                  becomes active immediately for the lesson video.
                </p>
              </div>
            )}
            {form.id &&
              form.mediaSource === "self_hosted" &&
              (() => {
                const mediaLesson = lessons.find((lesson) => lesson.id === form.id);
                return mediaLesson ? (
                  <LessonMediaManager
                    lesson={mediaLesson}
                    onChanged={async () => {
                      await loadLessons(form.courseId);
                      const refreshed = await loadLessonForEditing(form.courseId, form.id!);
                      if (refreshed) editLesson(refreshed, false);
                    }}
                  />
                ) : (
                  <p className="mt-4 rounded-xl border border-border p-3 text-sm text-muted-foreground">
                    Reloading private media status…
                  </p>
                );
              })()}
          </form>

          <section className="mt-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-xl font-semibold">Course lessons</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ordered lesson list for the selected {area} course.
                </p>
              </div>
              <select
                value={selectedCourseId}
                onChange={(event) => selectCourse(event.target.value)}
                className="admin-input max-w-xs"
              >
                <option value="">Select a {area} course</option>
                {areaCourses.map((course) => (
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
                          {lesson.media_source === "self_hosted"
                            ? ` · Private video${lesson.video_duration_seconds ? ` · ${formatDuration(lesson.video_duration_seconds)}` : ""}`
                            : lesson.media_source === "youtube_legacy"
                              ? " · YouTube legacy"
                              : " · No video"}
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
        </>
      )}
    </div>
  );
}

type UploadState = "ready" | "uploading" | "processing" | "complete" | "failed";

function LessonMediaManager({
  lesson,
  onChanged,
}: {
  lesson: Lesson;
  onChanged: () => Promise<void>;
}) {
  const [video, setVideo] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("ready");
  const [progress, setProgress] = useState<UploadProgress>({
    uploaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [removing, setRemoving] = useState(false);
  const cancelRef = useRef<null | (() => Promise<void>)>(null);

  const attached = lesson.media_source === "self_hosted" && Boolean(lesson.video_storage_path);
  const busy = state === "uploading" || state === "processing" || removing;

  function selectVideo(files: FileList) {
    const file = files[0] ?? null;
    if (!file) return;
    const validation = validateCourseVideo(file);
    if (validation) {
      setVideo(null);
      setVideoError(`${file.name}: ${validation}`);
      return;
    }
    setVideo(file);
    setVideoError("");
    setError("");
    setState("ready");
  }

  async function uploadMedia() {
    if (busy) return;
    if (!video && !poster) return toast.error("Choose an MP4 video or poster first.");
    if (!video && !attached)
      return toast.error("Choose an MP4 before attaching self-hosted media.");
    if (video) {
      const validation = validateCourseVideo(video);
      if (validation) return toast.error(validation);
    }
    if (poster) {
      const validation = validatePoster(poster);
      if (validation) return toast.error(validation);
    }

    setError("");
    setProgress({ uploaded: 0, total: video?.size ?? 0, percentage: 0 });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("Your administrator session expired. Sign in again.");

      let duration = lesson.video_duration_seconds;
      if (video) {
        duration = await readVideoDuration(video);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const publishableKey =
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          "";
        if (!supabaseUrl || !publishableKey)
          throw new Error("Storage configuration is unavailable.");

        setState("uploading");
        const task = startResumableCourseVideoUpload({
          file: video,
          endpoint: resumableEndpoint(supabaseUrl),
          accessToken: session.access_token,
          publishableKey,
          objectPath: courseVideoPath(lesson.course_id, lesson.id),
          upsert: attached,
          onProgress: setProgress,
        });
        cancelRef.current = task.cancel;
        await task.completion;
        cancelRef.current = null;
      }

      setState("processing");
      let hasPoster = Boolean(lesson.video_poster_path);
      if (poster) {
        const posterBlob = await posterAsWebp(poster);
        const { error: posterError } = await supabase.storage
          .from(COURSE_MEDIA_BUCKET)
          .upload(coursePosterPath(lesson.course_id, lesson.id), posterBlob, {
            contentType: "image/webp",
            cacheControl: "0",
            upsert: hasPoster,
          });
        if (posterError) throw posterError;
        hasPoster = true;
      }

      const { error: mediaError } = await supabase.rpc(
        "admin_set_lesson_media" as never,
        {
          p_lesson_id: lesson.id,
          p_media_source: "self_hosted",
          p_video_mime_type: "video/mp4",
          p_video_duration_seconds: duration,
          p_has_poster: hasPoster,
        } as never,
      );
      if (mediaError) throw mediaError;

      if (lesson.video_url) {
        const { error: clearLegacyError } = await supabase.rpc("admin_save_lesson", {
          p_lesson_id: lesson.id,
          p_course_id: lesson.course_id,
          p_title: lesson.title,
          p_slug: lesson.slug,
          p_description: lesson.description,
          p_video_url: null,
          p_position: lesson.position,
          p_is_published: lesson.is_published,
        });
        if (clearLegacyError) {
          console.error(
            "Self-hosted media attached but legacy URL was not cleared",
            clearLegacyError,
          );
          toast.warning("Private video attached. Retry saving the lesson to clear its legacy URL.");
        }
      }

      setState("complete");
      setVideo(null);
      setPoster(null);
      toast.success(video ? "Private video uploaded and attached." : "Poster updated.");
      await onChanged();
    } catch (uploadError) {
      console.error("Could not upload course media", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Course media upload failed.");
      setState("failed");
    } finally {
      cancelRef.current = null;
    }
  }

  async function cancelUpload() {
    const cancel = cancelRef.current;
    if (!cancel) return;
    await cancel();
    cancelRef.current = null;
    setError("Upload cancelled. Existing lesson media was not changed.");
    setState("failed");
  }

  async function removeMedia() {
    if (!attached || busy) return;
    if (!window.confirm("Detach and remove this private lesson video? This cannot be undone."))
      return;
    setRemoving(true);
    try {
      const { error: detachError } = await supabase.rpc(
        "admin_set_lesson_media" as never,
        {
          p_lesson_id: lesson.id,
          p_media_source: "none",
          p_video_mime_type: null,
          p_video_duration_seconds: null,
          p_has_poster: false,
        } as never,
      );
      if (detachError) throw detachError;

      const paths = [courseVideoPath(lesson.course_id, lesson.id)];
      if (lesson.video_poster_path) paths.push(coursePosterPath(lesson.course_id, lesson.id));
      const { error: deleteError } = await supabase.storage.from(COURSE_MEDIA_BUCKET).remove(paths);
      if (deleteError) {
        console.error("Lesson detached but Storage cleanup failed", deleteError);
        toast.warning("Video detached safely, but Storage cleanup needs to be retried.");
      } else {
        toast.success("Private video removed.");
      }
      await onChanged();
    } catch (removeError) {
      console.error("Could not remove course media", removeError);
      toast.error("The private video could not be removed.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <FileVideo className="h-4 w-4 text-gold" /> Lesson video
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {attached
              ? `Video attached · ${lesson.video_mime_type ?? "video/mp4"}${lesson.video_duration_seconds ? ` · ${formatDuration(lesson.video_duration_seconds)}` : ""}`
              : "No lesson video attached."}
          </p>
        </div>
        {attached && (
          <button
            type="button"
            onClick={() => void removeMedia()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {removing ? "Removing…" : "Remove video"}
          </button>
        )}
      </div>

      <div className="mt-4">
        <MediaDropzone accept="video/mp4,.mp4" disabled={busy} onFiles={selectVideo}>
          <span>
            <FileVideo className="mx-auto h-7 w-7 text-gold" />
            <span className="mt-2 block text-sm font-semibold">Drag and drop or select media</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              H.264 video with AAC audio · Up to 3 GiB · MOV files must be converted first
            </span>
          </span>
        </MediaDropzone>
        {videoError && <p className="mt-2 text-sm text-destructive">{videoError}</p>}
        {video && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                <FileVideo className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold">{video.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatBytes(video.size)} · Ready to upload
                </span>
              </span>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setVideo(null);
                setState("ready");
              }}
              className="rounded-full bg-black/70 p-1.5 text-white disabled:opacity-50"
              aria-label={`Remove ${video.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Optional poster (WebP or JPEG)">
          <input
            type="file"
            accept="image/webp,image/jpeg,.webp,.jpg,.jpeg"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file) {
                const validation = validatePoster(file);
                if (validation) {
                  event.target.value = "";
                  toast.error(validation);
                  return;
                }
              }
              setPoster(file);
              setState("ready");
            }}
            className="admin-input file:mr-3 file:rounded-full file:border-0 file:bg-gold/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gold"
          />
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" /> JPEG is converted explicitly to private WebP.
          </p>
        </Field>
      </div>

      {(state === "uploading" || progress.total > 0) && (
        <div className="mt-4" aria-live="polite">
          <div className="flex justify-between text-xs font-semibold">
            <span>
              {state === "uploading"
                ? "Uploading"
                : state === "processing"
                  ? "Saving metadata"
                  : state}
            </span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-gold transition-[width]"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBytes(progress.uploaded)} / {formatBytes(progress.total)}
          </p>
        </div>
      )}

      {state === "processing" && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Processing and saving private metadata…
        </p>
      )}
      {state === "complete" && <p className="mt-3 text-sm text-emerald-600">Upload complete.</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void uploadMedia()}
          disabled={busy || (!video && !poster)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {state === "failed" ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {state === "failed" ? "Retry" : attached ? "Upload replacement" : "Upload and attach"}
        </button>
        {state === "uploading" && (
          <button
            type="button"
            onClick={() => void cancelUpload()}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            <X className="h-4 w-4" /> Cancel upload
          </button>
        )}
      </div>
      {attached && (
        <p className="mt-3 text-xs text-muted-foreground">
          Replacements keep the current video active until the resumable upload completes. Existing
          signed URLs expire within five minutes.
        </p>
      )}
    </section>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
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
