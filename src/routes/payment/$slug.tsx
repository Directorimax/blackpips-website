import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import {
  Smartphone,
  UploadCloud,
  Loader2,
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
import { sendNotification } from "@/services/email/notification.functions";
import { extensionForImageMime, validateImageFile } from "@/lib/upload-security";
import {
  getPaymentSubmissionErrorMessage,
  PaymentSubmissionError,
  submitPaymentRecord,
} from "@/lib/payment-submission";
import { PageFrame } from "@/components/bp/PageFrame";

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
    <PageFrame>
      <AuthenticatedRouteGuard>
        <Checkout />
      </AuthenticatedRouteGuard>
    </PageFrame>
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
  const [uploadedProof, setUploadedProof] = useState<null | {
    path: string;
    transactionId: string;
    method: MethodKey;
    file: File;
  }>(null);
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
    if (validateImageFile(f, { maxBytes: 5 * 1024 * 1024 }))
      return toast.error("Please upload a valid JPEG, PNG, or WEBP image under 5MB.");
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
    if (validateImageFile(file, { maxBytes: 5 * 1024 * 1024 })) {
      const message = "Please upload a JPEG, PNG, or WEBP payment proof.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
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

      const result = await submitPaymentRecord(
        {
          uploadProof: async () => {
            const ext = extensionForImageMime(file.type);
            const path = `${authenticatedUser.id}/${databaseCourse.id}/${crypto.randomUUID()}.${ext}`;
            const { error } = await supabase.storage
              .from("payment-proofs")
              .upload(path, file, { contentType: file.type, upsert: false });
            return error ? { data: null, error } : { data: { path }, error: null };
          },
          createPayment: async (proofPath) => {
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
                proof_url: proofPath,
                status: "pending",
                paid_at: new Date().toISOString(),
              })
              .select("id, status, created_at")
              .single();
            return error ? { data: null, error } : { data, error: null };
          },
          findPayment: async () => {
            const { data, error } = await supabase
              .from("payments")
              .select("id, status, created_at, proof_url")
              .eq("user_id", authenticatedUser.id)
              .eq("course_id", databaseCourse.id)
              .eq("transaction_id", transactionId)
              .maybeSingle();
            return error ? { data: null, error } : { data, error: null };
          },
          removeProof: async (proofPath) => {
            const { error } = await supabase.storage.from("payment-proofs").remove([proofPath]);
            if (error) console.error("Could not roll back uploaded payment proof.");
            return { error };
          },
        },
        uploadedProof?.transactionId === transactionId &&
          uploadedProof.method === method &&
          uploadedProof.file === file
          ? uploadedProof.path
          : null,
      );
      setUploadedProof({ path: result.proofPath, transactionId, method, file });
      setSubmittedPayment(result.payment);
      if (!result.recoveredExistingPayment) {
        try {
          await sendNotification({
            data: { type: "payment_submitted", resourceId: result.payment.id },
          });
        } catch {
          console.error("Payment review notification could not be queued.");
        }
      }
    } catch (error) {
      if (error instanceof PaymentSubmissionError && error.proofPathRetained) {
        if (error.proofPath) {
          setUploadedProof({ path: error.proofPath, transactionId, method, file });
        }
      } else {
        setUploadedProof(null);
      }
      console.error("Payment submission failed:", error);
      const message = getPaymentSubmissionErrorMessage(error);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedPayment) return <SuccessState course={course} success={submittedPayment} />;

  const busy = submitting || authLoading;

  return (
    <section className="course-page">
      <div className="wrap">
        <nav className="row small crumbs" aria-label="Breadcrumb">
          <Link to="/courses">Lessons</Link>
          <span aria-hidden="true">/</span>
          <Link to="/courses/$slug" params={{ slug: course.slug }}>
            {course.title}
          </Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: "var(--tx)" }}>Checkout</span>
        </nav>
        <div className="clayout">
          <div className="stack" style={{ gap: 24 }}>
            <div className="stack rise" style={{ gap: 14 }}>
              <span className="eyebrow" style={{ alignSelf: "flex-start" }}>
                <span className="tag">Checkout</span> Complete payment
              </span>
              <h1 className="h1" style={{ fontSize: "clamp(32px, 4.4vw, 52px)" }}>
                {course.title}
              </h1>
              <p className="lead">Lifetime access · Instant unlock after verification</p>
            </div>

            <div className="card spot rise d1" style={{ padding: "clamp(22px, 3vw, 28px)" }}>
              <h2 className="h3">Pay with mobile money</h2>
              <div
                className="stack"
                style={{ gap: 8, marginTop: 16 }}
                role="radiogroup"
                aria-label="Payment method"
              >
                {METHODS.map((m) => {
                  const active = m.key === method;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMethod(m.key)}
                      disabled={busy}
                      className={cn("method", active && "on")}
                    >
                      <span className="radio" />
                      <span>{m.short}</span>
                      <span className="small">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="card rise d2"
              style={{ padding: "clamp(22px, 3vw, 28px)" }}
              key={activeMethod.key}
            >
              <p className="micro">{activeMethod.name} details</p>
              <div className="stack" style={{ gap: 8, marginTop: 14 }}>
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
              <hr className="divider" style={{ margin: "22px 0" }} />
              <p className="micro" style={{ marginBottom: 14 }}>
                Instructions
              </p>
              <ol className="pay-steps">
                {activeMethod.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="buy rise d2">
            <div className="orbit">
              <div
                className="orbit-in"
                style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="pstep" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} className={i <= 1 ? "on" : ""} />
                  ))}
                </div>
                <div>
                  <p className="micro">Amount due</p>
                  <p
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      letterSpacing: "-.04em",
                      lineHeight: 1.1,
                      marginTop: 6,
                    }}
                  >
                    {formatTZS(course.price)}
                  </p>
                  <p className="small" style={{ marginTop: 6 }}>
                    Send with {activeMethod.short}, then confirm below.
                  </p>
                </div>
                <label className="field" htmlFor="txid">
                  <span className="label">
                    Transaction ID <span className="gold">*</span>
                  </span>
                  <input
                    id="txid"
                    className="input mono"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    disabled={busy}
                    placeholder="e.g. CJ1A2B3C4D"
                  />
                  <span className="small" style={{ fontSize: 12 }}>
                    Paste the reference code from the SMS confirmation you received.
                  </span>
                </label>
                <div className="field">
                  <span className="label">Payment receipt</span>
                  <div
                    role="button"
                    tabIndex={0}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        inputRef.current?.click();
                      }
                    }}
                    className={cn("dropzone", dragOver && "over", file && "has", busy && "off")}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => onFiles(e.target.files)}
                      disabled={busy}
                    />
                    {file ? (
                      <div className="file-row">
                        <span className="ico ico-solid">
                          <FileImage aria-hidden="true" />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="h4 truncate" style={{ display: "block" }}>
                            {file.name}
                          </span>
                          <span className="small" style={{ fontSize: 12 }}>
                            {(file.size / 1024).toFixed(0)} KB · Ready to submit
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="icon-btn"
                          aria-label="Remove file"
                        >
                          <X aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="ico">
                          <UploadCloud aria-hidden="true" />
                        </span>
                        <span className="h4">Drop your screenshot here</span>
                        <span className="small" style={{ fontSize: 12 }}>
                          or click to browse · PNG/JPG up to 5MB
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="btn btn-gold btn-lg btn-block"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> Submitting…
                    </>
                  ) : (
                    <>Submit Payment · {formatTZS(course.price)}</>
                  )}
                </button>
                {submitError && (
                  <p role="alert" className="err center">
                    {submitError}
                  </p>
                )}
                <p className="small center" style={{ fontSize: 12 }}>
                  <ShieldCheck
                    aria-hidden="true"
                    style={{
                      width: 13,
                      height: 13,
                      display: "inline",
                      verticalAlign: "-2px",
                      marginRight: 4,
                    }}
                  />
                  Your submission is encrypted and reviewed manually before access is granted.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SuccessState({
  course,
  success,
}: {
  course: (typeof COURSES)[number];
  success: { id: string };
}) {
  return (
    <section className="course-page">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <div className="orbit rise">
          <div
            className="orbit-in stack"
            style={{
              padding: "clamp(26px, 4vw, 40px)",
              gap: 18,
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div className="pstep" aria-hidden="true" style={{ alignSelf: "stretch" }}>
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className={i <= 2 ? "on" : ""} />
              ))}
            </div>
            <div className="spinner" aria-hidden="true" />
            <h1 className="h2">Payment submitted</h1>
            <p className="body">
              We've received your payment for{" "}
              <strong style={{ color: "var(--tx)" }}>{course.title}</strong>. Your submission is now
              marked <span className="chip chip-gold">Pending Verification</span>.
            </p>
            <div
              className="card-flat stack"
              style={{ padding: 20, gap: 10, textAlign: "left", alignSelf: "stretch" }}
            >
              <p className="h4 row" style={{ gap: 8 }}>
                <ShieldCheck
                  aria-hidden="true"
                  style={{ width: 16, height: 16, color: "var(--gold-ink)" }}
                />
                What happens next
              </p>
              <ul className="stack small" style={{ gap: 6, margin: 0, paddingLeft: 18 }}>
                <li>
                  Our team verifies your transaction (typically under 30 minutes during business
                  hours).
                </li>
                <li>
                  Your course unlocks in the BLACKPIPS app once approved — sign in with the same
                  account.
                </li>
                <li>You'll receive an email confirmation at approval.</li>
              </ul>
              <p className="small" style={{ fontSize: 12 }}>
                Reference:{" "}
                <span className="mono" style={{ color: "var(--tx)" }}>
                  {success.id.replaceAll("-", "").slice(0, 8).toUpperCase()}
                </span>
              </p>
            </div>
            <div className="row-wrap" style={{ gap: 10, justifyContent: "center" }}>
              <Link to="/dashboard" className="btn btn-gold">
                Go to dashboard
              </Link>
              <Link to="/courses" className="btn btn-ghost">
                Browse more courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
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
      className="copy"
      style={
        highlight ? { borderColor: "var(--gold-line)", background: "var(--gold-wash)" } : undefined
      }
    >
      <span className="copy-v">
        <span className="copy-l">{label}</span>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onCopy(label, value)}
        className={cn("copy-btn", isCopied && "done")}
        aria-label={`Copy ${label}`}
      >
        {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
