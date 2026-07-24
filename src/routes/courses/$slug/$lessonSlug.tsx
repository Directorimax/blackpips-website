import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  Loader2,
  ListVideo,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import {
  LessonArticle,
  LessonNotes,
  LessonResources,
  ReadingProgressBar,
} from "@/components/lesson-content";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getEmbeddableVideoUrl } from "@/lib/video-url";
import { sendNotification } from "@/services/email/notification.functions";
import { useLessonBookmark } from "@/hooks/useLessonBookmark";

export const Route = createFileRoute("/courses/$slug/$lessonSlug")({
  component: () => (
    <AuthenticatedRouteGuard>
      <PremiumLesson />
    </AuthenticatedRouteGuard>
  ),
});

type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  video_url: string | null;
  position: number;
};
type Course = { id: string; slug: string; title: string };
type LessonProgress = { lesson_id: string; is_completed: boolean };

function PremiumLesson() {
  const { slug, lessonSlug } = Route.useParams();
  const { user } = useAuth();
  const viewedLessonId = useRef<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [curriculum, setCurriculum] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [lessonUnavailable, setLessonUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const readingProgress = useReadingProgress();
  const {
    bookmarked,
    loading: bookmarkLoading,
    saving: bookmarkSaving,
    toggleBookmark,
  } = useLessonBookmark(lesson?.id ?? null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let active = true;

    async function load() {
      setLoading(true);
      setAllowed(false);
      setLessonUnavailable(false);
      setCourse(null);
      setLesson(null);
      setCurriculum([]);
      setCompletedLessonIds(new Set());

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id,slug,title")
        .eq("slug", slug)
        .maybeSingle();
      if (courseError || !courseData) {
        if (active) setLoading(false);
        return;
      }

      const { data: purchase } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseData.id)
        .maybeSingle();
      if (!active) return;
      if (!purchase) {
        setCourse(courseData);
        setLoading(false);
        return;
      }

      const [
        { data: lessonData, error: lessonsError },
        { data: progressData, error: progressError },
      ] = await Promise.all([
        supabase
          .from("lessons")
          .select("id,slug,title,description,video_url,position")
          .eq("course_id", courseData.id)
          .eq("is_published", true)
          .order("position", { ascending: true }),
        supabase
          .from("lesson_progress")
          .select("lesson_id,is_completed")
          .eq("user_id", userId)
          .eq("course_id", courseData.id),
      ]);
      if (!active) return;
      if (lessonsError) console.error("Could not load course curriculum", lessonsError);
      if (progressError) console.error("Could not load lesson progress", progressError);

      const publishedLessons = lessonData ?? [];
      const currentLesson = publishedLessons.find((candidate) => candidate.slug === lessonSlug);
      setCourse(courseData);
      setCurriculum(publishedLessons);
      setCompletedLessonIds(
        new Set(
          (progressData ?? [])
            .filter((progress: LessonProgress) => progress.is_completed)
            .map((progress: LessonProgress) => progress.lesson_id),
        ),
      );
      setAllowed(true);
      if (!currentLesson) {
        setLessonUnavailable(true);
        setLoading(false);
        return;
      }

      setLesson(currentLesson);
      setLoading(false);
      if (viewedLessonId.current === currentLesson.id) return;
      viewedLessonId.current = currentLesson.id;
      const { error: viewError } = await supabase.from("lesson_progress").upsert(
        {
          user_id: userId,
          course_id: courseData.id,
          lesson_id: currentLesson.id,
          last_viewed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );
      if (viewError) console.error("Could not record lesson view", viewError);
    }

    void load();
    return () => {
      active = false;
    };
  }, [lessonSlug, slug, user]);

  const currentLessonIndex = lesson ? curriculum.findIndex((item) => item.id === lesson.id) : -1;
  const previousLesson = currentLessonIndex > 0 ? curriculum[currentLessonIndex - 1] : undefined;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < curriculum.length - 1
      ? curriculum[currentLessonIndex + 1]
      : undefined;
  const completed = lesson ? completedLessonIds.has(lesson.id) : false;
  const completedCount = curriculum.filter((item) => completedLessonIds.has(item.id)).length;
  const progressPercent = curriculum.length
    ? Math.round((completedCount / curriculum.length) * 100)
    : 0;
  const embeddableVideoUrl = getEmbeddableVideoUrl(lesson?.video_url);

  async function markComplete() {
    if (!user || !course || !lesson || completed || saving) return;
    setSaving(true);
    const completedAt = new Date().toISOString();
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        course_id: course.id,
        lesson_id: lesson.id,
        last_viewed_at: completedAt,
        is_completed: true,
        completed_at: completedAt,
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) {
      console.error("Could not complete lesson", error);
      toast.error("Could not mark this lesson as completed.");
    } else {
      setCompletedLessonIds((current) => new Set(current).add(lesson.id));
      toast.success("Lesson marked as completed.");
      const { data: certificate, error: certificateError } = await supabase
        .from("course_certificates")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();
      if (certificateError) {
        console.error("Could not look up a newly earned certificate:", certificateError);
      } else if (certificate) {
        void sendNotification({
          data: { type: "certificate_earned", resourceId: certificate.id },
        }).catch((notificationError) =>
          console.error("Certificate notification could not be queued:", notificationError),
        );
      }
    }
    setSaving(false);
  }

  if (loading)
    return <div className="py-24 text-center text-sm text-muted-foreground">Loading lesson…</div>;
  if (allowed && course && lessonUnavailable)
    return (
      <LessonMessage
        title="Lesson unavailable"
        body="This lesson is no longer available. Choose another lesson from this course."
        to="/courses/$slug"
        params={{ slug: course.slug }}
        action={`Back to ${course.title}`}
      />
    );
  if (!allowed || !course || !lesson)
    return (
      <LessonMessage
        title="Lesson unavailable"
        body="This lesson requires an approved course purchase."
        to="/courses"
        action="View Premium Lessons"
      />
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
      <ReadingProgressBar value={readingProgress} />
      <Link
        to="/courses/$slug"
        params={{ slug: course.slug }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>

      <header className="mt-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">{course.title}</p>
        <h1 className="mt-2 break-words font-display text-3xl font-bold sm:text-4xl">
          {lesson.title}
        </h1>
        <CourseProgress
          completedCount={completedCount}
          totalCount={curriculum.length}
          percentage={progressPercent}
        />
        <LessonBookmarkAction
          bookmarked={bookmarked}
          disabled={bookmarkLoading || bookmarkSaving}
          onToggle={toggleBookmark}
        />
      </header>

      <div className="mt-6 lg:hidden">
        <Collapsible open={mobileCurriculumOpen} onOpenChange={setMobileCurriculumOpen}>
          <div className="glass rounded-2xl">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-display font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              <span className="inline-flex items-center gap-2">
                <ListVideo className="h-4 w-4 text-gold" /> Course curriculum
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${mobileCurriculumOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border px-3 pb-3">
              <Curriculum
                courseSlug={course.slug}
                lessons={curriculum}
                currentLessonId={lesson.id}
                completedLessonIds={completedLessonIds}
                onNavigate={() => setMobileCurriculumOpen(false)}
              />
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <main className="min-w-0">
          <div className="aspect-video rounded-3xl border border-border bg-secondary/50 p-3 sm:p-5">
            {embeddableVideoUrl ? (
              <iframe
                title={lesson.title}
                src={embeddableVideoUrl}
                className="h-full w-full rounded-2xl"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            ) : lesson.video_url ? (
              <VideoFallback url={lesson.video_url} />
            ) : (
              <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                Lesson video will be available here.
              </div>
            )}
          </div>

          <section className="mt-8">
            <h2 className="font-display text-2xl font-bold">{lesson.title}</h2>
            <LessonArticle content={lesson.description} />
            <CompletionAction completed={completed} saving={saving} onComplete={markComplete} />
            <LessonResources />
            <LessonNotes lessonId={lesson.id} />
          </section>

          <nav
            className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2"
            aria-label="Lesson navigation"
          >
            {previousLesson ? (
              <LessonNavigationLink
                direction="previous"
                courseSlug={course.slug}
                lesson={previousLesson}
              />
            ) : (
              <DisabledLessonNavigation direction="previous" />
            )}
            {nextLesson ? (
              <LessonNavigationLink direction="next" courseSlug={course.slug} lesson={nextLesson} />
            ) : (
              <DisabledLessonNavigation direction="next" />
            )}
          </nav>
        </main>

        <aside className="glass sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl p-4 lg:block">
          <h2 className="px-2 font-display text-lg font-semibold">{course.title}</h2>
          <p className="px-2 pt-1 text-xs text-muted-foreground">Course curriculum</p>
          <Curriculum
            courseSlug={course.slug}
            lessons={curriculum}
            currentLessonId={lesson.id}
            completedLessonIds={completedLessonIds}
          />
        </aside>
      </div>
    </div>
  );
}

function useReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const updateProgress = () => {
      frameId = 0;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress =
        documentHeight > 0 ? Math.min(100, Math.round((window.scrollY / documentHeight) * 100)) : 0;
      setProgress((current) => (current === nextProgress ? current : nextProgress));
    };
    const onScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return progress;
}

