import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  UploadCloud,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  X,
  FileImage,
} from "lucide-react";
import { toast } from "sonner";
import { COURSES, formatTZS } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuth";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/payment/$slug")({
  head: () =>
    createSeoHead({
      title: "Checkout",
      description: "Complete your BLACKPIPS course payment.",
      path: "/payment",
      noindex: true,
    }),
  loader: ({ params }) => {
    const course = COURSES.find((c) => c.slug === params.slug);
    if (!course) throw notFound();
    return { course };
  },
  component: () => (
    <AuthenticatedRouteGuard>
      <Checkout />
    </AuthenticatedRouteGuard>
  ),
});

type MethodKey = "mpesa" | "airtel" | "tigo";
const METHODS: {
  key: MethodKey;
  name: string;
  short: string;
  business: string;
  phone: string;
  color: string;
  icon: typeof Smartphone;
  instructions: string[];
}[] = [
  {
    key: "mpesa",
    name: "Vodacom M-Pesa",
    short: "M-Pesa",
    business: "Emmanuel Alphonce",
    phone: "+255 742 374 681",
    color: "from-red-500/20 to-red-600/10",
    icon: Smartphone,
    instructions: [
      "Dial *150*00# on your Vodacom line",
      "Choose 1. Send Money",
      "Enter number: +255 742 374 681",
      "Enter the exact amount shown above",
      "Confirm with your M-Pesa PIN",
      "Copy the Transaction ID from the SMS",
      "Upload the payment receipt",
    ],
  },
  {
    key: "airtel",
    name: "Airtel Money",
    short: "Airtel",
    business: "Emmanuel Alphonce",
    phone: "+255 693 413 655",
    color: "from-rose-500/20 to-red-500/10",
    icon: Smartphone,
    instructions: [
      "Dial *150*60# on your Airtel line",
      "Choose 1. Send Money",
      "Enter number: +255 693 413 655",
      "Enter the exact amount shown above",
      "Confirm with your Airtel Money PIN",
      "Copy the Transaction ID from the SMS",
      "Upload the payment receipt",
    ],
  },
  {
    key: "tigo",
    name: "Tigo / Yas",
    short: "Tigo / Yas",
    business: "Emmanuel Alphonce",
    phone: "+255 657 603 655",
    color: "from-sky-500/20 to-blue-500/10",
    icon: Smartphone,
    instructions: [
      "Dial *150*01# on your Tigo/Yas line",
      "Choose 1. Send Money",
      "Enter number: +255 657 603 655",
      "Enter the exact amount shown above",
      "Confirm with your Tigo/Yas PIN",
      "Copy the Transaction ID from the SMS",
      "Upload the payment receipt",
    ],
  },
];

