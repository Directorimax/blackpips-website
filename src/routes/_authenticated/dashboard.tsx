import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookmarkX,
  Award,
  CheckCircle2,
  Clock3,
  LogOut,
  PlayCircle,
  RotateCcw,
  Sparkles,
  CreditCard,
  MessageCircle,
  User as UserIcon,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { COURSES, FREE_LESSONS, formatTZS } from "@/lib/site-data";
import { useAuth } from "@/contexts/useAuth";
import { mentorshipWhatsAppUrl } from "@/lib/mentorship";
import { useAdmin } from "@/hooks/useAdmin";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — BlackPips" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

type Tab = "learning" | "bookmarks" | "mentorship" | "account" | "billing" | "certificates";

type Profile = { full_name: string | null; avatar: string | null; country: string | null };
type Lesson = { id: string; course_id: string; slug: string; title: string; position: number };
type LessonProgress = {
  course_id: string;
  lesson_id: string;
  last_viewed_at: string;
  is_completed: boolean;
};
type PaymentSubmission = {
  id: string;
  course_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  provider: string | null;
  transaction_id: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
};
type MentorshipApplication = {
  id: string;
  mentorship_package_id: string;
  package_name: string;
  status: "pending" | "approved" | "waitlisted" | "rejected";
  learner_message: string | null;
  created_at: string;
};
type CourseCertificate = {
  id: string;
  course_id: string;
  course_name: string;
  certificate_number: string;
  issued_at: string;
  completion_percentage: number;
  pdf_generated: boolean;
};

