import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, BookOpen, Loader2, PlayCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { LearningFeatureGate } from "@/components/LearningFeatureGate";
import { supabase } from "@/integrations/supabase/client";
import { isFreeLessonsAvailable } from "@/lib/feature-access";
import { formatLessonDuration } from "@/lib/learning-preview";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/free")({
  head: () =>
    createSeoHead({
      title: "Free Forex Lessons",
      description:
        "Access BLACKPIPS free forex lessons and build your understanding of market structure, trading concepts and the ALC framework.",
      path: "/free",
      noindex: true,
    }),
  component: () => (
    <AuthenticatedRouteGuard>
      <LearningFeatureGate
        featureEnabled={isFreeLessonsAvailable()}
        title="Free Lessons"
        description="We’re preparing the BLACKPIPS learning experience. Free lessons will be available soon."
      >
        <FreeLessons />
      </LearningFeatureGate>
    </AuthenticatedRouteGuard>
  ),
});

type FreeCourse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

type FreeLesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  position: number;
  video_duration_seconds: number | null;
};

function FreeLessons() {
  const [courses, setCourses] = useState<FreeCourse[]>([]);
  const [lessons, setLessons] = useState<FreeLesson[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: courseRows, error: courseError } = await supabase
      .from("courses")
      .select("id,title,slug,description")
      .eq("access_type", "free")
      .eq("published", true)
      .order("title", { ascending: true });

    if (courseError) {
      setCourses([]);
      setLessons([]);
      setError("The Free Lessons catalog could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const publishedCourses = courseRows ?? [];
    setCourses(publishedCourses);
    if (publishedCourses.length === 0) {
      setLessons([]);
      setLoading(false);
      return;
    }

    const { data: lessonRows, error: lessonError } = await supabase
      .from("lessons")
      .select("id,course_id,title,slug,description,position,video_duration_seconds")
      .in(
        "course_id",
        publishedCourses.map((course) => course.id),
      )
      .eq("is_published", true)
      .order("position", { ascending: true });

    if (lessonError) {
      setLessons([]);
      setError("The published Free Lessons could not be loaded. Please try again.");
    } else {
      setLessons(lessonRows ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const courseById = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses],
  );
  const filteredLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return lessons;
    return lessons.filter((lesson) => {
      const course = courseById.get(lesson.course_id);
      return [lesson.title, lesson.description, course?.title]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [courseById, lessons, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Free Library
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Learn for free</h1>
        <p className="mt-3 text-muted-foreground">
          Published BLACKPIPS courses available to every authenticated learner.
        </p>
      </header>

      {!loading && !error && lessons.length > 0 && (
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search published lessons…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading published Free Lessons…
        </div>
      ) : error ? (
        <div className="glass mx-auto mt-12 max-w-xl rounded-3xl p-8 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-gold" />
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void loadCatalog()}
            className="mt-5 rounded-full border border-gold/40 px-5 py-2.5 text-sm font-semibold text-gold hover:bg-gold/10"
          >
            Try again
          </button>
        </div>
      ) : courses.length === 0 || lessons.length === 0 ? (
        <div className="glass mx-auto mt-12 max-w-xl rounded-3xl p-10 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-gold" />
          <h2 className="mt-4 font-display text-xl font-semibold">No published Free Lessons yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Published lessons will appear here when their Free course is available.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLessons.map((lesson) => {
            const course = courseById.get(lesson.course_id);
            if (!course) return null;
            return (
              <Link
                key={lesson.id}
                to="/courses/$slug/$lessonSlug"
                params={{ slug: course.slug, lessonSlug: lesson.slug }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-accent to-secondary">
                  <div className="absolute inset-0 bg-hero-glow opacity-70" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="glass grid h-14 w-14 place-items-center rounded-full transition-transform group-hover:scale-110">
                      <PlayCircle className="h-7 w-7 text-gold" />
                    </div>
                  </div>
                  <span className="absolute right-3 top-3 glass rounded-full px-2 py-1 text-[10px] font-semibold">
                    {formatLessonDuration(lesson.video_duration_seconds)}
                  </span>
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">
                    {course.title}
                  </span>
                  <h2 className="mt-2 font-display text-base font-semibold">{lesson.title}</h2>
                  {lesson.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {lesson.description}
                    </p>
                  )}
                  <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    Free
                  </div>
                </div>
              </Link>
            );
          })}
          {filteredLessons.length === 0 && (
            <div className="glass col-span-full rounded-3xl px-6 py-14 text-center">
              <h2 className="font-display text-lg font-semibold">No matching lessons</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try another search term.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
