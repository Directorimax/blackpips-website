import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ALC_PROGRAMS } from "@/lib/alc-access";
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
  const [year, setYear] = useState("");
  const [program, setProgram] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await callRpc<Row[]>("admin_list_alc_access_requests", {
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
    if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} this ALC Access request?`))
      return;

    setBusy(row.id);
    const { error } = await callRpc("admin_review_alc_access_request", {
      p_request_id: row.id,
      p_status: status,
      p_admin_notes: (notes[row.id] ?? row.admin_notes) || null,
    });
    setBusy(null);

    if (error) toast.error(error.message);
    else {
      toast.success(`Request ${status}.`);
      window.dispatchEvent(new Event("alc-access-reviewed"));
      void load();
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
              <div>
                <h2 className="font-display text-xl font-bold">{row.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {row.email} · {row.phone} · {row.study_year}
                </p>
                <p className="mt-2 text-sm">
                  {row.program}
                  {row.other_program ? `: ${row.other_program}` : ""}
                </p>
                {row.additional_details && (
                  <p className="mt-2 text-sm text-muted-foreground">{row.additional_details}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Account: {row.user_id} · {new Date(row.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="rounded-full border border-gold/30 px-3 py-1 text-xs font-bold uppercase text-gold">
                {row.status}
              </span>
            </div>

            {row.status === "pending" && (
              <label className="mt-4 block text-sm font-semibold">
                Internal admin notes
                <textarea
                  maxLength={1000}
                  value={notes[row.id] ?? row.admin_notes ?? ""}
                  onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                  className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-2 font-normal"
                />
              </label>
            )}

            {row.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button
                  disabled={busy === row.id}
                  onClick={() => void review(row, "approved")}
                  className="rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Approve
                </button>
                <button
                  disabled={busy === row.id}
                  onClick={() => void review(row, "rejected")}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
