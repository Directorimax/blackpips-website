import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ImagePlus,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import {
  ALC_LANGUAGES,
  ALC_PROGRAMS,
  ALC_PROOF_MAX_BYTES,
  ALC_PROOF_MAX_COUNT,
  ALC_PROOF_TYPES,
  ALC_WHATSAPP_URL,
  alcAccessSchema,
  alcStudyYears,
  type AlcAccessForm,
} from "@/lib/alc-access";
import { isAlcAccessAvailable } from "@/lib/feature-access";
import { LearningFeatureGate } from "@/components/LearningFeatureGate";
import { OpenAppButton } from "@/components/bp/StoreBadges";
import { PageFrame } from "@/components/bp/PageFrame";

export const Route = createFileRoute("/alc-access")({
  component: () => (
    <PageFrame>
      <AlcAccessRoute />
    </PageFrame>
  ),
});

type Request = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
  reviewed_at: string | null;
  program: string | null;
  study_year: number | null;
  public_review_message: string | null;
};

type Proof = { id: string };
type Reservation = { proof_id: string; storage_path: string; bucket_id?: string };

// Helper function bila kutumia any wala custom types
async function callRpc<T>(name: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name as never, args as never);
  return { data: data as T, error };
}

function AlcAccessRoute() {
  return (
    <LearningFeatureGate
      featureEnabled={isAlcAccessAvailable()}
      title="ALC ACCESS"
      description="We’re preparing the BLACKPIPS ALC experience. Access will be available soon."
    >
      <AlcAccess />
    </LearningFeatureGate>
  );
}

