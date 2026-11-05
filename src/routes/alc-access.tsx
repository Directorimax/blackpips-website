import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import {
  ALC_PROGRAMS,
  alcAccessSchema,
  alcWhatsAppUrl,
  type AlcAccessForm,
} from "@/lib/alc-access";
import { isAlcAccessAvailable } from "@/lib/feature-access";
import { LearningFeatureGate } from "@/components/LearningFeatureGate";
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
  created_at: string;
  reviewed_at: string | null;
  full_name: string;
  email: string;
  phone: string;
  program: AlcAccessForm["program"];
  other_program: string | null;
  study_year: number;
  public_review_message: string | null;
};

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

    callRpc<unknown>("alc_access_my_request")
      .then(({ data, error }) => {
        if (error) {
          console.error("[alc-access] request status RPC failed", error);
          setRequestError("We could not load your ALC Access status.");
          setRequest(null);
        } else {
          setRequest(
            Array.isArray(data) && data[0] && typeof data[0] === "object"
              ? (data[0] as Request)
              : null,
          );
        }
        setRequestLoading(false);
      })
      .catch((error) => {
        console.error("[alc-access] request status RPC failed", error);
        setRequestError("We could not load your ALC Access status.");
        setRequestLoading(false);
      });
  }, [user]);

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
    setSubmitting(false);

    if (error) return toast.error(error.message);

    setRequest({
      id: data,
      status: "pending",
      created_at: new Date().toISOString(),
      reviewed_at: null,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      program: parsed.data.program,
      other_program: parsed.data.otherProgram || null,
      study_year: parsed.data.studyYear,
      public_review_message: null,
    });
    toast.success("ALC Access request submitted.");
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
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={alcWhatsAppUrl(
                    {
                      fullName: request.full_name,
                      studyYear: request.study_year,
                      email: request.email,
                      phone: request.phone,
                      program: request.program,
                      otherProgram: request.other_program ?? undefined,
                    },
                    request.id,
                  )}
                  className="btn btn-block alc-wa"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="orbit">
              <div className="orbit-in stack" style={{ padding: 26, gap: 14 }}>
                <p className="h3">Request ALC Access</p>
                {(
                  [
                    ["fullName", "Full name used during payment or enrollment"],
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
                <label className="field">
                  <span className="label">Year studied</span>
                  <input
                    required
                    type="number"
                    min="2010"
                    max={new Date().getFullYear()}
                    value={form.studyYear}
                    onChange={(e) => setForm({ ...form, studyYear: Number(e.target.value) })}
                    className="input"
                  />
                </label>
                <label className="field">
                  <span className="label">Program or class attended</span>
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
                    Additional verification details <span className="small">(optional)</span>
                  </span>
                  <textarea
                    maxLength={1000}
                    value={form.additionalDetails || ""}
                    onChange={(e) => setForm({ ...form, additionalDetails: e.target.value })}
                    className="input"
                  />
                </label>
                <button disabled={submitting} className="btn btn-gold btn-lg btn-block">
                  {submitting ? "Submitting…" : "Request ALC Access"}
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
          {request.program}
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
        ? "Access approved — your ALC library is available."
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
          {text} Submitted {new Date(request.created_at).toLocaleDateString()}.
        </p>
        <dl className="grid-2 alc-dl">
          <div>
            <dt className="micro">Request reference</dt>
            <dd className="h4 mono">{request.id.slice(0, 8)}</dd>
          </div>
          <div>
            <dt className="micro">Program</dt>
            <dd className="h4 mono">{request.program}</dd>
          </div>
          <div>
            <dt className="micro">Study year</dt>
            <dd className="h4 mono">{request.study_year}</dd>
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
