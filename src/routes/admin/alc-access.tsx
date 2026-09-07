import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ALC_PROGRAMS } from "@/lib/alc-access";
import {
  ALC_TRACKS,
  alcTrackLabel,
  buildAlcReviewArgs,
  isAlcTrack,
  type AlcTrack,
} from "@/lib/alc-tracks";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { sendNotification } from "@/services/email/notification.functions";

export const Route = createFileRoute("/admin/alc-access")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminAlcAccess />
    </AuthenticatedRouteGuard>
  ),
});

type Row = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  study_year: number;
  program: string;
  other_program: string | null;
  additional_details: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  public_review_message?: string | null;
  reviewed_at: string | null;
  assigned_track: AlcTrack | null;
  legacy_unsegmented_access: boolean;
  created_at: string;
};

// Helper function iliyo salama bila kucrash
async function callRpc<T>(name: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name as never, args as never);
  return { data: data as T, error };
}

function AdminAlcAccess() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [publicMessages, setPublicMessages] = useState<Record<string, string>>({});
  const [assignedTracks, setAssignedTracks] = useState<Record<string, AlcTrack | "">>({});
  const [year, setYear] = useState("");
  const [program, setProgram] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await callRpc<Row[]>("admin_list_alc_access_requests_v2", {
      p_status: filter,
      p_search: search.trim(),
      p_year: year ? Number(year) : null,
      p_program: program || null,
    });
    if (error) {
      console.error("[admin-alc-access] load failed", error);
      toast.error(error.message);
    } else {
      setRows(data || []);
    }
  }, [filter, search, year, program]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const review = async (row: Row, status: "approved" | "rejected") => {
    const assignedTrack = status === "approved" ? assignedTracks[row.id] || null : null;
    if (status === "approved" && !isAlcTrack(assignedTrack)) {
      toast.error("Choose the ALC track that this learner is authorized to access.");
      return;
    }
    if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} this ALC Access request?`))
      return;

    setBusy(row.id);
    const { error } = await callRpc(
      "admin_review_alc_access_request_v2",
      buildAlcReviewArgs({
        requestId: row.id,
        status,
        assignedTrack,
        adminNotes: (notes[row.id] ?? row.admin_notes) || null,
        publicReviewMessage: (publicMessages[row.id] ?? row.public_review_message)?.trim() || null,
      }),
    );
    setBusy(null);

    if (error) toast.error(error.message);
    else {
      await load();
      toast.success(`Request ${status}.`);
      window.dispatchEvent(new Event("alc-access-reviewed"));
      void sendNotification({
        data: { type: `alc_access_${status}`, resourceId: row.id },
      }).catch((notificationError) => {
        console.error("[admin-alc-access] Review email could not be sent", notificationError);
        toast.warning("The request was updated, but the email could not be sent.");
      });
    }
  };

  if (adminLoading || !isAdmin) return null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-xs font-semibold uppercase tracking-widest text-gold">
        Administration
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold">ALC Access Requests</h1>

      <label className="mt-5 block text-sm font-semibold">
        Search requests
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email, phone, or reference"
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-gradient-gold text-primary-foreground" : "glass"}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Study year
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold">
          Program
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="">All programs</option>
            {ALC_PROGRAMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {!rows.length && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No requests match these filters.
          </div>
        )}

        {rows.map((row) => (
          <article key={row.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold">{row.full_name}</h2>
                <div className="mt-3 rounded-xl border border-border/70 bg-background/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Applicant said
                  </p>
                  <dl className="mt-2 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                    <Detail label="Email" value={row.email} />
                    <Detail label="Phone / WhatsApp" value={row.phone} />
                    <Detail label="Year studied" value={String(row.study_year)} />
                    <Detail
                      label="Program"
                      value={`${row.program}${row.other_program ? `: ${row.other_program}` : ""}`}
                    />
                    <Detail
                      label="Additional verification"
                      value={row.additional_details || "Not provided"}
                    />
                  </dl>
                </div>
                <div className="mt-3 rounded-xl border border-gold/25 bg-gold/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gold">
                    Access assigned by Admin
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {row.legacy_unsegmented_access && !row.assigned_track
                      ? "Legacy unsegmented access"
                      : alcTrackLabel(row.assigned_track)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Account: {row.user_id} · {new Date(row.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="rounded-full border border-gold/30 px-3 py-1 text-xs font-bold uppercase text-gold">
                {row.status}
              </span>
              {row.legacy_unsegmented_access && !row.assigned_track && (
                <span className="rounded-full border border-amber-500/40 px-3 py-1 text-xs font-bold uppercase text-amber-600 dark:text-amber-300">
                  Legacy access
                </span>
              )}
            </div>

            {(row.status === "pending" ||
              (row.status === "approved" && row.legacy_unsegmented_access)) && (
              <div className="mt-4 grid gap-4">
                <label className="block text-sm font-semibold">
                  ALC track assigned by Admin
                  <select
                    value={assignedTracks[row.id] ?? row.assigned_track ?? ""}
                    onChange={(e) =>
                      setAssignedTracks({
                        ...assignedTracks,
                        [row.id]: isAlcTrack(e.target.value) ? e.target.value : "",
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <option value="">Select authorized track</option>
                    {ALC_TRACKS.map((track) => (
                      <option key={track} value={track}>
                        {alcTrackLabel(track)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Applicant program is evidence only. This selection controls authorization.
                  </span>
                </label>
                <label className="block text-sm font-semibold">
                  Internal admin notes
                  <textarea
                    maxLength={1000}
                    value={notes[row.id] ?? row.admin_notes ?? ""}
                    onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                    className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-2 font-normal"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Message visible to applicant
                  <textarea
                    maxLength={1000}
                    value={publicMessages[row.id] ?? row.public_review_message ?? ""}
                    onChange={(e) =>
                      setPublicMessages({ ...publicMessages, [row.id]: e.target.value })
                    }
                    className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-2 font-normal"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy === row.id || !isAlcTrack(assignedTracks[row.id])}
                    onClick={() => void review(row, "approved")}
                    className="rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {row.status === "approved" ? "Assign strict track" : "Approve"}
                  </button>
                  {row.status === "pending" && (
                    <button
                      disabled={busy === row.id}
                      onClick={() => void review(row, "rejected")}
                      className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
