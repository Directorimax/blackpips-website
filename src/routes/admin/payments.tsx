import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FileSearch, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatTZS } from "@/lib/site-data";
import { useAdmin } from "@/hooks/useAdmin";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { sendNotification } from "@/services/email/notification.functions";
import { getAdminPaymentProof } from "@/services/payments/payment-proof.functions";
import type { PaymentProofKind } from "@/lib/payment-proof";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const paymentStatusConfig = {
  pending: {
    label: "Pending verification",
    className: "border-gold/40 bg-gold/10 text-gold",
  },
  approved: {
    label: "Approved",
    className: "border-bull/40 bg-bull/10 text-bull",
  },
  rejected: {
    label: "Rejected",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
} as const;

function PaymentStatusBadge({ status }: { status: string }) {
  const config = paymentStatusConfig[status as keyof typeof paymentStatusConfig] ?? {
    label: status.replaceAll("_", " "),
    className: "border-border bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}

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
  const [proofPreview, setProofPreview] = useState<{
    payment: Payment;
    loading: boolean;
    url: string | null;
    kind: PaymentProofKind | null;
    error: string | null;
  } | null>(null);

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
    setProofPreview({ payment, loading: true, url: null, kind: null, error: null });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your admin session has expired.");
      const proof = await getAdminPaymentProof({
        data: { paymentId: payment.id },
        headers: { Authorization: `Bearer ${token}` },
      });
      setProofPreview((current) =>
        current?.payment.id === payment.id
          ? { ...current, loading: false, url: proof.signedUrl, kind: proof.kind, error: null }
          : current,
      );
    } catch (error) {
      console.error("Could not create proof URL:", error);
      setProofPreview((current) =>
        current?.payment.id === payment.id
          ? {
              ...current,
              loading: false,
              error: error instanceof Error ? error.message : "Could not load the payment proof.",
            }
          : current,
      );
    }
  };

  const approve = async () => {
    if (!selected) return;
    setProcessing(selected.id);
    const { error } = await supabase.rpc("approve_payment", { p_payment_id: selected.id });
    if (error) {
      console.error("Could not approve payment:", error);
      toast.error("We could not approve this payment. Please try again.");
    } else {
      await Promise.all([
        sendNotification({ data: { type: "payment_approved", resourceId: selected.id } }),
        sendNotification({ data: { type: "course_unlocked", resourceId: selected.id } }),
      ]).catch(() => console.error("Payment notifications could not be queued."));
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
      toast.error("We could not reject this payment. Please try again.");
    } else {
      void sendNotification({ data: { type: "payment_rejected", resourceId: rejecting.id } }).catch(
        () => console.error("Payment rejection notification could not be queued."),
      );
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
            <article key={payment.id} className="glass rounded-3xl p-4 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 sm:items-center">
                    <h2 className="min-w-0 break-words font-display text-lg font-semibold">
                      {payment.course_title}
                    </h2>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <div className="mt-4 grid gap-x-8 gap-y-3 text-sm text-muted-foreground min-[440px]:grid-cols-2">
                    <p className="min-w-0 break-words">
                      <span className="text-foreground">Learner:</span>{" "}
                      {payment.display_name || payment.user_email || payment.user_id}
                    </p>
                    <p className="min-w-0 break-words">
                      <span className="text-foreground">Amount:</span> {formatTZS(payment.amount)}{" "}
                      {payment.currency}
                    </p>
                    <p className="min-w-0 break-words">
                      <span className="text-foreground">Method:</span>{" "}
                      {payment.payment_method || "—"} · {payment.provider || "—"}
                    </p>
                    <p className="min-w-0 break-all">
                      <span className="text-foreground">Transaction:</span>{" "}
                      {payment.transaction_id || "—"}
                    </p>
                    <p className="min-w-0 break-words min-[440px]:col-span-2">
                      <span className="text-foreground">Reference:</span>{" "}
                      {payment.id.replaceAll("-", "").slice(0, 8).toUpperCase()} ·{" "}
                      {payment.created_at ? new Date(payment.created_at).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:w-auto lg:min-w-[18rem]">
                  <button
                    onClick={() => void viewProof(payment)}
                    className="glass inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold hover:text-gold"
                  >
                    <FileSearch className="h-3.5 w-3.5" /> View proof
                  </button>
                  {payment.status === "pending" && (
                    <>
                      <button
                        disabled={processing === payment.id}
                        onClick={() => setSelected(payment)}
                        className="min-h-11 rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processing === payment.id}
                        onClick={() => setRejecting(payment)}
                        className="min-h-11 rounded-full border border-destructive/50 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
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
      <PaymentProofDialog preview={proofPreview} onClose={() => setProofPreview(null)} />
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

function PaymentProofDialog({
  preview,
  onClose,
}: {
  preview: {
    payment: Payment;
    loading: boolean;
    url: string | null;
    kind: PaymentProofKind | null;
    error: string | null;
  } | null;
  onClose: () => void;
}) {
  const payment = preview?.payment;
  return (
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-4 py-4 pr-14 text-left sm:px-6">
          <DialogTitle>Payment proof</DialogTitle>
          <DialogDescription className="break-words">
            {payment
              ? `${payment.display_name || payment.user_email || payment.user_id} · ${payment.course_title} · ${formatTZS(payment.amount)} ${payment.currency}`
              : "Secure payment-proof preview"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/30 p-3 sm:p-5">
          {preview?.loading ? (
            <div
              className="flex min-h-[50dvh] items-center justify-center gap-3 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="h-6 w-6 animate-spin text-gold" /> Loading private proof…
            </div>
          ) : preview?.error ? (
            <div
              className="mx-auto flex min-h-[40dvh] max-w-lg items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive"
              role="alert"
            >
              {preview.error}
            </div>
          ) : preview?.url && preview.kind === "pdf" ? (
            <iframe
              src={preview.url}
              title="Payment proof PDF"
              referrerPolicy="no-referrer"
              className="h-[70dvh] min-h-[28rem] w-full rounded-xl border border-border bg-background"
            />
          ) : preview?.url ? (
            <div className="flex min-h-[50dvh] w-full items-center justify-center overflow-auto rounded-xl bg-background/60">
              <img
                src={preview.url}
                alt={`Payment proof from ${payment?.display_name || payment?.user_email || "learner"}`}
                referrerPolicy="no-referrer"
                className="max-h-[72dvh] max-w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
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
