import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lock,
  PlayCircle,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

export const Route = createFileRoute("/courses/$slug/")({ component: CourseAccess });

type Course = { id: string; slug: string; title: string };
type AccessState = "locked" | "pending" | "purchased";
type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

function CourseAccess() {
  const { isAdmin, loading } = useAdmin();

  if (loading)
    return (
      <div className="px-4 py-24 text-center text-sm text-muted-foreground">Verifying access…</div>
    );
  return isAdmin ? <AdminCourseLessons /> : <LearnerCourseAccess />;
}

function LearnerCourseAccess() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<AccessState>("locked");
  const [loading, setLoading] = useState(true);

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
        .eq("access_type", "premium")
        .eq("published", true)
        .maybeSingle();
      if (courseError || !courseData) {
        if (active) {
          toast.error("This course could not be loaded.");
          setLoading(false);
        }
        return;
      }
      const [{ data: purchase }, { data: pendingPayment }] = await Promise.all([
        supabase
          .from("purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", courseData.id)
          .maybeSingle(),
        supabase
          .from("payments")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", courseData.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      setCourse(courseData);
      setAccess(purchase ? "purchased" : pendingPayment ? "pending" : "locked");
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug, user]);

  if (loading)
    return (
      <div className="px-4 py-24 text-center text-sm text-muted-foreground">Loading course…</div>
    );
  if (!course)
    return <CourseMessage title="Course unavailable" body="Please return to Premium Lessons." />;
  if (access === "locked")
    return (
      <CourseMessage
        title="Course locked"
        body="Purchase this Premium Course to submit your payment for approval."
        slug={course.slug}
      />
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Premium Lessons
      </Link>
      <section className="glass mt-8 overflow-hidden rounded-3xl border border-gold/30">
        <div className="bg-gradient-to-br from-gold/15 via-card to-card p-6 sm:p-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold">
            {access === "purchased" ? <Smartphone /> : <Clock3 />}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {access === "purchased" ? "Purchased · Lifetime Access" : "Payment under review"}
          </p>
          <h1 className="mt-3 break-words font-display text-3xl font-bold sm:text-4xl">
            {course.title}
          </h1>
          {access === "purchased" ? (
            <>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Your Premium Course is ready in the BLACKPIPS App. Open the app already installed on
                your device and sign in with the same BLACKPIPS account to continue learning.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
                <CheckCircle2 className="h-4 w-4" /> Access approved
              </div>
            </>
          ) : (
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Your payment is awaiting approval. Once approved, your Premium Course will be
              available in the BLACKPIPS App.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminCourseLessons() {
  const { slug } = Route.useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id,slug,title")
        .eq("slug", slug)
        .eq("access_type", "premium")
        .eq("published", true)
        .maybeSingle();
      if (!active) return;
      if (courseError || !courseData) {
        toast.error("This course could not be loaded.");
        setLoading(false);
        return;
      }
      const { data: lessonData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id,slug,title,description")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .order("position", { ascending: true });
      if (!active) return;
      if (lessonsError) toast.error("Lessons could not be loaded.");
      setCourse(courseData);
      setLessons(lessonData ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading)
    return (
      <div className="px-4 py-24 text-center text-sm text-muted-foreground">Loading course…</div>
    );
  if (!course)
    return <CourseMessage title="Course unavailable" body="Please return to Premium Lessons." />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Premium Lessons
      </Link>
      <header className="mt-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
          <BookOpen className="h-4 w-4" /> Administrator course inspection
        </div>
        <h1 className="mt-3 break-words font-display text-3xl font-bold sm:text-4xl">
          {course.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Review the published Premium lessons and verify their playback quality.
        </p>
      </header>
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
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/10 text-sm font-semibold text-gold">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-display font-semibold">{lesson.title}</span>
                <span className="mt-1 block line-clamp-2 text-sm text-muted-foreground">
                  {lesson.description || "Premium lesson"}
                </span>
              </span>
              <PlayCircle className="h-5 w-5 text-gold" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseMessage({ title, body, slug }: { title: string; body: string; slug?: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <Lock className="mx-auto h-7 w-7 text-gold" />
      <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to={slug ? "/payment/$slug" : "/courses"}
        params={slug ? { slug } : undefined}
        className="mt-6 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        {slug ? "Buy now" : "View Premium Lessons"}
      </Link>
    </div>
  );
}
