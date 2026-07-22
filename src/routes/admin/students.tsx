import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/students")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminStudents />
    </AuthenticatedRouteGuard>
  ),
});

const PAGE_SIZE = 20;
type LearningState = "all" | "not_started" | "in_progress" | "completed";
type Student = {
  student_id: string;
  display_name: string | null;
  email: string | null;
  joined_at: string | null;
  courses_purchased: number;
  active_course_entitlements: number;
  completed_lessons: number;
  total_published_lessons: number;
  last_learning_activity: string | null;
  mentorship_status: string | null;
  total_count: number;
};
type CourseOption = { id: string; title: string };

function AdminStudents() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [mentorshipStatus, setMentorshipStatus] = useState("all");
  const [learningState, setLearningState] = useState<LearningState>("all");
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("admin_list_students", {
      p_search: search.trim() || null,
      p_course_id: courseId || null,
      p_mentorship_status: mentorshipStatus,
      p_learning_state: learningState,
      p_page: page,
      p_page_size: PAGE_SIZE,
    });
    if (rpcError) {
      console.error("Could not load students", rpcError);
      setStudents([]);
      setError(
        import.meta.env.DEV
          ? `Development: ${rpcError.code ?? "RPC error"} — ${rpcError.message}`
          : "We could not load students right now.",
      );
    } else {
      setStudents(data ?? []);
    }
    setLoading(false);
  }, [courseId, learningState, mentorshipStatus, page, search]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    supabase
      .from("courses")
      .select("id,title")
      .order("title")
      .then(({ data, error: coursesError }) => {
        if (!active) return;
        if (coursesError) console.error("Could not load course filters", coursesError);
        setCourses(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const timeoutId = window.setTimeout(() => void loadStudents(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [isAdmin, loadStudents]);

  function updateFilter(callback: () => void) {
    setPage(1);
    callback();
  }

  if (adminLoading || !isAdmin) return <AdminLoading />;

  const totalCount = students[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
            <ShieldCheck className="h-4 w-4" /> Administration
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Students</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review learner access, progress, mentorship activity, and recent learning.
          </p>
        </div>
        <div className="glass inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold md:self-auto">
          <UsersRound className="h-4 w-4 text-gold" /> {totalCount} learners
        </div>
      </header>

      <section
        className="glass mt-8 grid gap-3 rounded-3xl p-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Student filters"
      >
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => updateFilter(() => setSearch(event.target.value))}
            placeholder="Search name or email"
            className="admin-input admin-search-input w-full"
          />
        </label>
        <label>
          <span className="sr-only">Filter by purchased course</span>
          <select
            value={courseId}
            onChange={(event) => updateFilter(() => setCourseId(event.target.value))}
            className="admin-input w-full"
          >
            <option value="">All purchased courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by mentorship status</span>
          <select
            value={mentorshipStatus}
            onChange={(event) => updateFilter(() => setMentorshipStatus(event.target.value))}
            className="admin-input w-full"
          >
            <option value="all">All mentorship statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by learning state</span>
          <select
            value={learningState}
            onChange={(event) =>
              updateFilter(() => setLearningState(event.target.value as LearningState))
            }
            className="admin-input w-full"
          >
            <option value="all">All learning states</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </section>

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <StateCard
          title="Unable to load students"
          body={error}
          action={() => void loadStudents()}
          actionLabel="Try again"
        />
      ) : students.length === 0 ? (
        <StateCard title="No matching learners" body="Try changing the search or filters." />
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-border md:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-4 py-4">Joined</th>
                  <th className="px-4 py-4">Access</th>
                  <th className="px-4 py-4">Progress</th>
                  <th className="px-4 py-4">Last activity</th>
                  <th className="px-4 py-4">Mentorship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <StudentTableRow key={student.student_id} student={student} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-3 md:hidden">
            {students.map((student) => (
              <StudentMobileCard key={student.student_id} student={student} />
            ))}
          </div>
        </>
      )}

      {!loading && !error && totalCount > 0 && (
        <nav
          className="mt-6 flex items-center justify-between gap-4"
          aria-label="Student pagination"
        >
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="admin-icon w-auto gap-1 px-3 text-xs font-semibold"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="admin-icon w-auto gap-1 px-3 text-xs font-semibold"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function StudentTableRow({ student }: { student: Student }) {
  const percentage = progressPercentage(student);
  return (
    <tr className="transition hover:bg-secondary/30">
      <td className="px-5 py-4">
        <Link
          to="/admin/students/$studentId"
          params={{ studentId: student.student_id }}
          className="block min-w-48 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <p className="font-display font-semibold">{student.display_name || "Unnamed learner"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {student.email || "No email available"}
          </p>
        </Link>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{formatDate(student.joined_at)}</td>
      <td className="px-4 py-4">
        <p className="font-semibold">{student.courses_purchased} courses</p>
        <p className="text-xs text-muted-foreground">{student.active_course_entitlements} active</p>
      </td>
      <td className="px-4 py-4">
        <ProgressCell student={student} percentage={percentage} />
      </td>
      <td className="px-4 py-4 text-muted-foreground">
        {formatDate(student.last_learning_activity)}
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={student.mentorship_status} empty="None" />
      </td>
    </tr>
  );
}

function StudentMobileCard({ student }: { student: Student }) {
  const percentage = progressPercentage(student);
  return (
    <Link
      to="/admin/students/$studentId"
      params={{ studentId: student.student_id }}
      className="glass rounded-2xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-semibold">
            {student.display_name || "Unnamed learner"}
          </h2>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {student.email || "No email available"}
          </p>
        </div>
        <StatusBadge value={student.mentorship_status} empty="" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <p>
          <span className="block text-xs text-muted-foreground">Courses</span>
          {student.courses_purchased}
        </p>
        <p>
          <span className="block text-xs text-muted-foreground">Last activity</span>
          {formatDate(student.last_learning_activity)}
        </p>
      </div>
      <div className="mt-4">
        <ProgressCell student={student} percentage={percentage} />
      </div>
    </Link>
  );
}

function ProgressCell({ student, percentage }: { student: Student; percentage: number }) {
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs">
        <span>
          {student.completed_lessons} / {student.total_published_lessons} lessons
        </span>
        <span className="font-semibold text-gold">{percentage}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-gradient-gold" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{learningLabel(student)}</p>
    </div>
  );
}

function StatusBadge({ value, empty }: { value: string | null; empty: string }) {
  if (!value) return empty ? <span className="text-xs text-muted-foreground">{empty}</span> : null;
  const classes =
    value === "approved"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : value === "rejected"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : value === "waitlisted"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : "border-gold/30 bg-gold/10 text-gold";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classes}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function StateCard({
  title,
  body,
  action,
  actionLabel,
}: {
  title: string;
  body: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="glass mt-6 rounded-3xl p-10 text-center">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {action && (
        <button
          onClick={action}
          className="mt-5 rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="flex min-h-52 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
    </div>
  );
}

function progressPercentage(student: Student) {
  return student.total_published_lessons
    ? Math.round((student.completed_lessons / student.total_published_lessons) * 100)
    : 0;
}
function learningLabel(student: Student) {
  if (
    student.total_published_lessons > 0 &&
    student.completed_lessons >= student.total_published_lessons
  )
    return "Completed";
  if (student.last_learning_activity) return "In progress";
  return "Not started";
}
function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}
