import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  CreditCard,
  GraduationCap,
  Lock,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { COURSES, FREE_LESSONS, formatTZS } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { createSeoHead } from "@/lib/seo";
import { isPremiumCatalogAvailable, isPremiumCourseAvailable } from "@/lib/feature-access";
import { LearningFeatureGate } from "@/components/LearningFeatureGate";
import { useAdmin } from "@/hooks/useAdmin";

export const Route = createFileRoute("/courses/")({
  head: () =>
    createSeoHead({
      title: "Premium Forex Lessons",
      description:
        "Explore BLACKPIPS premium ALC forex lessons covering foundations, liquidity, entries and XAUUSD market structure.",
      path: "/courses",
      noindex: true,
    }),
  component: Courses,
});

function Courses() {
  return (
    <LearningFeatureGate
      featureEnabled={isPremiumCatalogAvailable()}
      title="Premium Lessons"
      description="Premium BLACKPIPS lessons are currently being prepared. Access will be available soon."
    >
      <CoursesCatalog />
    </LearningFeatureGate>
  );
}

const TABS = [
  { id: "premium", label: "Premium" },
  { id: "free", label: "Free lessons" },
  { id: "alc", label: "ALC Access" },
] as const;

const FLOW = [
  {
    title: "Choose a programme",
    body: "Compare lessons, level and price on the web.",
    icon: GraduationCap,
  },
  {
    title: "Pay with mobile money",
    body: "Submit your payment — the team confirms it.",
    icon: CreditCard,
  },
  {
    title: "Watch in the app",
    body: "Sign in with the same account. Your course is waiting.",
    icon: Smartphone,
  },
];

const ALC_STEPS = [
  { t: "Send your request", d: "Use the email you trained with if you can." },
  { t: "The team verifies you", d: "Your name, programme and proof of enrolment." },
  { t: "Access unlocks in the app", d: "The ALC library opens on your phone." },
];

const LEVEL_LABELS = ["Foundation", "Advanced", "Master", "Specialized"];
const COVER_MARKS = ["REG", "ADV", "MSTR", "T1–T8"];

