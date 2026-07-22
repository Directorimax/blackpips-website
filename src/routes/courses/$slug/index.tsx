import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Lock, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courses/$slug/")({
  component: CourseLessons,
});

type Course = { id: string; slug: string; title: string };
type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
};

function CourseLessons() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [entitled, setEntitled] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let active = true;
    async function load() {
      setLoading(true);
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id,slug,title")
        .eq("slug", slug)
        .maybeSingle();
      if (courseError || !courseData) {
        if (active) toast.error("This course could not be loaded.");
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
      setCourse(courseData);
      setEntitled(Boolean(purchase));
      if (!purchase) {
        setLoading(false);
        return;
      }
      const { data: lessonData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id,slug,title,description,position")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .order("position", { ascending: true });
      if (!active) return;
      if (lessonsError) toast.error("Lessons could not be loaded.");
      setLessons(lessonData ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug, user]);

  if (loading) return <LoadingState />;
  if (!course)
    return <CourseMessage title="Course unavailable" body="Please return to Premium Lessons." />;
  if (!entitled)
    return (
      <CourseMessage
        title="Course locked"
        body="An approved purchase is required before you can access these lessons."
      />
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Premium Lessons
      </Link>
      <div className="mt-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
          <BookOpen className="h-4 w-4" /> Premium course
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold">{course.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Choose a lesson to continue your learning.
        </p>
      </div>
      {lessons.length === 0 ? (
        <div className="glass mt-8 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Lessons are being prepared.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {lessons.map((lesson, index) => (
            <Link
              key={lesson.id}
              to="/courses/$slug/$lessonSlug"
              params={{ slug: course.slug, lessonSlug: lesson.slug }}
              className="glass grid grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-center gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/10 text-sm font-semibold text-gold">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col justify-center gap-1.5">
                <span className="block min-h-12 line-clamp-2 font-display font-semibold leading-6">
                  {lesson.title}
                </span>
                <span className="block min-h-10 line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {lesson.description || "\u00a0"}
                </span>
              </span>
              <PlayCircle className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center text-sm text-muted-foreground">
      Loading course…
    </div>
  );
}

function CourseMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <Lock className="mx-auto h-7 w-7 text-gold" />
      <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to="/courses"
        className="mt-6 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        View Premium Lessons
      </Link>
    </div>
  );
}
