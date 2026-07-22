import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  GraduationCap,
  Layers3,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/useAuth";
import { formatTZS } from "@/lib/site-data";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Executive Dashboard — BlackPips" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <AuthenticatedRouteGuard>
      <ExecutiveDashboard />
    </AuthenticatedRouteGuard>
  ),
});

type Summary = {
  total_revenue: number;
  revenue_this_month: number;
  total_learners: number;
  active_learners: number;
  pending_payments: number;
  pending_mentorship_applications: number;
  published_courses: number;
  published_lessons: number;
};
type RevenueMonth = { month: string; month_start: string; revenue: number };
type Course = {
  course_id: string;
  course_name: string;
  purchases: number;
  revenue: number;
  completion_percentage: number;
};
type Student = {
  student_id: string;
  display_name: string;
  email?: string;
  last_activity?: string;
  joined_at?: string;
  lessons_touched?: number;
  completed_lessons?: number;
  total_lessons?: number;
  completion_percentage?: number;
};
type LessonActivity = {
  progress_id: string;
  display_name: string;
  lesson_title: string;
  course_name: string;
  activity_at: string;
  is_completed: boolean;
};
type Payment = {
  payment_id: string;
  display_name: string;
  course_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};
type Application = {
  application_id: string;
  display_name: string;
  package_name: string;
  status: string;
  created_at: string;
};
type Purchase = {
  purchase_id: string;
  display_name: string;
  course_name: string;
  amount: number;
  created_at: string;
};
type DashboardData = {
  summary: Summary;
  monthly_revenue: RevenueMonth[];
  top_courses: Course[];
  most_active_students: Student[];
  recent_learners: Student[];
  completion_leaderboard: Student[];
  recent_lesson_activity: LessonActivity[];
  recent_payments: Payment[];
  recent_applications: Application[];
  recent_purchases: Purchase[];
};

const FALLBACK_DATA: DashboardData = {
  summary: {
    total_revenue: 0,
    revenue_this_month: 0,
    total_learners: 0,
    active_learners: 0,
    pending_payments: 0,
    pending_mentorship_applications: 0,
    published_courses: 0,
    published_lessons: 0,
  },
  monthly_revenue: [],
  top_courses: [],
  most_active_students: [],
  recent_learners: [],
  completion_leaderboard: [],
  recent_lesson_activity: [],
  recent_payments: [],
  recent_applications: [],
  recent_purchases: [],
};