function Checkout() {
  const { course } = Route.useLoaderData();
  const { loading: authLoading } = useAuth();
  const [method, setMethod] = useState<MethodKey>("mpesa");
  const [txId, setTxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPayment, setSubmittedPayment] = useState<null | {
    id: string;
    status: string;
    created_at: string | null;
  }>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedProofPath, setUploadedProofPath] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMethod = METHODS.find((m) => m.key === method)!;

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  };
  const onFiles = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      return toast.error("Please upload a JPEG, PNG, or WEBP image");
    }
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setFile(f);
  }, []);

  const submit = async () => {
    if (submitting) return;
    setSubmitError(null);
    if (authLoading) {
      const message = "Checking your session. Please wait a moment and try again.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    if (!activeMethod) {
      const message = "Please select a payment method.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    const transactionId = txId.trim();
    if (!transactionId) {
      const message = "Transaction ID is required.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    if (!file) {
      const message = "Please upload your payment screenshot.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      const message = "Please upload a JPEG, PNG, or WEBP payment proof.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authenticatedUser = authData.user;
      if (!authenticatedUser) throw new Error("Please sign in to submit your payment proof.");

      const { data: databaseCourse, error: courseError } = await supabase
        .from("courses")
        .select("id, title, slug, price")
        .eq("slug", course.slug)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!databaseCourse) throw new Error("This course is no longer available for payment.");

      const ext = file.name.split(".").pop() || "png";
      const path = `${authenticatedUser.id}/${databaseCourse.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      uploadedPath = path;
      setUploadedProofPath(path);

      const { data, error } = await supabase
        .from("payments")
        .insert({
          user_id: authenticatedUser.id,
          course_id: databaseCourse.id,
          amount: databaseCourse.price,
          currency: "TZS",
          payment_method: activeMethod.name,
          provider: activeMethod.short,
          transaction_id: transactionId,
          provider_reference: transactionId,
          proof_url: path,
          status: "pending",
          paid_at: new Date().toISOString(),
        })
        .select("id, status, created_at")
        .single();
      if (error) throw error;
      setSubmittedPayment(data);
    } catch (error) {
      if (uploadedPath) {
        const { error: rollbackError } = await supabase.storage
          .from("payment-proofs")
          .remove([uploadedPath]);
        if (rollbackError)
          console.error("Could not roll back uploaded payment proof:", rollbackError);
        setUploadedProofPath(null);
      }
      console.error("Payment submission failed:", error);
      const message = getSubmissionErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedPayment) return <SuccessState course={course} success={submittedPayment} />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass relative mt-4 overflow-hidden rounded-3xl border border-gold/20 p-6 sm:p-8"
      >
        <div className="absolute inset-0 bg-hero-glow opacity-40" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-gold">
              Complete payment
            </div>
            <h1 className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lifetime access · Instant unlock after verification
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">Amount due</div>
            <div className="text-gradient-gold font-display text-3xl font-black sm:text-4xl">
              {formatTZS(course.price)}
            </div>
          </div>
        </div>
      </motion.header>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Choose a payment method</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = m.key === method;
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-gold/60 bg-gold/5 shadow-glow"
                    : "border-border bg-card hover:border-gold/30 hover:-translate-y-0.5",
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", m.color)} />
                <div className="relative flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                      active
                        ? "bg-gradient-gold text-primary-foreground"
                        : "bg-background/60 text-gold",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{m.short}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.name}</div>
                  </div>
                  {active && (
                    <motion.div layoutId="method-check" className="ml-auto shrink-0 text-gold">
                      <CheckCircle2 className="h-5 w-5" />
                    </motion.div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMethod.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="glass rounded-3xl border border-border p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 text-gold">
              <activeMethod.icon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                {activeMethod.name} details
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DetailField
                label="Business name"
                value={activeMethod.business}
                onCopy={copy}
                copied={copied}
              />
              <DetailField
                label="Phone number"
                value={activeMethod.phone}
                onCopy={copy}
                copied={copied}
              />
              <DetailField
                label="Amount"
                value={formatTZS(course.price)}
                onCopy={copy}
                copied={copied}
                highlight
              />
            </div>
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Instructions
              </div>
              <ol className="mt-3 space-y-2 text-sm">
                {activeMethod.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/10 text-[11px] font-bold text-gold">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <label
            htmlFor="txid"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Transaction ID <span className="text-gold">*</span>
          </label>
          <input
            id="txid"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            placeholder="e.g. CJ1A2B3C4D"
            className="mt-3 w-full rounded-xl border border-border bg-background/60 px-4 py-3 font-mono text-sm outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Paste the reference code from the SMS confirmation you received.
          </p>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-6 text-center transition",
            dragOver
              ? "border-gold bg-gold/5"
              : file
                ? "border-gold/50 bg-gold/[0.03]"
                : "border-border bg-card hover:border-gold/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          {file ? (
            <div className="flex items-center gap-3 text-left">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-gold text-primary-foreground">
                <FileImage className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · Ready to submit
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold transition group-hover:scale-110">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="mt-3 text-sm font-semibold">Drop your screenshot here</div>
              <div className="mt-1 text-xs text-muted-foreground">
                or click to browse · PNG/JPG up to 5MB
              </div>
            </>
          )}
        </div>
      </section>

      <div className="mt-8 flex flex-col items-center gap-3">
        <motion.button
          whileHover={{ scale: submitting || authLoading ? 1 : 1.02 }}
          whileTap={{ scale: submitting || authLoading ? 1 : 0.98 }}
          onClick={submit}
          disabled={submitting || authLoading}
          className="shine relative inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-gold px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-glow transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Submitting…
            </>
          ) : (
            <>Submit Payment · {formatTZS(course.price)}</>
          )}
        </motion.button>
        <p className="text-xs text-muted-foreground">
          Your submission is encrypted and reviewed manually before access is granted.
        </p>
        {submitError && (
          <p role="alert" className="text-xs text-destructive">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}

function getSubmissionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/auth session missing|session.*expired|jwt.*expired/i.test(message)) {
    return "Your session has expired. Please sign in again.";
  }
  if (/row-level security|policy/i.test(message)) {
    return "We could not save your payment because your account does not have permission. Please contact support.";
  }
  if (/bucket|storage|object/i.test(message)) {
    return "We could not upload your payment proof. Please try again.";
  }
  if (/network|fetch/i.test(message)) {
    return "Network error. Please check your connection and try again.";
  }
  return message || "We could not submit your payment. Please try again.";
}

function SuccessState({
  course,
  success,
}: {
  course: (typeof COURSES)[number];
  success: { id: string };
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="glass relative overflow-hidden rounded-3xl border border-gold/30 p-10 text-center shadow-elegant"
      >
        <div className="absolute inset-0 bg-hero-glow opacity-60" />
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-gold shadow-glow"
          >
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">Payment submitted</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            We've received your payment for{" "}
            <span className="font-semibold text-foreground">{course.title}</span>. Your submission
            is now marked{" "}
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
              Pending Verification
            </span>
            .
          </p>
          <div className="mt-6 rounded-2xl border border-border bg-background/40 p-5 text-left text-sm">
            <div className="flex items-center gap-2 text-gold">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-semibold">What happens next</span>
            </div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                • Our team verifies your transaction (typically under 30 minutes during business
                hours).
              </li>
              <li>• Course access is unlocked automatically in your dashboard once approved.</li>
              <li>• You'll receive an email confirmation at approval.</li>
            </ul>
            <div className="mt-4 text-xs text-muted-foreground">
              Reference:{" "}
              <span className="font-mono text-foreground">
                {success.id.replaceAll("-", "").slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Go to dashboard
            </Link>
            <Link
              to="/courses"
              className="glass rounded-full px-6 py-2.5 text-sm font-semibold transition hover:border-gold/50"
            >
              Browse more courses
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DetailField({
  label,
  value,
  onCopy,
  copied,
  highlight,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
  copied: string | null;
  highlight?: boolean;
}) {
  const isCopied = copied === label;
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "border-gold/40 bg-gold/5" : "border-border bg-background/40",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div
          className={cn(
            "truncate font-mono text-sm font-semibold",
            highlight && "text-gradient-gold font-display text-lg",
          )}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => onCopy(label, value)}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-background hover:text-gold"
          aria-label={`Copy ${label}`}
        >
          {isCopied ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