function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut: sharedSignOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { avatarUrl } = useProfileAvatar();
  const [tab, setTab] = useState<Tab>("learning");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    avatar: "",
    country: "",
  });
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [purchasedCourseIds, setPurchasedCourseIds] = useState<string[]>([]);
  const [databaseCourseSlugs, setDatabaseCourseSlugs] = useState<Record<string, string>>({});
  const [databaseCourseTitles, setDatabaseCourseTitles] = useState<Record<string, string>>({});
  const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [mentorshipApplication, setMentorshipApplication] = useState<MentorshipApplication | null>(
    null,
  );
  const [mentorshipLoading, setMentorshipLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [publishedLessons, setPublishedLessons] = useState<Lesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [learningLoading, setLearningLoading] = useState(true);
  const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(true);
  const [certificatesError, setCertificatesError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && isAdmin) navigate({ to: "/admin", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  const refreshPaymentSubmissions = useCallback(async (userId: string) => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id,course_id,amount,currency,payment_method,provider,transaction_id,status,rejection_reason,created_at,reviewed_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setPaymentsError("We could not load your payment history. Please try again.");
    } else {
      setPaymentSubmissions(data ?? []);
    }
    setPaymentsLoading(false);
  }, []);

  const refreshCertificates = useCallback(async () => {
    setCertificatesLoading(true);
    setCertificatesError(null);
    const { data, error } = await supabase.rpc("my_course_certificates");
    if (error) {
      console.error("Could not load learner certificates:", error);
      setCertificatesError("We could not load your certificates. Please try again.");
    } else {
      setCertificates(data ?? []);
    }
    setCertificatesLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setEmail(user.email ?? "");
      void refreshPaymentSubmissions(user.id);
      void refreshCertificates();
      const [
        { data: p },
        { data: bm },
        { data: purchases },
        { data: databaseCourses },
        { data: lessonData, error: lessonsError },
        { data: progressData, error: progressError },
        { data: latestMentorshipApplication },
        { data: mentorshipPackages },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,avatar,country")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("bookmarks").select("lesson_id").eq("user_id", user.id),
        supabase
          .from("purchases")
          .select("course_id,amount,payment_status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("courses").select("id,slug,title"),
        supabase
          .from("lessons")
          .select("id,course_id,slug,title,position")
          .eq("is_published", true)
          .order("position", { ascending: true }),
        supabase
          .from("lesson_progress")
          .select("course_id,lesson_id,last_viewed_at,is_completed")
          .eq("user_id", user.id)
          .order("last_viewed_at", { ascending: false }),
        supabase
          .from("mentorship_applications")
          .select("id,mentorship_package_id,status,learner_message,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("mentorship_packages").select("id,name"),
      ]);
      if (p)
        setProfile({
          full_name: p.full_name ?? "",
          avatar: p.avatar ?? "",
          country: p.country ?? "",
        });
      setBookmarkIds((bm ?? []).map((b) => b.lesson_id));
      setPurchasedCourseIds((purchases ?? []).map((purchase) => purchase.course_id));
      setDatabaseCourseSlugs(
        Object.fromEntries((databaseCourses ?? []).map((course) => [course.id, course.slug])),
      );
      setDatabaseCourseTitles(
        Object.fromEntries((databaseCourses ?? []).map((course) => [course.id, course.title])),
      );
      if (lessonsError) console.error("Could not load premium lessons", lessonsError);
      if (progressError) console.error("Could not load lesson progress", progressError);
      setPublishedLessons(lessonData ?? []);
      setLessonProgress(progressData ?? []);
      setLearningLoading(false);
      const mentorshipPackageNames = Object.fromEntries(
        (mentorshipPackages ?? []).map((mentorshipPackage) => [
          mentorshipPackage.id,
          mentorshipPackage.name,
        ]),
      );
      setMentorshipApplication(
        latestMentorshipApplication
          ? {
              ...latestMentorshipApplication,
              package_name:
                mentorshipPackageNames[latestMentorshipApplication.mentorship_package_id] ??
                "Mentorship package",
            }
          : null,
      );
      setMentorshipLoading(false);
    })();
  }, [refreshCertificates, refreshPaymentSubmissions, user]);

  useEffect(() => {
    if (!user) return;
    const refreshOnFocus = () => void refreshPaymentSubmissions(user.id);
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [refreshPaymentSubmissions, user]);

  async function signOut() {
    await sharedSignOut();
    navigate({ to: "/auth", replace: true });
  }

  async function removeBookmark(lessonId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId);
    if (error) return toast.error("Could not remove bookmark");
    setBookmarkIds((prev) => prev.filter((id) => id !== lessonId));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const nm = z
        .string()
        .trim()
        .min(1)
        .max(80)
        .parse(profile.full_name ?? "");
      const country = z
        .string()
        .trim()
        .max(80)
        .parse(profile.country ?? "");
      const avatar = z
        .string()
        .trim()
        .max(500)
        .parse(profile.avatar ?? "");
      if (!user) return;
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: nm,
        country: country || null,
        avatar: avatar || null,
      });
      if (error) throw error;
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Failed",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  const purchasedSlugs = new Set(
    purchasedCourseIds.map((id) => databaseCourseSlugs[id]).filter(Boolean),
  );
  const myCourses = COURSES.filter((c) => purchasedSlugs.has(c.slug));
  const bookmarkedLessons = FREE_LESSONS.filter((l) => bookmarkIds.includes(l.id));
  const initials = (profile.full_name || email || "U").slice(0, 1).toUpperCase();
  const courseIdBySlug = Object.fromEntries(
    Object.entries(databaseCourseSlugs).map(([id, courseSlug]) => [courseSlug, id]),
  );
  const lessonById = new Map(publishedLessons.map((lesson) => [lesson.id, lesson]));
  const recentProgress = lessonProgress
    .filter(
      (progress) =>
        purchasedCourseIds.includes(progress.course_id) && lessonById.has(progress.lesson_id),
    )
    .sort((a, b) => b.last_viewed_at.localeCompare(a.last_viewed_at))[0];
  const recentLesson = recentProgress ? lessonById.get(recentProgress.lesson_id) : undefined;
  const firstIncompleteLesson = purchasedCourseIds.flatMap((courseId) =>
    publishedLessons
      .filter((lesson) => lesson.course_id === courseId)
      .sort((a, b) => a.position - b.position)
      .filter(
        (lesson) =>
          !lessonProgress.some(
            (progress) => progress.lesson_id === lesson.id && progress.is_completed,
          ),
      ),
  )[0];
  const continueLesson = recentLesson ?? firstIncompleteLesson;
  const continueCourseId = recentProgress?.course_id ?? firstIncompleteLesson?.course_id;

  function continueLearning(courseId: string) {
    const courseSlug = databaseCourseSlugs[courseId];
    if (courseSlug) navigate({ to: "/courses/$slug", params: { slug: courseSlug } });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border border-gold/40 shadow-glow">
            <AvatarImage src={avatarUrl ?? undefined} alt="Your profile photo" />
            <AvatarFallback className="bg-gradient-gold font-display text-xl font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gold">
              Dashboard
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
              Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <nav className="glass mt-8 flex gap-1 overflow-x-auto rounded-full p-1">
        {(
          [
            ["learning", "My Learning", Sparkles],
            ["bookmarks", "Bookmarks", PlayCircle],
            ["mentorship", "Mentorship", MessageCircle],
            ["certificates", "Certificates", Award],
            ["account", "Account", UserIcon],
            ["billing", "Billing", CreditCard],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${tab === id ? "bg-gradient-gold text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </nav>

      <section className="mt-8">
        {tab === "learning" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Continue learning</h2>
            {learningLoading ? (
              <div className="glass mt-4 grid min-h-36 place-items-center rounded-3xl text-sm text-muted-foreground">
                Loading your learning progress…
              </div>
            ) : myCourses.length === 0 ? (
              <EmptyState
                title="No purchased courses yet"
                body="Your premium lessons stay locked until an approved payment grants access."
                ctaTo="/courses"
                ctaLabel="Browse Premium Lessons"
              />
            ) : (
              <>
                {continueLesson && continueCourseId ? (
                  <Link
                    to="/courses/$slug/$lessonSlug"
                    params={{
                      slug: databaseCourseSlugs[continueCourseId],
                      lessonSlug: continueLesson.slug,
                    }}
                    className="glass mt-4 flex flex-col gap-4 rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-elegant sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-gold">
                        {recentLesson ? "Resume lesson" : "Start course"}
                      </div>
                      <h3 className="mt-2 font-display text-xl font-semibold">
                        {continueLesson.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {databaseCourseTitles[continueCourseId] ?? "Premium course"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                      <PlayCircle className="h-4 w-4" /> Continue Learning
                    </span>
                  </Link>
                ) : (
                  <div className="glass mt-4 rounded-3xl p-6 text-sm text-muted-foreground">
                    Start a premium lesson to resume it here.
                  </div>
                )}

                <h3 className="mt-8 font-display text-xl font-semibold">Your courses</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myCourses.map((c) => {
                    const courseId = courseIdBySlug[c.slug];
                    const lessons = publishedLessons.filter(
                      (lesson) => lesson.course_id === courseId,
                    );
                    const completedCount = lessonProgress.filter(
                      (progress) =>
                        progress.course_id === courseId &&
                        progress.is_completed &&
                        lessons.some((lesson) => lesson.id === progress.lesson_id),
                    ).length;
                    const percentage = lessons.length
                      ? Math.round((completedCount / lessons.length) * 100)
                      : 0;
                    return (
                      <article
                        key={c.slug}
                        className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-elegant"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                          {c.level}
                        </span>
                        <h3 className="mt-2 font-display text-base font-semibold">{c.title}</h3>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-gradient-gold"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{percentage}% complete</span>
                          <span>
                            {completedCount} / {lessons.length} lessons
                          </span>
                        </div>
                        <button
                          onClick={() => courseId && continueLearning(courseId)}
                          className="mt-5 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/20"
                        >
                          View lessons
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "bookmarks" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Saved free lessons</h2>
            {bookmarkedLessons.length === 0 ? (
              <EmptyState
                title="Nothing bookmarked yet"
                body="Save any free lesson from the library to find it here."
                ctaTo="/free"
                ctaLabel="Explore free lessons"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bookmarkedLessons.map((l) => (
                  <article key={l.id} className="rounded-2xl border border-border bg-card p-5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                      {l.level}
                    </span>
                    <h3 className="mt-2 font-display text-base font-semibold">{l.title}</h3>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{l.duration}</span>
                      <button
                        onClick={() => removeBookmark(l.id)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <BookmarkX className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "account" && (
          <form onSubmit={saveProfile} className="glass max-w-xl rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">Profile</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Full name">
                <input
                  value={profile.full_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  maxLength={80}
                  className="w-full bg-transparent outline-none"
                />
              </Field>
              <Field label="Country">
                <input
                  value={profile.country ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                  maxLength={80}
                  className="w-full bg-transparent outline-none"
                />
              </Field>
              <Field label="Avatar URL">
                <input
                  value={profile.avatar ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))}
                  maxLength={500}
                  placeholder="https://…"
                  className="w-full bg-transparent outline-none"
                />
              </Field>
              <Field label="Email">
                <input
                  value={email}
                  disabled
                  className="w-full bg-transparent text-muted-foreground outline-none"
                />
              </Field>
            </div>
            <button
              disabled={savingProfile}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              Save changes
            </button>
          </form>
        )}

        {tab === "mentorship" && (
          <MentorshipStatus application={mentorshipApplication} loading={mentorshipLoading} />
        )}

        {tab === "certificates" && (
          <CertificatesPanel
            certificates={certificates}
            loading={certificatesLoading}
            error={certificatesError}
            onRetry={() => void refreshCertificates()}
          />
        )}

        {tab === "billing" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Payment history</h2>
            {paymentsLoading ? (
              <div className="glass mt-4 grid max-w-3xl place-items-center rounded-3xl p-10 text-sm text-muted-foreground">
                Loading payment history…
              </div>
            ) : paymentsError ? (
              <div className="glass mt-4 max-w-3xl rounded-3xl p-8 text-center">
                <h3 className="font-display text-lg font-semibold">Payment history unavailable</h3>
                <p className="mt-2 text-sm text-muted-foreground">{paymentsError}</p>
                <button
                  onClick={() => user && void refreshPaymentSubmissions(user.id)}
                  className="mt-5 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Try again
                </button>
              </div>
            ) : paymentSubmissions.length === 0 ? (
              <EmptyState
                title="No payment submissions yet"
                body="Your course payment submissions and their verification status will appear here."
                ctaTo="/courses"
                ctaLabel="Browse Premium Lessons"
              />
            ) : (
              <div className="glass mt-5 max-w-3xl divide-y divide-border overflow-hidden rounded-3xl">
                {paymentSubmissions.map((payment) => {
                  const status = getPaymentStatusDetails(payment.status, payment.rejection_reason);
                  const courseSlug = databaseCourseSlugs[payment.course_id];
                  const paymentMethod = [payment.payment_method, payment.provider]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <article
                      key={payment.id}
                      className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-base font-semibold">
                          {databaseCourseTitles[payment.course_id] ?? "Premium course"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {formatPaymentTimestamp(payment.created_at)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Transaction ID: {payment.transaction_id ?? "Not available"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {paymentMethod || "Payment method not available"}
                        </p>
                        <p className={`mt-4 text-sm ${status.messageClass}`}>{status.message}</p>
                        {status.isApproved && (
                          <button
                            onClick={() => continueLearning(payment.course_id)}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                          >
                            Continue Learning
                          </button>
                        )}
                        {status.isRejected && (
                          <button
                            disabled={!courseSlug}
                            onClick={() =>
                              courseSlug &&
                              navigate({
                                to: "/payment/$slug",
                                params: { slug: courseSlug },
                              })
                            }
                            className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Submit New Payment
                          </button>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-5 sm:flex-col sm:items-end sm:gap-3">
                        <span className="font-display text-lg font-bold text-gradient-gold">
                          {payment.currency === "TZS"
                            ? formatTZS(payment.amount)
                            : `${payment.currency} ${payment.amount.toLocaleString("en-US")}`}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.badgeClass}`}
                        >
                          {status.isPending && (
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {status.isApproved && (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {status.label}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function formatPaymentTimestamp(value: string | null) {
  if (!value) return "Date unavailable";
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")} • ${part("hour")}:${part("minute")} ${part("dayPeriod").toUpperCase()}`;
}

function getPaymentStatusDetails(status: string, rejectionReason: string | null) {
  switch (status.toLowerCase()) {
    case "approved":
    case "paid":
      return {
        label: "Approved",
        message: "Course unlocked.",
        badgeClass:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        messageClass: "text-emerald-600 dark:text-emerald-400",
        isApproved: true,
        isPending: false,
        isRejected: false,
      };
    case "rejected":
    case "failed":
    case "cancelled":
      return {
        label: status.toLowerCase() === "rejected" ? "Rejected" : status,
        message: `Reason: ${rejectionReason?.trim() || "Please contact support for more information."}`,
        badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
        messageClass: "font-medium text-destructive",
        isApproved: false,
        isPending: false,
        isRejected: true,
      };
    default:
      return {
        label: "Pending Verification",
        message: "Your payment has been received and is currently under review.",
        badgeClass: "border-gold/30 bg-gold/10 text-gold",
        messageClass: "text-muted-foreground",
        isApproved: false,
        isPending: true,
        isRejected: false,
      };
  }
}

function MentorshipStatus({
  application,
  loading,
}: {
  application: MentorshipApplication | null;
  loading: boolean;
}) {
  if (loading)
    return (
      <div className="glass grid max-w-2xl place-items-center rounded-3xl p-10 text-sm text-muted-foreground">
        Loading mentorship application…
      </div>
    );
  if (!application)
    return (
      <EmptyState
        title="No mentorship application yet"
        body="Apply for a mentorship package and track our review here."
        ctaTo="/mentorship"
        ctaLabel="Explore Mentorship"
      />
    );

  const details = mentorshipStatusDetails(application);
  return (
    <div className={`glass max-w-2xl rounded-3xl border p-8 ${details.panelClass}`}>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${details.badgeClass}`}>
        {application.status}
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold">{details.title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{details.body}</p>
      <p className="mt-4 text-sm">
        <span className="font-semibold">Package:</span> {application.package_name}
      </p>
      {application.status === "rejected" && (
        <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="font-semibold">Reason:</span>{" "}
          {application.learner_message?.trim() || "Please contact support for more information."}
        </div>
      )}
      {application.status === "approved" && (
        <a
          href={mentorshipWhatsAppUrl(application.package_name)}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
        </a>
      )}
    </div>
  );
}

function mentorshipStatusDetails(application: MentorshipApplication) {
  switch (application.status) {
    case "approved":
      return {
        title: "Congratulations!",
        body: `Your application for ${application.package_name} has been approved. Contact your mentor directly to discuss your goals, arrange Zoom sessions and receive payment instructions.`,
        badgeClass:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        panelClass: "border-emerald-500/20",
      };
    case "waitlisted":
      return {
        title: "You are currently on the waiting list",
        body: "We will update your application when a mentorship slot becomes available.",
        badgeClass: "border-gold/30 bg-gold/10 text-gold",
        panelClass: "border-gold/20",
      };
    case "rejected":
      return {
        title: "Your application was not approved at this time",
        body: "Unfortunately, your application has not been approved.",
        badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
        panelClass: "border-destructive/20",
      };
    default:
      return {
        title: "Application received",
        body: "We are reviewing your mentorship application, goals and preferred schedule. No action is required from you at this time.",
        badgeClass: "border-gold/30 bg-gold/10 text-gold",
        panelClass: "border-gold/20",
      };
  }
}

function CertificatesPanel({
  certificates,
  loading,
  error,
  onRetry,
}: {
  certificates: CourseCertificate[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gold">Achievement</div>
        <h2 className="mt-2 font-display text-xl font-semibold">Certificates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Certificates are awarded automatically when you complete every published lesson.
        </p>
      </div>
      {loading ? (
        <div className="glass mt-5 grid min-h-40 place-items-center rounded-3xl text-sm text-muted-foreground">
          Loading certificatesâ€¦
        </div>
      ) : error ? (
        <div className="glass mt-5 rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={onRetry}
            className="mt-5 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Try again
          </button>
        </div>
      ) : certificates.length === 0 ? (
        <div className="glass mt-5 rounded-3xl p-10 text-center">
          <Award className="mx-auto h-8 w-8 text-gold" />
          <h3 className="mt-4 font-display text-lg font-semibold">
            Your certificates will appear here
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete all published lessons in an owned premium course to earn your certificate.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <article key={certificate.id} className="glass rounded-3xl p-5 shadow-elegant">
              <div className="flex items-start justify-between gap-3">
                <Award className="h-6 w-6 text-gold" />
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                  Completed
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{certificate.course_name}</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Issued {new Date(certificate.issued_at).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-wide text-gold">
                {certificate.certificate_number}
              </p>
              <Link
                to="/certificates/$certificateId"
                params={{ certificateId: certificate.id }}
                className="mt-5 inline-flex rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
              >
                View & download
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="glass rounded-xl px-3 py-2.5">{children}</div>
    </label>
  );
}

function EmptyState({
  title,
  body,
  ctaTo,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="glass mt-4 rounded-3xl p-10 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link
        to={ctaTo}
        className="mt-5 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