function CoursesCatalog() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("premium");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [courseAccess, setCourseAccess] = useState<Map<string, "pending" | "purchased">>(new Map());
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPurchasesLoading(false);
      return;
    }
    const userId = user.id;
    let active = true;
    async function loadPurchases() {
      setPurchasesLoading(true);
      const [
        { data: purchases, error: purchasesError },
        { data: payments, error: paymentsError },
        { data: databaseCourses, error: coursesError },
      ] = await Promise.all([
        supabase.from("purchases").select("course_id").eq("user_id", userId),
        supabase
          .from("payments")
          .select("course_id,status,created_at")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase.from("courses").select("id,slug"),
      ]);
      if (active && !purchasesError && !paymentsError && !coursesError) {
        const courseSlugById = new Map(
          (databaseCourses ?? []).map((course) => [course.id, course.slug]),
        );
        const nextAccess = new Map<string, "pending" | "purchased">();
        for (const payment of payments ?? []) {
          const courseSlug = courseSlugById.get(payment.course_id);
          if (courseSlug) nextAccess.set(courseSlug, "pending");
        }
        for (const purchase of purchases ?? []) {
          const courseSlug = courseSlugById.get(purchase.course_id);
          if (courseSlug) nextAccess.set(courseSlug, "purchased");
        }
        setCourseAccess(nextAccess);
      }
      if (active) setPurchasesLoading(false);
    }
    void loadPurchases();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="bp bp-page">
      <div className="page-bg soft" aria-hidden="true" />
      <section className="lessons-hero">
        <div className="wrap split" style={{ gap: 56 }}>
          <div className="stack" style={{ gap: 20 }}>
            <span className="eyebrow rise" style={{ alignSelf: "flex-start" }}>
              <span className="tag">Lessons</span> Premium ALC programmes
            </span>
            <h1 className="h1 rise d1">
              Buy on the web. <span className="gold-text">Learn in the app.</span>
            </h1>
            <p className="lead rise d2">
              Every premium lesson plays securely inside the BLACKPIPS app. Choose your programme
              here, pay with mobile money, and open it on your phone with the same account.
            </p>
            <div className="row-wrap rise d3 stack-s" style={{ marginTop: 8 }}>
              <a className="btn btn-gold btn-lg" href="#catalog">
                Browse programmes
              </a>
              <Link to="/" hash="app" className="btn btn-ghost btn-lg">
                Get the app
              </Link>
            </div>
          </div>
          <div className="card spot rise d3" style={{ padding: 26 }}>
            <div className="flow">
              {FLOW.map((step, i) => (
                <div className="fstep" key={step.title}>
                  <span className="fdot" style={{ animationDelay: `${0.5 + i * 0.7}s` }}>
                    <step.icon aria-hidden="true" />
                  </span>
                  <span className="stack" style={{ gap: 3 }}>
                    <span className="micro">Step {i + 1}</span>
                    <span className="h4">{step.title}</span>
                    <span className="small">{step.body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="catalog" style={{ padding: "0 0 104px" }}>
        <div className="wrap">
          <div className="between" style={{ flexWrap: "wrap", marginBottom: 28 }}>
            <div className="seg" role="tablist" aria-label="Lesson library">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`seg-btn ${tab === t.id ? "on" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="small row" style={{ gap: 8 }}>
              <Smartphone className="gold" style={{ width: 16, height: 16 }} aria-hidden="true" />
              Videos play in the BLACKPIPS app
            </span>
          </div>

          {tab === "premium" && (
            <div className="grid-2" style={{ gap: 22 }}>
              {COURSES.map((course, i) => {
                const access = courseAccess.get(course.slug);
                const purchased = access === "purchased";
                const pending = access === "pending";
                const available = isPremiumCourseAvailable(course.slug) || isAdmin;
                const status = isAdmin
                  ? "Administrator access"
                  : !available
                    ? "Coming soon"
                    : purchased
                      ? "Purchased · lifetime access"
                      : pending
                        ? "Awaiting approval"
                        : null;
                return (
                  <article
                    key={course.slug}
                    className="card lift spot rise course-card"
                    style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                  >
                    <div className="cover">
                      <span className="spark" />
                      <span className="chip chip-gold lvl">{LEVEL_LABELS[i] ?? course.level}</span>
                      <span className="chip inapp">
                        {isAdmin ? (
                          <ShieldCheck aria-hidden="true" />
                        ) : purchased ? (
                          <Smartphone aria-hidden="true" />
                        ) : (
                          <Lock aria-hidden="true" />
                        )}
                        Plays in app
                      </span>
                      <span className="mk gold-text" aria-hidden="true">
                        {COVER_MARKS[i] ?? course.level}
                      </span>
                    </div>
                    <div className="course-body">
                      <div className="between" style={{ alignItems: "flex-start" }}>
                        <h2 className="h3" style={{ fontSize: 22 }}>
                          {course.title}
                        </h2>
                        {status ? (
                          <span className="chip chip-gold">{status}</span>
                        ) : (
                          <span className="course-price">{formatTZS(course.price)}</span>
                        )}
                      </div>
                      <p className="small">{course.description}</p>
                      <div className="meta">
                        <span>
                          <BookOpen aria-hidden="true" /> {course.lessons} lessons
                        </span>
                        <span>
                          <Clock aria-hidden="true" /> {course.duration}
                        </span>
                        <span>
                          <Award aria-hidden="true" /> Certificate
                        </span>
                      </div>
                      <div className="between course-foot">
                        <span className="small">{course.instructor}</span>
                        {isAdmin || purchased || pending ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              navigate({ to: "/courses/$slug", params: { slug: course.slug } })
                            }
                          >
                            {isAdmin ? (
                              "View Course"
                            ) : (
                              <>{purchased ? "Continue in BLACKPIPS App" : "View status"}</>
                            )}
                          </button>
                        ) : !available ? (
                          <button type="button" className="btn btn-ghost btn-sm" disabled>
                            Coming soon
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-gold btn-sm"
                            disabled={purchasesLoading || adminLoading}
                            onClick={() =>
                              navigate({ to: "/payment/$slug", params: { slug: course.slug } })
                            }
                          >
                            Buy now <ArrowRight className="arrow" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {tab === "free" && (
            <div className="split rise" style={{ alignItems: "start", gap: 28 }}>
              <div className="orbit">
                <div className="orbit-in" style={{ padding: "clamp(24px, 4vw, 40px)" }}>
                  <span className="ico ico-solid">
                    <Smartphone aria-hidden="true" />
                  </span>
                  <h2 className="h2" style={{ fontSize: "clamp(26px, 3vw, 36px)", marginTop: 20 }}>
                    Free lessons live in the app.
                  </h2>
                  <p className="body" style={{ marginTop: 12 }}>
                    Download BLACKPIPS and sign in with your account to watch the free library —
                    from what forex is to top-down analysis.
                  </p>
                  <div className="row-wrap stack-s" style={{ marginTop: 26 }}>
                    <Link to="/" hash="app" className="btn btn-dark">
                      App Store
                    </Link>
                    <Link to="/" hash="app" className="btn btn-ghost">
                      Google Play
                    </Link>
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding: 10 }}>
                {FREE_LESSONS.map((lesson, i) => (
                  <div className="frow" key={lesson.id}>
                    <span className="fnum">{String(i + 1).padStart(2, "0")}</span>
                    <span className="stack" style={{ gap: 3, minWidth: 0 }}>
                      <span className="h4" style={{ fontSize: 15 }}>
                        {lesson.title}
                      </span>
                      <span className="small">{lesson.level}</span>
                    </span>
                    <span className="chip">In app</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "alc" && (
            <div className="orbit rise">
              <div
                className="orbit-in split"
                style={{ padding: "clamp(24px, 5vw, 56px)", gap: 40 }}
              >
                <div className="stack" style={{ gap: 16 }}>
                  <p className="kicker">ALC Access</p>
                  <h2 className="h2" style={{ fontSize: "clamp(28px, 3.4vw, 42px)" }}>
                    Former student? Request your access.
                  </h2>
                  <p className="lead">
                    If you trained with BLACKPIPS before, send a request. Once the team approves it,
                    the ALC library opens in your app.
                  </p>
                  <Link
                    to="/alc-access"
                    className="btn btn-gold btn-lg"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Request access <ArrowRight className="arrow" aria-hidden="true" />
                  </Link>
                </div>
                <div className="stack" style={{ gap: 12 }}>
                  {ALC_STEPS.map((step, i) => (
                    <div className="card-flat row" style={{ padding: 18, gap: 16 }} key={step.t}>
                      <span className="fnum">{String(i + 1).padStart(2, "0")}</span>
                      <span className="stack" style={{ gap: 2 }}>
                        <span className="h4">{step.t}</span>
                        <span className="small">{step.d}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