function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setError(null);
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_dashboard_overview");
    if (rpcError) {
      console.error("Could not load the executive dashboard:", rpcError);
      setError("We could not load the business overview. Please try again.");
      return;
    }
    setData({ ...FALLBACK_DATA, ...(rpcData as DashboardData) });
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) void loadOverview();
  }, [isAdmin, loadOverview]);

  const greeting = getGreeting();
  const adminName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Admin";

  if (adminLoading || !isAdmin) return <PageLoader />;
  if (!data && !error) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl place-items-center px-4 py-16">
        <div className="glass max-w-md rounded-3xl p-8 text-center shadow-elegant">
          <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => void loadOverview()}
            className="mt-5 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          <ShieldCheck className="h-4 w-4" /> Administration
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
          {greeting}, <span className="text-gradient-gold">{adminName}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Here&apos;s what&apos;s happening in BlackPips.
        </p>
      </motion.header>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Executive summary"
      >
        <SummaryCard
          icon={CircleDollarSign}
          label="Revenue"
          value={data!.summary.total_revenue}
          format="currency"
          description="Total approved revenue"
          delay={0}
        />
        <SummaryCard
          icon={BarChart3}
          label="Revenue this month"
          value={data!.summary.revenue_this_month}
          format="currency"
          description="Approved this calendar month"
          delay={0.04}
        />
        <SummaryCard
          icon={UsersRound}
          label="Students"
          value={data!.summary.total_learners}
          description={`${data!.summary.active_learners} active in the last 30 days`}
          delay={0.08}
        />
        <SummaryCard
          icon={UserCheck}
          label="Active learners"
          value={data!.summary.active_learners}
          description="Viewed or completed a lesson in 30 days"
          delay={0.12}
        />
        <SummaryCard
          icon={Clock3}
          label="Pending payments"
          value={data!.summary.pending_payments}
          description="Awaiting verification"
          delay={0.16}
        />
        <SummaryCard
          icon={GraduationCap}
          label="Mentorship applications"
          value={data!.summary.pending_mentorship_applications}
          description="Pending review"
          delay={0.2}
        />
        <SummaryCard
          icon={Layers3}
          label="Published courses"
          value={data!.summary.published_courses}
          description="Courses currently in the catalogue"
          delay={0.24}
        />
        <SummaryCard
          icon={BookOpen}
          label="Published lessons"
          value={data!.summary.published_lessons}
          description="Available to entitled learners"
          delay={0.28}
        />
      </section>

      <section className="glass mt-8 rounded-3xl p-5 shadow-elegant sm:p-6">
        <SectionHeading
          eyebrow="Revenue"
          title="Monthly approved revenue"
          description="Last 12 months of approved payment volume."
        />
        <div className="mt-6 h-72 sm:h-80">
          {data!.monthly_revenue.length ? (
            <RevenueChart data={data!.monthly_revenue} />
          ) : (
            <EmptyChart />
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Top courses" eyebrow="Performance">
          <TopCourses courses={data!.top_courses} />
        </Panel>
        <Panel title="Quick actions" eyebrow="Administration">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction
              to="/admin/payments"
              icon={CreditCard}
              title="Review Payments"
              body="Verify submissions and grant access."
            />
            <QuickAction
              to="/admin/mentorship-applications"
              icon={GraduationCap}
              title="Review Mentorship"
              body="Manage learner applications."
            />
            <QuickAction
              to="/admin/lessons"
              icon={BookOpen}
              title="Manage Lessons"
              body="Create and publish course content."
            />
            <QuickAction
              to="/admin/students"
              icon={UsersRound}
              title="View Students"
              body="Review learner access and progress."
            />
          </div>
        </Panel>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="Most active students" eyebrow="Student insights">
          <StudentList students={data!.most_active_students} variant="activity" />
        </Panel>
        <Panel title="Recent learners" eyebrow="Student insights">
          <StudentList students={data!.recent_learners} variant="joined" />
        </Panel>
        <Panel title="Completion leaderboard" eyebrow="Student insights">
          <StudentList students={data!.completion_leaderboard} variant="completion" />
        </Panel>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent lesson activity" eyebrow="Learning activity">
          <LessonActivityList activities={data!.recent_lesson_activity} />
        </Panel>
        <div className="grid gap-6">
          <Panel title="Recent payments" eyebrow="Operations">
            <PaymentList payments={data!.recent_payments} />
          </Panel>
          <Panel title="Recent mentorship applications" eyebrow="Operations">
            <ApplicationList applications={data!.recent_applications} />
          </Panel>
          <Panel title="Recent purchases" eyebrow="Operations">
            <PurchaseList purchases={data!.recent_purchases} />
          </Panel>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  format = "number",
  delay,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  description: string;
  format?: "number" | "currency";
  delay: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -3 }}
      className="glass rounded-3xl p-5 shadow-elegant transition-shadow hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            <CountUp value={value} format={format} />
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold/10 text-gold">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </motion.article>
  );
}