function AlcAccess() {
  const { user, loading } = useAuth();
  const [request, setRequest] = useState<Request | null>(null);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<(typeof ALC_LANGUAGES)[number]>("Kiswahili");
  const [files, setFiles] = useState<File[]>([]);
  const [proofCount, setProofCount] = useState(0);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [form, setForm] = useState<AlcAccessForm>({
    fullName: "",
    studyYear: new Date().getFullYear(),
    email: user?.email ?? "",
    phone: "",
    program: "Regular Class",
  });

  useEffect(() => {
    if (user?.email) setForm((v) => ({ ...v, email: v.email || user.email || "" }));
    if (!user) {
      setRequestLoading(false);
      return;
    }
    setRequestLoading(true);
    setRequestError(null);

    callRpc<unknown>("alc_access_my_request_v2")
      .then(async ({ data, error }) => {
        if (error) {
          console.error("[alc-access] request status RPC failed", error);
          setRequestError("We could not load your ALC Access status.");
          setRequest(null);
        } else {
          const row =
            Array.isArray(data) && data[0] && typeof data[0] === "object"
              ? (data[0] as Request)
              : null;
          setRequest(row);
          if (row?.status === "pending") await refreshProofs(row.id);
        }
        setRequestLoading(false);
      })
      .catch((error) => {
        console.error("[alc-access] request status RPC failed", error);
        setRequestError("We could not load your ALC Access status.");
        setRequestLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the account changes
  }, [user]);

  const refreshProofs = useCallback(async (requestId: string) => {
    const { data, error } = await callRpc<Proof[]>("list_my_alc_access_request_proofs", {
      p_request_id: requestId,
    });
    if (!error && Array.isArray(data)) setProofCount(data.length);
  }, []);

  // Same three steps as the app: reserve a slot, upload the image, then finalize it.
  const uploadProofs = async (requestId: string, pending: File[]) => {
    if (!pending.length) return;
    setProofBusy(true);
    setProofError(null);
    const failed: File[] = [];
    for (const file of pending) {
      let reservation = null as Reservation | null;
      try {
        const { data, error } = await callRpc<unknown>(
          "initialize_alc_access_request_proof_upload",
          { p_request_id: requestId, p_mime_type: file.type, p_file_size_bytes: file.size },
        );
        if (error) throw error;
        const row = (Array.isArray(data) ? data[0] : data) as Reservation | null;
        if (!row?.proof_id || !row.storage_path) throw new Error("Invalid reservation");
        reservation = row;
        const bucket = row.bucket_id || "alc-verification-proofs";
        const upload = await supabase.storage
          .from(bucket)
          .upload(row.storage_path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        const done = await callRpc<unknown>("finalize_alc_access_request_proof_upload", {
          p_proof_id: row.proof_id,
        });
        if (done.error) throw done.error;
      } catch (error) {
        console.error("[alc-access] proof upload failed", error);
        failed.push(file);
        if (reservation) {
          await supabase.storage
            .from(reservation.bucket_id || "alc-verification-proofs")
            .remove([reservation.storage_path])
            .catch(() => undefined);
          await callRpc("remove_alc_access_request_proof", {
            p_proof_id: reservation.proof_id,
          }).catch(() => undefined);
        }
      }
    }
    setFiles(failed);
    if (failed.length)
      setProofError(
        `${failed.length} proof image${failed.length === 1 ? "" : "s"} could not be uploaded. You can retry below.`,
      );
    await refreshProofs(requestId);
    setProofBusy(false);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const room = ALC_PROOF_MAX_COUNT - proofCount - files.length;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (accepted.length >= room) {
        toast.error("A maximum of 3 verification images is allowed.");
        break;
      }
      if (!ALC_PROOF_TYPES.includes(file.type)) {
        toast.error("Choose a JPEG, PNG, or WEBP image.");
        continue;
      }
      if (file.size < 1 || file.size > ALC_PROOF_MAX_BYTES) {
        toast.error("Each verification image must be 5 MB or smaller.");
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
  };

  if (loading) return <div className="wrap alc-page" />;

  if (!user)
    return (
      <main className="wrap alc-page">
        <div className="orbit rise" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="orbit-in msg-card" style={{ padding: "clamp(28px, 5vw, 48px)" }}>
            <span className="eyebrow">
              <span className="tag">ALC</span> Former students
            </span>
            <h1 className="h1" style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>
              ALC Access
            </h1>
            <p className="body">
              Previously studied with BlackPips before this website launched? Sign in to request
              free verified access to the ALC student video library.
            </p>
            <a href="/auth?redirect=%2Falc-access" className="btn btn-gold">
              Sign in or create an account
            </a>
          </div>
        </div>
      </main>
    );

  if (requestLoading)
    return (
      <main className="wrap alc-page">
        <div className="card msg-card">
          <div className="spinner" aria-hidden="true" />
          <p className="small">Loading your ALC Access status…</p>
        </div>
      </main>
    );

  if (requestError)
    return (
      <main className="wrap alc-page">
        <div className="card msg-card">
          <p className="err">{requestError}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-gold">
            Try again
          </button>
        </div>
      </main>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = alcAccessSchema.safeParse(form);
    if (!parsed.success)
      return toast.error(parsed.error.issues[0]?.message || "Check your details.");

    setSubmitting(true);
    const { data, error } = await callRpc<string>("submit_alc_access_request", {
      p_full_name: parsed.data.fullName,
      p_study_year: parsed.data.studyYear,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone,
      p_program: parsed.data.program,
      p_other_program: parsed.data.otherProgram || null,
      p_additional_details: parsed.data.additionalDetails || null,
    });
    if (error) {
      setSubmitting(false);
      return toast.error("Your request could not be submitted. Check your details and try again.");
    }

    const latest = await callRpc<unknown>("alc_access_my_request_v2");
    const row = Array.isArray(latest.data) && latest.data[0] ? (latest.data[0] as Request) : null;
    const requestId = row?.id || String(data);
    // The admin sees the study language when approving and assigns matching videos.
    await callRpc("set_my_alc_study_language", {
      p_request_id: requestId,
      p_language: language === "English" ? "en" : "sw",
    }).catch(() => undefined);
    setRequest(
      row ?? {
        id: requestId,
        status: "pending",
        created_at: new Date().toISOString(),
        reviewed_at: null,
        program: parsed.data.program,
        study_year: parsed.data.studyYear,
        public_review_message: null,
      },
    );
    setSubmitting(false);
    await uploadProofs(requestId, files);
    toast.success("Request submitted. It is now pending review.");
  };

  if (request?.status === "approved")
    return (
      <main className="wrap-wide alc-page">
        <ApprovedHeader request={request} />
        <Library />
      </main>
    );

  return (
    <main className="wrap alc-page">
      <div className="clayout alc-layout">
        <header className="stack rise alc-intro" style={{ gap: 16 }}>
          <span className="eyebrow" style={{ alignSelf: "flex-start" }}>
            <span className="tag">ALC Access</span> Request only
          </span>
          <h1 className="h1" style={{ fontSize: "clamp(32px, 4.4vw, 52px)" }}>
            Former student access
          </h1>
          <p className="lead">
            Previously studied with BlackPips before this website launched? Submit your details for
            verification and request free access to the ALC student video library.
          </p>
          <ol className="pay-steps" style={{ marginTop: 8 }}>
            <li>Submit the details you used when you studied with BlackPips</li>
            <li>The team verifies your request manually</li>
            <li>Once approved, your ALC library unlocks on your account</li>
          </ol>
          <p className="small" style={{ fontSize: 12 }}>
            Verification is performed manually using the details you previously used with BlackPips.
            Submission does not guarantee approval.
          </p>
        </header>

        <div className="rise d2">
          {request ? (
            <div className="stack" style={{ gap: 14 }}>
              <Status request={request} />
              {request.status === "pending" && (
                <>
                  <ProofPicker
                    count={proofCount}
                    files={files}
                    busy={proofBusy}
                    error={proofError}
                    onAdd={addFiles}
                    onRemove={(index) => setFiles((f) => f.filter((_, i) => i !== index))}
                    onUpload={() => void uploadProofs(request.id, files)}
                  />
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={ALC_WHATSAPP_URL}
                    className="btn btn-block alc-wa"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat on WhatsApp
                  </a>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="orbit">
              <div className="orbit-in stack" style={{ padding: 26, gap: 14 }}>
                <p className="h3">Request ALC Access</p>
                {(
                  [
                    ["fullName", "Full name used during enrollment"],
                    ["email", "Email address"],
                    ["phone", "Phone / WhatsApp number"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="field">
                    <span className="label">{label}</span>
                    <input
                      required
                      value={form[key] as string}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="input"
                    />
                  </label>
                ))}
                <div className="alc-row">
                  <label className="field">
                    <span className="label">Year studied</span>
                    <select
                      value={form.studyYear}
                      onChange={(e) => setForm({ ...form, studyYear: Number(e.target.value) })}
                      className="input"
                    >
                      {alcStudyYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Program / class</span>
                    <select
                      value={form.program}
                      onChange={(e) =>
                        setForm({ ...form, program: e.target.value as AlcAccessForm["program"] })
                      }
                      className="input"
                    >
                      {ALC_PROGRAMS.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span className="label">Language you studied in</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as (typeof ALC_LANGUAGES)[number])}
                    className="input"
                  >
                    {ALC_LANGUAGES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <span className="small" style={{ fontSize: 12 }}>
                    Your access will be checked and assigned by the BLACKPIPS admin team.
                  </span>
                </label>
                {form.program === "Other" && (
                  <label className="field">
                    <span className="label">Specify program</span>
                    <input
                      required
                      value={form.otherProgram || ""}
                      onChange={(e) => setForm({ ...form, otherProgram: e.target.value })}
                      className="input"
                    />
                  </label>
                )}
                <label className="field">
                  <span className="label">
                    Additional details <span className="small">(optional)</span>
                  </span>
                  <textarea
                    rows={1}
                    placeholder="Anything that helps us find you"
                    maxLength={1000}
                    value={form.additionalDetails || ""}
                    onChange={(e) => setForm({ ...form, additionalDetails: e.target.value })}
                    className="input grow-area"
                  />
                </label>
                <ProofPicker
                  count={0}
                  files={files}
                  busy={submitting}
                  error={null}
                  onAdd={addFiles}
                  onRemove={(index) => setFiles((f) => f.filter((_, i) => i !== index))}
                />
                <button
                  disabled={submitting || proofBusy}
                  className="btn btn-gold btn-lg btn-block"
                >
                  {submitting
                    ? "Submitting…"
                    : proofBusy
                      ? "Uploading proof…"
                      : "Submit for review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function ApprovedHeader({ request }: { request: Request }) {
  return (
    <header
      className="between rise"
      style={{
        flexWrap: "wrap",
        alignItems: "flex-end",
        gap: 16,
        paddingBottom: 24,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div>
        <p className="kicker">ALC student library</p>
        <h1 className="h1" style={{ fontSize: "clamp(30px, 4vw, 46px)", marginTop: 8 }}>
          {request.program ?? "ALC Access"}
        </h1>
      </div>
      <span className="chip chip-gold">
        <span className="live-dot" aria-hidden="true" />
        ALC Access · Active
      </span>
    </header>
  );
}

function Status({ request }: { request: Request }) {
  const text =
    request.status === "pending"
      ? "Pending review — verification is manual."
      : request.status === "approved"
        ? "Access approved — watch your ALC lessons in the BLACKPIPS app."
        : request.public_review_message ||
          "We could not verify this request. Contact BlackPips if you believe this is a mistake.";
  return (
    <section className="orbit">
      <div className="orbit-in stack" style={{ padding: 26, gap: 12 }}>
        {request.status === "pending" ? (
          <div className="spinner" aria-hidden="true" style={{ width: 44, height: 44 }} />
        ) : (
          <span className={`ico ${request.status === "approved" ? "ico-solid" : ""}`}>
            <CheckCircle2 aria-hidden="true" />
          </span>
        )}
        <h2 className="h3" style={{ fontSize: 22 }}>
          {request.status === "approved"
            ? "Access approved"
            : request.status === "pending"
              ? "Pending review"
              : "Request not approved"}
        </h2>
        <p className="small">
          {text}
          {request.created_at && ` Submitted ${new Date(request.created_at).toLocaleDateString()}.`}
        </p>
        <dl className="grid-2 alc-dl">
          <div>
            <dt className="micro">Request reference</dt>
            <dd className="h4 mono">{request.id.slice(0, 8)}</dd>
          </div>
          <div>
            <dt className="micro">Program</dt>
            <dd className="h4 mono">{request.program ?? "—"}</dd>
          </div>
          <div>
            <dt className="micro">Study year</dt>
            <dd className="h4 mono">{request.study_year ?? "—"}</dd>
          </div>
          {request.reviewed_at && (
            <div>
              <dt className="micro">Reviewed</dt>
              <dd className="h4 mono">{new Date(request.reviewed_at).toLocaleDateString()}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

/** ALC lessons play only in the BLACKPIPS app, so the website hands approved students off to it. */
function Library() {
  return (
    <section className="orbit rise d1" style={{ marginTop: 28 }}>
      <div className="orbit-in alc-app">
        <div className="stack" style={{ gap: 14 }}>
          <span className="ico ico-solid">
            <Smartphone aria-hidden="true" />
          </span>
          <h2 className="h2">Your ALC library is in the BLACKPIPS app.</h2>
          <p className="body" style={{ maxWidth: 560 }}>
            Open the BLACKPIPS app already installed on your device and sign in with this same
            account. Your approved ALC lessons are waiting there.
          </p>
          <OpenAppButton className="btn btn-gold" />
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            {ALC_APP_POINTS.map((point) => (
              <div className="learn" key={point}>
                <Check strokeWidth={2.4} aria-hidden="true" />
                {point}
              </div>
            ))}
          </div>
        </div>
        <div className="card-flat stack alc-app-side">
          <ShieldCheck aria-hidden="true" className="alc-app-shield" />
          <p className="h4">Lessons play only in the app</p>
          <p className="small">
            This protects the content. Your access and progress are linked to your BLACKPIPS
            account.
          </p>
        </div>
      </div>
    </section>
  );
}

const ALC_APP_POINTS = [
  "Every ALC module, organised in order",
  "Progress saved to your account",
  "Same sign-in as this website",
];

function ProofPicker({
  count,
  files,
  busy,
  error,
  onAdd,
  onRemove,
  onUpload,
}: {
  count: number;
  files: File[];
  busy: boolean;
  error: string | null;
  onAdd: (list: FileList | null) => void;
  onRemove: (index: number) => void;
  onUpload?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const total = count + files.length;
  return (
    <div className="card-flat alc-proof">
      <div className="between">
        <p className="h4">Verification proof</p>
        <span className="chip">
          {total} of {ALC_PROOF_MAX_COUNT} images
        </span>
      </div>
      <p className="small" style={{ fontSize: 12.5 }}>
        Optional · Add screenshots or images that may help verify your previous BLACKPIPS
        enrollment.
      </p>
      <div className="alc-proof-slots">
        {Array.from({ length: count }).map((_, i) => (
          <span key={`up-${i}`} className="alc-slot done">
            <CheckCircle2 aria-hidden="true" />
            Uploaded
          </span>
        ))}
        {files.map((file, i) => (
          <span key={`${file.name}-${i}`} className="alc-slot file" title={file.name}>
            <span className="alc-slot-name">{file.name}</span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => onRemove(i)}
              disabled={busy}
            >
              <X aria-hidden="true" />
            </button>
          </span>
        ))}
        {total < ALC_PROOF_MAX_COUNT && (
          <button
            type="button"
            className="alc-slot add"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <ImagePlus aria-hidden="true" />
            Add image
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ALC_PROOF_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="err small">{error}</p>}
      {onUpload && files.length > 0 && (
        <button type="button" className="btn btn-gold btn-block" disabled={busy} onClick={onUpload}>
          {busy ? "Uploading…" : "Upload proof"}
        </button>
      )}
    </div>
  );
}
