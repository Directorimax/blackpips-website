import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatTZS } from "@/lib/site-data";
import { useAdmin } from "@/hooks/useAdmin";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { sendNotification } from "@/services/email/notification.functions";
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

export const Route = createFileRoute("/admin/payments")({
  component: () => (
    <AuthenticatedRouteGuard>
      <AdminPayments />
    </AuthenticatedRouteGuard>
  ),
});

type Filter = "pending" | "approved" | "rejected" | "all";
type Payment = {
  id: string;
  user_id: string;
  user_email: string | null;
  display_name: string | null;
  course_title: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  provider: string | null;
  transaction_id: string | null;
  proof_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string | null;
};

function AdminPayments() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("pending");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_payments", { p_status: filter });
    if (error) {
      console.error("Could not load payments:", error);
      toast.error("Could not load payment submissions.");
    } else setPayments(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [adminLoading, isAdmin, navigate]);
  useEffect(() => {
    if (isAdmin) void loadPayments();
  }, [isAdmin, loadPayments]);

  const viewProof = async (payment: Payment) => {
    if (!payment.proof_url) return toast.error("This payment has no uploaded proof.");
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(payment.proof_url, 600);
    if (error || !data.signedUrl) {
      console.error("Could not create proof URL:", error);
      return toast.error("Could not open the payment proof.");
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const approve = async () => {
    if (!selected) return;
    setProcessing(selected.id);
    const { error } = await supabase.rpc("approve_payment", { p_payment_id: selected.id });
    if (error) {
      console.error("Could not approve payment:", error);
      toast.error(error.message);
    } else {
      void Promise.all([
        sendNotification({ data: { type: "payment_approved", resourceId: selected.id } }),
        sendNotification({ data: { type: "course_unlocked", resourceId: selected.id } }),
      ]).catch((notificationError) =>
        console.error("Payment notifications could not be queued:", notificationError),
      );
      toast.success("Payment approved and course access granted.");
      setSelected(null);
      await loadPayments();
    }
    setProcessing(null);
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return toast.error("A rejection reason is required.");
    setProcessing(rejecting.id);
    const { error } = await supabase.rpc("reject_payment", {
      p_payment_id: rejecting.id,
      p_reason: reason.trim(),
    });
    if (error) {
      console.error("Could not reject payment:", error);
      toast.error(error.message);
    } else {
      toast.success("Payment rejected.");
      setRejecting(null);
      setReason("");
      await loadPayments();
    }
    setProcessing(null);
  };

  if (adminLoading || !isAdmin)
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
            <ShieldCheck className="h-4 w-4" /> Administration
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Payment verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review submitted payment proofs and grant course access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${filter === item ? "bg-gradient-gold text-primary-foreground shadow-glow" : "glass text-muted-foreground hover:text-foreground"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : payments.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
            No {filter === "all" ? "" : filter} payment submissions.
          </div>
        ) : (
          payments.map((payment) => (
            <article key={payment.id} className="glass rounded-3xl p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{payment.course_title}</h2>
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                      {payment.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>
                      <span className="text-foreground">Learner:</span>{" "}
                      {payment.display_name || payment.user_email || payment.user_id}
                    </p>
                    <p>
                      <span className="text-foreground">Amount:</span> {formatTZS(payment.amount)}{" "}
                      {payment.currency}
                    </p>
                    <p>
                      <span className="text-foreground">Method:</span>{" "}
                      {payment.payment_method || "—"} · {payment.provider || "—"}
                    </p>
                    <p>
                      <span className="text-foreground">Transaction:</span>{" "}
                      {payment.transaction_id || "—"}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-foreground">Reference:</span>{" "}
                      {payment.id.replaceAll("-", "").slice(0, 8).toUpperCase()} ·{" "}
                      {payment.created_at ? new Date(payment.created_at).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() => void viewProof(payment)}
                    className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold hover:text-gold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View proof
                  </button>
                  {payment.status === "pending" && (
                    <>
                      <button
                        disabled={processing === payment.id}
                        onClick={() => setSelected(payment)}
                        className="rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processing === payment.id}
                        onClick={() => setRejecting(payment)}
                        className="rounded-full border border-destructive/50 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      <ConfirmDialog
        payment={selected}
        processing={processing}
        onCancel={() => setSelected(null)}
        onConfirm={() => void approve()}
      />
      <RejectDialog
        payment={rejecting}
        reason={reason}
        processing={processing}
        onReason={setReason}
        onCancel={() => {
          setRejecting(null);
          setReason("");
        }}
        onConfirm={() => void reject()}
      />
    </div>
  );
}

function ConfirmDialog({
  payment,
  processing,
  onCancel,
  onConfirm,
}: {
  payment: Payment | null;
  processing: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={Boolean(payment)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve payment?</AlertDialogTitle>
          <AlertDialogDescription>
            {payment && (
              <>
                Grant <strong>{payment.course_title}</strong> to{" "}
                {payment.display_name || payment.user_email || payment.user_id} for{" "}
                {formatTZS(payment.amount)}. Transaction: {payment.transaction_id || "—"}.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={Boolean(processing)}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={Boolean(processing)} onClick={onConfirm}>
            {processing ? "Approving…" : "Approve payment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function RejectDialog({
  payment,
  reason,
  processing,
  onReason,
  onCancel,
  onConfirm,
}: {
  payment: Payment | null;
  reason: string;
  processing: string | null;
  onReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={Boolean(payment)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject payment?</AlertDialogTitle>
          <AlertDialogDescription>
            Provide a clear reason for rejecting this payment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          value={reason}
          onChange={(event) => onReason(event.target.value)}
          placeholder="Reason for rejection"
          className="min-h-24 rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-gold/40"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={Boolean(processing)}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={Boolean(processing) || !reason.trim()} onClick={onConfirm}>
            {processing ? "Rejecting…" : "Reject payment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
