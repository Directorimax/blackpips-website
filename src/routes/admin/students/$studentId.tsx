import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { formatTZS } from "@/lib/site-data";

export const Route = createFileRoute("/admin/students/$studentId")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminStudentDetail />
    </AuthenticatedRouteGuard>
  ),
});

type StudentDetail = {
  profile: {
    id: string;
    display_name: string | null;
    email: string | null;
    joined_at: string | null;
    last_active_at: string | null;
  };
  purchases: Array<{
    id: string;
    course_id: string;
    course_title: string;
    purchase_status: string;
    amount: number;
    currency: string;
    approval_date: string | null;
    transaction_id: string | null;
  }>;
  course_progress: Array<{
    course_id: string;
    course_title: string;
    completed_lessons: number;
    total_lessons: number;
    percentage: number;
    last_viewed_lesson: string | null;
    last_viewed_at: string | null;
    state: string;
  }>;
  mentorship: Array<{
    id: string;
    package_name: string;
    application_date: string;
    status: string;
    decision_date: string | null;
  }>;
};

function AdminStudentDetail() {
  const { studentId } = Route.useParams();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const { data, error: rpcError } = await supabase.rpc("admin_get_student_details", {
        p_student_id: studentId,
      });
      if (!active) return;
      if (rpcError || !data) {
        console.error("Could not load student details", rpcError);
        setError("We could not load this learner’s details.");
        setDetail(null);
      } else {
        setDetail(data as unknown as StudentDetail);
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [isAdmin, studentId]);

  if (adminLoading || !isAdmin || loading) return <Loading />;
  if (error || !detail)
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Student unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || "This student could not be found."}
        </p>
        <Link
          to="/admin/students"
          className="mt-6 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Back to students
        </Link>
      </div>
    );

  const { profile, purchases, course_progress: courseProgress, mentorship } = detail;
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Link
        to="/admin/students"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Students
      </Link>
      <header className="glass mt-6 rounded-3xl p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
          <ShieldCheck className="h-4 w-4" /> Learner profile
        </div>
        <h1 className="mt-3 break-words font-display text-3xl font-bold">
          {profile.display_name || "Unnamed learner"}
        </h1>
        <p className="mt-2 break-all text-sm text-muted-foreground">
          {profile.email || "No email available"}
        </p>
        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Joined" value={formatDate(profile.joined_at)} />
          <DetailItem label="Last active" value={formatDate(profile.last_active_at)} />
        </div>
      </header>

      <section className="mt-10">
        <SectionTitle icon={CreditCard} title="Purchases" />
        <div className="mt-4 grid gap-3">
          {purchases.length ? (
            purchases.map((purchase) => (
              <article key={purchase.id} className="glass rounded-2xl p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{purchase.course_title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Approved {formatDate(purchase.approval_date)}
                    </p>
                  </div>
                  <StatusBadge value={purchase.purchase_status} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>
                    <span className="text-foreground">Amount:</span>{" "}
                    {formatAmount(purchase.amount, purchase.currency)}
                  </p>
                  <p>
                    <span className="text-foreground">Transaction:</span>{" "}
                    {purchase.transaction_id || "—"}
                  </p>
                  <p>
                    <span className="text-foreground">Status:</span> {purchase.purchase_status}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <Empty body="No course purchases yet." />
          )}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle icon={BookOpen} title="Course progress" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {courseProgress.length ? (
            courseProgress.map((progress) => (
              <article key={progress.course_id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-display font-semibold">{progress.course_title}</h3>
                  <StatusBadge value={progress.state} />
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-gold"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {progress.completed_lessons} / {progress.total_lessons} published lessons
                  </span>
                  <span className="font-semibold text-gold">{progress.percentage}%</span>
                </div>
                <div className="mt-5 space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground">Last lesson:</span>{" "}
                    {progress.last_viewed_lesson || "Not started"}
                  </p>
                  <p>
                    <span className="text-foreground">Last viewed:</span>{" "}
                    {formatDate(progress.last_viewed_at)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <Empty body="No accessible course progress." />
          )}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle icon={ShieldCheck} title="Mentorship" />
        <div className="mt-4 grid gap-3">
          {mentorship.length ? (
            mentorship.map((application) => (
              <article key={application.id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-semibold">{application.package_name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Applied {formatDate(application.application_date)}
                    </p>
                  </div>
                  <StatusBadge value={application.status} />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Decision date: {formatDate(application.decision_date)}
                </p>
              </article>
            ))
          ) : (
            <Empty body="No mentorship applications." />
          )}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <h2 className="inline-flex items-center gap-2 font-display text-2xl font-bold">
      <Icon className="h-5 w-5 text-gold" /> {title}
    </h2>
  );
}
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block font-medium">{value}</span>
    </p>
  );
}
function Empty({ body }: { body: string }) {
  return <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">{body}</div>;
}
function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gold" />
    </div>
  );
}
function StatusBadge({ value }: { value: string }) {
  const classes =
    value === "approved" || value === "completed"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : value === "rejected"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : value === "waitlisted"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : value === "in_progress"
            ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
            : "border-gold/30 bg-gold/10 text-gold";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classes}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}
function formatAmount(amount: number, currency: string) {
  return currency === "TZS"
    ? formatTZS(amount)
    : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}
