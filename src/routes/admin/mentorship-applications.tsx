import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { sendNotification } from "@/services/email/notification.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/mentorship-applications")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminMentorshipApplications />
    </AuthenticatedRouteGuard>
  ),
});

type Status = "pending" | "approved" | "waitlisted" | "rejected";
type Application = {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  country: string;
  package_name: string;
  experience_level: string;
  trading_duration: string;
  biggest_challenge: string;
  learning_goal: string;
  preferred_schedule: string;
  notes: string | null;
  status: Status;
  internal_admin_notes: string | null;
  learner_message: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function AdminMentorshipApplications() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<{
    application: Application;
    status: Status;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [learnerMessages, setLearnerMessages] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase.rpc("admin_list_mentorship_applications");
    if (error) {
      console.error("Failed to load mentorship applications", error);
      setErrorMessage("Unable to load mentorship applications. Please try again.");
      toast.error("Could not load mentorship applications.");
    } else {
      const rows = (data ?? []).map((item) => ({ ...item, status: item.status as Status }));
      setApplications(rows);
      setNotes(Object.fromEntries(rows.map((item) => [item.id, item.internal_admin_notes ?? ""])));
      setLearnerMessages(
        Object.fromEntries(rows.map((item) => [item.id, item.learner_message ?? ""])),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function update(application: Application, status: Status) {
    if (saving) return;
    setSaving(application.id);
    const internalAdminNotes = notes[application.id]?.trim() || null;
    const learnerMessage = learnerMessages[application.id]?.trim() || null;
    const { data, error } = await supabase.rpc("review_mentorship_application", {
      p_application_id: application.id,
      p_status: status,
      p_internal_admin_notes: internalAdminNotes,
      p_learner_message: learnerMessage,
    });
    if (error) {
      console.error("Failed to review mentorship application", error);
      toast.error("Could not update application.");
    } else {
      if (status === "approved" || status === "rejected") {
        void sendNotification({
          data: {
            type: status === "approved" ? "mentorship_approved" : "mentorship_rejected",
            resourceId: application.id,
          },
        }).catch((notificationError) =>
          console.error("Mentorship notification could not be queued:", notificationError),
        );
      }
      toast.success(`Application marked ${label(status)}.`);
      const reviewedAt = data?.[0]?.reviewed_at ?? new Date().toISOString();
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status,
                internal_admin_notes: internalAdminNotes,
                learner_message: learnerMessage,
                reviewed_at: reviewedAt,
              }
            : item,
        ),
      );
    }
    setSaving(null);
  }

  const visible = applications.filter((item) => filter === "all" || item.status === filter);
  const counts = (status: Status) => applications.filter((item) => item.status === status).length;

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
        <ShieldCheck className="h-4 w-4" /> Administration
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold">Mentorship applications</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {(["pending", "approved", "waitlisted", "rejected"] as Status[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className="glass rounded-2xl p-4 text-left"
          >
            <div className="font-display text-2xl font-bold text-gold">{counts(status)}</div>
            <div className="text-xs text-muted-foreground">{label(status)}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className="glass rounded-full px-4 py-2 text-xs font-semibold"
        >
          All applications
        </button>
      </div>

      <div className="mt-8 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : errorMessage ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => void load()}
              className="mt-4 rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
            No applications match this filter.
          </div>
        ) : (
          visible.map((application) => {
            const isPending = application.status === "pending";
            const isSaving = saving === application.id;
            return (
              <article key={application.id} className="glass rounded-3xl border border-border/60">
                <header className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div>
                    <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                      Package: {application.package_name}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Submitted {formatDate(application.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusClass(application.status)}`}
                  >
                    {label(application.status)}
                  </span>
                </header>

                <div className="grid divide-y divide-border/60 border-y border-border/60 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                  <section className="p-5 sm:p-6">
                    <SectionTitle>Applicant details</SectionTitle>
                    <h2 className="mt-3 font-display text-xl font-semibold">
                      {application.full_name}
                    </h2>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <Detail label="Email" value={application.email} />
                      <Detail label="WhatsApp" value={application.whatsapp_number} />
                      <Detail label="Country" value={application.country} />
                    </div>
                  </section>
                  <section className="p-5 sm:p-6">
                    <SectionTitle>Application details</SectionTitle>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <Detail label="Experience" value={application.experience_level} />
                      <Detail label="Preferred schedule" value={application.preferred_schedule} />
                      <Detail label="Goal" value={application.learning_goal} wide />
                      <Detail label="Challenges" value={application.biggest_challenge} wide />
                      {application.notes && (
                        <Detail label="Additional notes" value={application.notes} wide />
                      )}
                    </div>
                  </section>
                </div>

                <section className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SectionTitle>Review</SectionTitle>
                    {application.reviewed_at && (
                      <p className="text-xs text-muted-foreground">
                        Reviewed {formatDate(application.reviewed_at)}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Internal admin notes
                      <textarea
                        value={notes[application.id] ?? ""}
                        onChange={(event) =>
                          setNotes({ ...notes, [application.id]: event.target.value })
                        }
                        className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Learner-facing message
                      <textarea
                        value={learnerMessages[application.id] ?? ""}
                        onChange={(event) =>
                          setLearnerMessages({
                            ...learnerMessages,
                            [application.id]: event.target.value,
                          })
                        }
                        className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground"
                      />
                    </label>
                  </div>
                </section>

                <footer className="flex flex-col gap-3 border-t border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <SectionTitle>Actions</SectionTitle>
                  {isPending ? (
                    <div className="grid gap-2 sm:flex">
                      <button
                        onClick={() => void update(application, "approved")}
                        disabled={isSaving}
                        className="rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                      >
                        {isSaving ? "Updating…" : "Approve"}
                      </button>
                      <button
                        onClick={() => void update(application, "waitlisted")}
                        disabled={isSaving}
                        className="rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold disabled:opacity-60"
                      >
                        Waiting List
                      </button>
                      <button
                        onClick={() => setStatusChange({ application, status: "rejected" })}
                        disabled={isSaving}
                        className="rounded-full border border-destructive/50 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={isSaving}
                          className="rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold disabled:opacity-60"
                        >
                          Change status
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        side="bottom"
                        sideOffset={8}
                        collisionPadding={12}
                        className="min-w-44 rounded-2xl border-border bg-card p-2 shadow-elegant"
                      >
                        {(["approved", "waitlisted", "rejected"] as Status[]).map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onSelect={() => setStatusChange({ application, status })}
                            className="rounded-xl px-3 py-2 text-xs font-semibold"
                          >
                            Mark {label(status)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </footer>
              </article>
            );
          })
        )}
      </div>

      <StatusChangeDialog
        change={statusChange}
        processing={saving}
        onCancel={() => setStatusChange(null)}
        onConfirm={() => {
          if (!statusChange) return;
          void update(statusChange.application, statusChange.status);
          setStatusChange(null);
        }}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <p className={wide ? "sm:col-span-2" : ""}>
      <span className="font-semibold text-foreground">{label}:</span>{" "}
      <span className="text-muted-foreground">{value}</span>
    </p>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function label(status: Status) {
  return status === "waitlisted"
    ? "Waiting List"
    : `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}

function statusClass(status: Status) {
  switch (status) {
    case "approved":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "waitlisted":
      return "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300";
    case "rejected":
      return "border-destructive/40 bg-destructive/15 text-destructive";
    default:
      return "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
}

function StatusChangeDialog({
  change,
  processing,
  onCancel,
  onConfirm,
}: {
  change: { application: Application; status: Status } | null;
  processing: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isChangingReviewedApplication = Boolean(change && change.application.status !== "pending");
  return (
    <AlertDialog open={Boolean(change)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {change?.status === "rejected"
              ? "Reject mentorship application?"
              : "Change application status?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {change &&
              (isChangingReviewedApplication
                ? `This application has already been reviewed. Change ${change.application.full_name}'s status to ${label(change.status)}?`
                : `Mark ${change.application.full_name}'s application for ${change.application.package_name} as ${label(change.status)}?`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={Boolean(processing)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={Boolean(processing)}
            onClick={onConfirm}
            className={
              change?.status === "rejected"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {processing ? "Updating…" : `Confirm ${change ? label(change.status) : "change"}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
