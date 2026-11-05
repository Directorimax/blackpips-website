import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Check, CheckCircle2, Lock, PlayCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { PageFrame } from "@/components/bp/PageFrame";
import { COURSES, formatTZS } from "@/lib/site-data";

export const Route = createFileRoute("/courses/$slug/")({
  component: () => (
    <PageFrame>
      <CourseAccess />
    </PageFrame>
  ),
});

type Course = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price?: number;
};
type AccessState = "locked" | "pending" | "purchased";
type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

function CourseAccess() {
  const { isAdmin, loading } = useAdmin();

  if (loading) return <CourseLoading label="Verifying access…" />;
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
        .select("id,slug,title,description,price")
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

  if (loading) return <CourseLoading label="Loading course…" />;
  if (!course)
    return <CourseMessage title="Course unavailable" body="Please return to Premium Lessons." />;

  const info = COURSES.find((c) => c.slug === course.slug);
  const price = course.price ?? info?.price;
  const step = access === "purchased" ? 3 : access === "pending" ? 2 : 0;

  return (
    <section className="course-page">
      <div className="wrap">
        <nav className="row small crumbs" aria-label="Breadcrumb">
          <Link to="/courses">Lessons</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: "var(--tx)" }}>{course.title}</span>
        </nav>
        <div className="clayout">
          <div className="stack" style={{ gap: 28 }}>
            <div className="stack rise" style={{ gap: 16 }}>
              <div className="row-wrap" style={{ gap: 8 }}>
                <span className="chip chip-gold">Premium</span>
                {info && <span className="chip">{info.lessons} lessons</span>}
                {info && <span className="chip">{info.duration}</span>}
                <span className="chip">Lifetime access</span>
              </div>
              <h1 className="h1">{course.title}</h1>
              <p className="lead">
                {course.description || info?.description || "A BLACKPIPS Premium Course."}
              </p>
            </div>
            <div className="card spot rise d1" style={{ padding: "clamp(22px, 3vw, 30px)" }}>
              <h2 className="h3">How it works</h2>
              <div className="grid-2" style={{ gap: "14px 24px", marginTop: 18 }}>
                {HOW_IT_WORKS.map((line) => (
                  <div className="learn" key={line}>
                    <Check strokeWidth={2.4} aria-hidden="true" />
                    {line}
                  </div>
                ))}
              </div>
            </div>
            <div
              className="card-flat row rise d2"
              style={{ padding: "18px 20px", gap: 16, flexWrap: "wrap" }}
            >
              <span className="ico">
                <ShieldCheck aria-hidden="true" />
              </span>
              <div style={{ flex: "1 1 280px" }}>
                <p className="h4">Lessons play only in the BLACKPIPS app</p>
                <p className="small" style={{ marginTop: 2 }}>
                  This protects the content. Your purchase, progress and certificate are linked to
                  your account.
                </p>
              </div>
            </div>
          </div>

          <aside className="buy rise d2">
            <div className="orbit">
              <div
                className="orbit-in"
                style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="pstep" aria-hidden="true">
                  {PURCHASE_STEPS.map((label, i) => (
                    <i key={label} className={i <= step ? "on" : ""} />
                  ))}
                </div>
                <div className="pstep-labels" aria-hidden="true">
                  {PURCHASE_STEPS.map((label, i) => (
                    <span key={label} className={i <= step ? "on" : ""}>
                      {label}
                    </span>
                  ))}
                </div>

                {access === "locked" && (
                  <div className="stack" style={{ gap: 16 }}>
                    <p className="micro">One-time payment</p>
                    {price != null && (
                      <p
                        style={{
                          fontSize: 44,
                          fontWeight: 800,
                          letterSpacing: "-.04em",
                          lineHeight: 1,
                        }}
                      >
                        {formatTZS(price)}
                      </p>
                    )}
                    <p className="small">
                      Purchase this Premium Course to submit your payment for approval. Lifetime
                      access in the BLACKPIPS app.
                    </p>
                    <Link
                      to="/payment/$slug"
                      params={{ slug: course.slug }}
                      className="btn btn-gold btn-lg btn-block"
                    >
                      Buy course
                    </Link>
                    <p className="small center" style={{ fontSize: 12 }}>
                      Pay with M-Pesa, Airtel Money or Mixx by Yas
                    </p>
                  </div>
                )}

                {access === "pending" && (
                  <div
                    className="stack rise"
                    style={{ gap: 16, alignItems: "center", textAlign: "center" }}
                  >
                    <div className="spinner" aria-hidden="true" />
                    <p className="micro">Payment under review</p>
                    <p className="h3">Payment submitted</p>
                    <p className="small">
                      Your payment is awaiting approval. Once approved, your Premium Course will be
                      available in the BLACKPIPS App.
                    </p>
                    <span className="chip chip-gold">Pending confirmation</span>
                    <Link to="/dashboard" className="btn btn-ghost btn-sm">
                      Go to dashboard
                    </Link>
                  </div>
                )}

                {access === "purchased" && (
                  <div className="stack rise" style={{ gap: 16 }}>
                    <span className="ico ico-solid course-ready-ico">
                      <Check strokeWidth={2.6} aria-hidden="true" />
                    </span>
                    <p className="micro">Purchased · Lifetime Access</p>
                    <p className="h3" style={{ fontSize: 22 }}>
                      Your course is ready in the app.
                    </p>
                    <p className="small">
                      Your Premium Course is ready in the BLACKPIPS App. Open the app already
                      installed on your device and sign in with the same BLACKPIPS account to
                      continue learning.
                    </p>
                    <span className="chip chip-gold" style={{ alignSelf: "flex-start" }}>
                      <CheckCircle2 aria-hidden="true" style={{ width: 14, height: 14 }} /> Access
                      approved
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

const PURCHASE_STEPS = ["Buy", "Pay", "Review", "In app"];
const HOW_IT_WORKS = [
  "Buy the course on the website",
  "Pay with mobile money and upload the receipt",
  "The team confirms your payment",
  "Learn in the BLACKPIPS app with the same account",
];

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

  if (loading) return <CourseLoading label="Loading course…" />;
  if (!course)
    return <CourseMessage title="Course unavailable" body="Please return to Premium Lessons." />;

  return (
    <section className="course-page">
      <div className="wrap" style={{ maxWidth: 920 }}>
        <nav className="row small crumbs" aria-label="Breadcrumb">
          <Link to="/courses">Lessons</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: "var(--tx)" }}>{course.title}</span>
        </nav>
        <header className="stack rise" style={{ gap: 12 }}>
          <span className="eyebrow" style={{ alignSelf: "flex-start" }}>
            <BookOpen aria-hidden="true" /> Administrator course inspection
          </span>
          <h1 className="h1">{course.title}</h1>
          <p className="body">
            Review the published Premium lessons and verify their playback quality.
          </p>
        </header>
        {lessons.length === 0 ? (
          <div className="card" style={{ marginTop: 28, padding: 40, textAlign: "center" }}>
            <p className="small">Lessons are being prepared.</p>
          </div>
        ) : (
          <div className="card rise d1" style={{ marginTop: 28, overflow: "hidden" }}>
            <div className="between" style={{ padding: 20, borderBottom: "1px solid var(--line)" }}>
              <h2 className="h3">Curriculum</h2>
              <span className="small mono">{lessons.length} lessons</span>
            </div>
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                to="/courses/$slug/$lessonSlug"
                params={{ slug: course.slug, lessonSlug: lesson.slug }}
                className="les"
              >
                <span className="les-n">{String(index + 1).padStart(2, "0")}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="h4" style={{ display: "block" }}>
                    {lesson.title}
                  </span>
                  <span className="small line-clamp-2" style={{ display: "block", marginTop: 2 }}>
                    {lesson.description || "Premium lesson"}
                  </span>
                </span>
                <PlayCircle aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CourseLoading({ label }: { label: string }) {
  return (
    <div className="wrap center small" style={{ padding: "96px 24px" }}>
      {label}
    </div>
  );
}

function CourseMessage({ title, body }: { title: string; body: string }) {
  return (
    <section className="course-page">
      <div className="wrap">
        <div className="card msg-card rise">
          <span className="ico">
            <Lock aria-hidden="true" />
          </span>
          <h1 className="h2">{title}</h1>
          <p className="small">{body}</p>
          <Link to="/courses" className="btn btn-gold">
            View Premium Lessons
          </Link>
        </div>
      </div>
    </section>
  );
}