function CountUp({ value, format }: { value: number; format: "number" | "currency" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 500;
    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>{format === "currency" ? formatTZS(display) : new Intl.NumberFormat().format(display)}</>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-5 shadow-elegant sm:p-6">
      <SectionHeading eyebrow={eyebrow} title={title} description="" />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RevenueChart({ data }: { data: RevenueMonth[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "currentColor", fontSize: 11 }}
          opacity={0.6}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "currentColor", fontSize: 11 }}
          opacity={0.6}
          tickFormatter={(value) => `TSh ${(Number(value) / 1000).toLocaleString()}k`}
        />
        <Tooltip
          cursor={{ fill: "currentColor", opacity: 0.04 }}
          contentStyle={{
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
          }}
          formatter={(value) => [formatTZS(Number(value)), "Revenue"]}
        />
        <Bar dataKey="revenue" fill="var(--gold)" radius={[8, 8, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}
function EmptyChart() {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
      No approved revenue has been recorded yet.
    </div>
  );
}

function TopCourses({ courses }: { courses: Course[] }) {
  if (!courses.length) return <EmptyList text="No courses or purchases yet." />;
  return (
    <div className="divide-y divide-border/60">
      {courses.map((course, index) => (
        <div key={course.course_id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold">{course.course_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {course.purchases} purchases · {formatTZS(course.revenue)}
            </p>
          </div>
          <span className="text-sm font-bold text-gold">{course.completion_percentage}%</span>
        </div>
      ))}
    </div>
  );
}
function StudentList({
  students,
  variant,
}: {
  students: Student[];
  variant: "activity" | "joined" | "completion";
}) {
  if (!students.length) return <EmptyList text="No learner data yet." />;
  return (
    <div className="divide-y divide-border/60">
      {students.map((student) => (
        <Link
          key={student.student_id}
          to="/admin/students/$studentId"
          params={{ studentId: student.student_id }}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 transition hover:text-gold"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{student.display_name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {variant === "activity"
                ? `${student.lessons_touched ?? 0} lessons touched · ${formatDate(student.last_activity)}`
                : variant === "joined"
                  ? `Joined ${formatDate(student.joined_at)}`
                  : `${student.completed_lessons ?? 0} of ${student.total_lessons ?? 0} lessons`}
            </p>
          </div>
          {variant === "completion" && (
            <span className="text-sm font-bold text-gold">
              {student.completion_percentage ?? 0}%
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
function LessonActivityList({ activities }: { activities: LessonActivity[] }) {
  if (!activities.length) return <EmptyList text="No lesson activity yet." />;
  return (
    <div className="divide-y divide-border/60">
      {activities.map((activity) => (
        <div key={activity.progress_id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
          <span
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${activity.is_completed ? "bg-emerald-500/10 text-emerald-500" : "bg-gold/10 text-gold"}`}
          >
            {activity.is_completed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{activity.display_name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {activity.is_completed ? "Completed" : "Viewed"} {activity.lesson_title} ·{" "}
              {activity.course_name}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatDate(activity.activity_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
function PaymentList({ payments }: { payments: Payment[] }) {
  if (!payments.length) return <EmptyList text="No payment submissions yet." />;
  return (
    <div className="divide-y divide-border/60">
      {payments.map((payment) => (
        <div
          key={payment.payment_id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{payment.display_name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {payment.course_name} · {formatDate(payment.created_at)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-bold text-gold">{formatTZS(payment.amount)}</p>
            <StatusBadge value={payment.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
function ApplicationList({ applications }: { applications: Application[] }) {
  if (!applications.length) return <EmptyList text="No mentorship applications yet." />;
  return (
    <div className="divide-y divide-border/60">
      {applications.map((application) => (
        <div
          key={application.application_id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{application.display_name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {application.package_name} · {formatDate(application.created_at)}
            </p>
          </div>
          <StatusBadge value={application.status} />
        </div>
      ))}
    </div>
  );
}
function PurchaseList({ purchases }: { purchases: Purchase[] }) {
  if (!purchases.length) return <EmptyList text="No course purchases yet." />;
  return (
    <div className="divide-y divide-border/60">
      {purchases.map((purchase) => (
        <div
          key={purchase.purchase_id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{purchase.display_name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {purchase.course_name} · {formatDate(purchase.created_at)}
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-gold">{formatTZS(purchase.amount)}</span>
        </div>
      ))}
    </div>
  );
}
function QuickAction({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: "/admin/payments" | "/admin/mentorship-applications" | "/admin/lessons" | "/admin/students";
  icon: typeof UsersRound;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-border/70 p-4 transition hover:-translate-y-0.5 hover:border-gold/40 hover:bg-gold/5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-gold" />
    </Link>
  );
}
function StatusBadge({ value }: { value: string }) {
  const classes =
    value === "approved"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : value === "rejected"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : value === "waitlisted"
          ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300"
          : "border-gold/40 bg-gold/10 text-gold";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${classes}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
function EmptyList({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
function PageLoader() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
    </div>
  );
}
function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-16">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-4 h-10 w-80 max-w-full rounded bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-40 rounded-3xl bg-muted" />
        ))}
      </div>
      <div className="mt-8 h-96 rounded-3xl bg-muted" />
    </main>
  );
}
function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
}