function CourseProgress({
  completedCount,
  totalCount,
  percentage,
}: {
  completedCount: number;
  totalCount: number;
  percentage: number;
}) {
  return (
    <div className="mt-5 max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {completedCount} of {totalCount} lessons completed
        </span>
        <span className="font-semibold text-gold">{percentage}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label="Course completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-gradient-gold transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Curriculum({
  courseSlug,
  lessons,
  currentLessonId,
  completedLessonIds,
  onNavigate,
}: {
  courseSlug: string;
  lessons: Lesson[];
  currentLessonId: string;
  completedLessonIds: Set<string>;
  onNavigate?: () => void;
}) {
  return (
    <ol className="mt-3 space-y-1" aria-label="Published course lessons">
      {lessons.map((item, index) => {
        const isCurrent = item.id === currentLessonId;
        const isComplete = completedLessonIds.has(item.id);
        return (
          <li key={item.id}>
            <Link
              to="/courses/$slug/$lessonSlug"
              params={{ slug: courseSlug, lessonSlug: item.slug }}
              onClick={onNavigate}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`${isComplete ? "Completed" : `Lesson ${index + 1}`}: ${item.title}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${isCurrent ? "bg-gold/15 text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-muted-foreground/50 text-[9px] font-semibold">
                  {index + 1}
                </span>
              )}
              <span className="min-w-0 flex-1 break-words font-medium">{item.title}</span>
              {isCurrent && (
                <Circle
                  className="h-2 w-2 shrink-0 fill-gold text-gold"
                  aria-label="Current lesson"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function CompletionAction({
  completed,
  saving,
  onComplete,
}: {
  completed: boolean;
  saving: boolean;
  onComplete: () => void;
}) {
  if (completed)
    return (
      <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Completed
      </div>
    );

  return (
    <button
      onClick={onComplete}
      disabled={saving}
      className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Mark lesson as completed"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      {saving ? "Saving…" : "Mark as completed"}
    </button>
  );
}

function LessonBookmarkAction({
  bookmarked,
  disabled,
  onToggle,
}: {
  bookmarked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      disabled={disabled}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove saved lesson" : "Save lesson"}
      className="glass mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-60"
    >
      {bookmarked ? (
        <BookmarkCheck className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden="true" />
      )}
      {bookmarked ? "Saved" : "Save lesson"}
    </button>
  );
}

function LessonNavigationLink({
  direction,
  courseSlug,
  lesson,
}: {
  direction: "previous" | "next";
  courseSlug: string;
  lesson: Lesson;
}) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  return (
    <Link
      to="/courses/$slug/$lessonSlug"
      params={{ slug: courseSlug, lessonSlug: lesson.slug }}
      className={`group flex min-w-0 items-center gap-3 rounded-2xl border border-border p-4 transition hover:border-gold/40 hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${isPrevious ? "sm:flex-row" : "sm:flex-row-reverse sm:text-right"}`}
      aria-label={`${isPrevious ? "Previous" : "Next"} lesson: ${lesson.title}`}
    >
      <Icon className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isPrevious ? "Previous lesson" : "Next lesson"}
        </span>
        <span className="mt-1 block break-words font-display font-semibold">{lesson.title}</span>
      </span>
    </Link>
  );
}

function DisabledLessonNavigation({ direction }: { direction: "previous" | "next" }) {
  const isPrevious = direction === "previous";
  return (
    <span
      className={`flex items-center gap-3 rounded-2xl border border-border/70 p-4 text-muted-foreground/60 ${isPrevious ? "sm:flex-row" : "sm:flex-row-reverse sm:text-right"}`}
      aria-disabled="true"
    >
      {isPrevious ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      <span>
        <span className="block text-xs font-semibold uppercase tracking-wider">
          {isPrevious ? "Previous lesson" : "Next lesson"}
        </span>
        <span className="mt-1 block font-display font-semibold">
          {isPrevious ? "You’re at the first lesson" : "You’re at the last lesson"}
        </span>
      </span>
    </span>
  );
}

function VideoFallback({ url }: { url: string }) {
  return (
    <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
      <div>
        <p>This video link cannot be embedded here.</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Open video <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

function LessonMessage({
  title,
  body,
  to,
  params,
  action,
}: {
  title: string;
  body: string;
  to: "/courses" | "/courses/$slug";
  params?: { slug: string };
  action: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to={to}
        params={params}
        className="mt-6 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        {action}
      </Link>
    </div>
  );
}
