import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import {
  ALC_PROGRAMS,
  alcAccessSchema,
  alcWhatsAppUrl,
  type AlcAccessForm,
} from "@/lib/alc-access";
import { getEmbeddableVideoUrl } from "@/lib/video-url";
import { isAlcAccessAvailable } from "@/lib/feature-access";
import { LearningFeatureGate } from "@/components/LearningFeatureGate";

export const Route = createFileRoute("/alc-access")({ component: AlcAccessRoute });

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

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-20" />;

  if (!user)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-bold">ALC Access</h1>
        <p className="mt-4 text-muted-foreground">
          Previously studied with BlackPips before this website launched? Sign in to request free
          verified access to the ALC student video library.
        </p>
        <a
          href="/auth?redirect=%2Falc-access"
          className="mt-6 inline-flex rounded-full bg-gradient-gold px-5 py-3 font-semibold text-primary-foreground"
        >
          Sign in or create an account
        </a>
      </main>
    );

  if (requestLoading)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Loading your ALC Access status…
        </div>
      </main>
    );

  if (requestError)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">{requestError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
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
      <main className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <ApprovedHeader request={request} />
        <Library />
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <header className="text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-gold">ALC Access</div>
        <h1 className="mt-3 font-display text-4xl font-bold">Former student access</h1>
        <p className="mt-3 text-muted-foreground">
          Previously studied with BlackPips before this website launched? Submit your details for
          verification and request free access to the ALC student video library.
        </p>
      </header>

      {request ? (
        <div className="mt-8">
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
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-semibold text-black"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="glass mt-8 grid gap-4 rounded-3xl p-5 sm:p-7">
          {(
            [
              ["fullName", "Full name used during payment or enrollment"],
              ["email", "Email address"],
              ["phone", "Phone / WhatsApp number"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <input
                required
                value={form[key] as string}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal"
              />
            </label>
          ))}
          <label className="text-sm font-semibold">
            Year studied
            <input
              required
              type="number"
              min="2010"
              max={new Date().getFullYear()}
              value={form.studyYear}
              onChange={(e) => setForm({ ...form, studyYear: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-semibold">
            Program or class attended
            <select
              value={form.program}
              onChange={(e) =>
                setForm({ ...form, program: e.target.value as AlcAccessForm["program"] })
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal"
            >
              {ALC_PROGRAMS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {form.program === "Other" && (
            <label className="text-sm font-semibold">
              Specify program
              <input
                required
                value={form.otherProgram || ""}
                onChange={(e) => setForm({ ...form, otherProgram: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal"
              />
            </label>
          )}
          <label className="text-sm font-semibold">
            Additional verification details{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              maxLength={1000}
              value={form.additionalDetails || ""}
              onChange={(e) => setForm({ ...form, additionalDetails: e.target.value })}
              className="mt-1.5 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal"
            />
          </label>
          <button
            disabled={submitting}
            className="min-h-11 rounded-full bg-gradient-gold px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Request ALC Access"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Verification is performed manually using the details you previously used with BlackPips.
        Submission does not guarantee approval.
      </p>
    </main>
  );
}

function ApprovedHeader({ request }: { request: Request }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          ALC student library
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{request.program}</h1>
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
        <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
        ALC Access · Active
      </div>
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
    <section className="glass rounded-3xl p-6">
      <CheckCircle2 className="h-6 w-6 text-gold" />
      <h2 className="mt-3 font-display text-2xl font-bold">
        {request.status === "approved"
          ? "Access approved"
          : request.status === "pending"
            ? "Pending review"
            : "Request not approved"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {text} Submitted {new Date(request.created_at).toLocaleDateString()}.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Request reference</dt>
          <dd className="font-semibold">{request.id.slice(0, 8)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Program</dt>
          <dd className="font-semibold">{request.program}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Study year</dt>
          <dd className="font-semibold">{request.study_year}</dd>
        </div>
        {request.reviewed_at && (
          <div>
            <dt className="text-muted-foreground">Reviewed</dt>
            <dd className="font-semibold">{new Date(request.reviewed_at).toLocaleDateString()}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Library() {
  type Video = {
    module_id: string;
    module_title: string;
    module_description: string | null;
    module_order: number;
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    video_order: number;
  };
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [contentOpen, setContentOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void callRpc<unknown>("alc_access_library")
      .then(({ data, error }) => {
        if (error) {
          console.error("[alc-access] library RPC failed", error);
          setError("We could not load the video library.");
        } else {
          const rows = Array.isArray(data) ? (data as Video[]) : [];
          setVideos(rows);
          setSelected(rows[0]?.id ?? null);
        }
        setLoading(false);
      })
      .catch((reason) => {
        console.error("[alc-access] library RPC failed", reason);
        setError("We could not load the video library.");
        setLoading(false);
      });
  }, []);

  const modules = useMemo(
    () =>
      Array.from(
        new Map(
          videos.map((video) => [
            video.module_id,
            {
              id: video.module_id,
              title: video.module_title,
              order: video.module_order,
              items: videos.filter((item) => item.module_id === video.module_id),
            },
          ]),
        ).values(),
      ),
    [videos],
  );
  const activeLesson = videos.find((video) => video.id === selected) ?? videos[0] ?? null;
  const activeEmbedUrl = getEmbeddableVideoUrl(activeLesson?.video_url);
  const activeIndex = activeLesson ? videos.findIndex((video) => video.id === activeLesson.id) : -1;
  const previousLesson = activeIndex > 0 ? videos[activeIndex - 1] : null;
  const nextLesson =
    activeIndex >= 0 && activeIndex < videos.length - 1 ? videos[activeIndex + 1] : null;

  return (
    <section className="mt-6">
      {loading ? (
        <div className="grid min-h-96 place-items-center rounded-3xl border border-border bg-card/40 text-sm text-muted-foreground">
          Loading your course content…
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">{error}</div>
      ) : activeLesson ? (
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <article className="order-1 min-w-0 lg:order-2">
            <div className="mb-4 hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                {activeLesson.module_title}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                {activeLesson.title}
              </h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gold/20 bg-black shadow-xl shadow-black/10">
              {activeEmbedUrl ? (
                <iframe
                  key={activeLesson.id}
                  title={activeLesson.title}
                  src={activeEmbedUrl}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="grid aspect-video place-items-center px-6 text-center text-sm text-white/70">
                  This lesson’s video is temporarily unavailable.
                </div>
              )}
            </div>
            <div className="mt-4 lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                {activeLesson.module_title}
              </p>
              <h2 className="mt-1.5 font-display text-xl font-bold leading-tight sm:text-2xl">
                {activeLesson.title}
              </h2>
            </div>
            <section className="mt-6 border-t border-border pt-5">
              <h3 className="font-display text-xl font-semibold">About this lesson</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {activeLesson.description ||
                  "Follow the video lesson above and work through the module in order."}
              </p>
            </section>

            <nav
              aria-label="Lesson navigation"
              className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5"
            >
              <button
                type="button"
                disabled={!previousLesson}
                onClick={() => previousLesson && setSelected(previousLesson.id)}
                className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:border-gold/40 hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    Previous
                  </span>
                  <span className="block break-words leading-4">
                    {previousLesson?.title || "First lesson"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={!nextLesson}
                onClick={() => nextLesson && setSelected(nextLesson.id)}
                className="flex min-h-12 min-w-0 items-center justify-end gap-2 rounded-xl border border-border px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:border-gold/40 hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                    {nextLesson ? (
                      <>
                        <span className="lg:hidden">Next</span>
                        <span className="hidden lg:inline">Next video</span>
                      </>
                    ) : (
                      "Completed"
                    )}
                  </span>
                  <span className="block break-words leading-4">
                    {nextLesson?.title || "Final lesson"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </nav>
          </article>

          <aside className="order-2 min-w-0 overflow-hidden rounded-2xl border border-border bg-card/60 lg:order-1 lg:sticky lg:top-24">
            <button
              type="button"
              aria-expanded={contentOpen}
              aria-controls="alc-course-content"
              onClick={() => setContentOpen((current) => !current)}
              className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left"
            >
              <span className="inline-flex items-center gap-2 font-display font-semibold">
                <BookOpen className="h-4 w-4 text-gold" /> Course content
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${contentOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id="alc-course-content"
              className={`${contentOpen ? "block" : "hidden"} max-h-[65vh] overflow-y-auto p-3`}
            >
              {modules.map((module) => (
                <section key={module.id} className="not-last:mb-5">
                  <div className="px-2 pb-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Module {String(module.order).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{module.title}</h3>
                  </div>
                  <div className="space-y-1">
                    {module.items.map((lesson, index) => {
                      const isActive = lesson.id === activeLesson.id;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => {
                            setSelected(lesson.id);
                            if (window.matchMedia("(max-width: 767px)").matches)
                              setContentOpen(false);
                          }}
                          className={`group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${isActive ? "bg-gold/15 text-gold" : "text-foreground hover:bg-accent"}`}
                        >
                          <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground group-aria-[current=true]:text-gold">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <Play
                            className={`h-3.5 w-3.5 shrink-0 ${isActive ? "fill-current" : "text-muted-foreground"}`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 text-sm font-medium leading-5">
                            {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div className="glass rounded-3xl px-6 py-14 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-4 font-display text-2xl font-bold">Your library is being prepared</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            No published ALC lessons are available yet. They will appear here automatically when the
            BlackPips team publishes them.
          </p>
        </div>
      )}
    </section>
  );
}
