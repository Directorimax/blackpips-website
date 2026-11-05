import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { formatTZS, MENTORSHIP } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import { createSeoHead } from "@/lib/seo";
import { sendNotification } from "@/services/email/notification.functions";
import {
  isMentorshipPromotionActive,
  mentorshipOfferCountdown,
  mentorshipPayablePrice,
} from "@/lib/mentorship-pricing";

export const Route = createFileRoute("/mentorship")({
  head: () =>
    createSeoHead({
      title: "Forex Mentorship",
      description:
        "Apply for BLACKPIPS mentorship and receive structured support through the selected mentorship package.",
      path: "/mentorship",
      noindex: true,
    }),
  validateSearch: (search: Record<string, unknown>): { apply?: string } =>
    typeof search.apply === "string" ? { apply: search.apply } : {},
  component: () => (
    <AuthenticatedRouteGuard>
      <Mentorship />
    </AuthenticatedRouteGuard>
  ),
});

type MentorshipPackage = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  normal_price: number;
  promotion_price: number | null;
  promotion_ends_at: string | null;
};
type MentorshipProgram = (typeof MENTORSHIP)[number];
const PACKAGE_SLUGS = ["regular-class", "advanced-class", "master-class"] as const;
type ApplicationForm = {
  full_name: string;
  email: string;
  whatsapp: string;
  country: string;
  experience_level: "beginner" | "intermediate" | "advanced";
  trading_duration: string;
  biggest_challenge: string;
  learning_goal: string;
  preferred_schedule: string;
  notes: string;
};

const EMPTY_FORM: ApplicationForm = {
  full_name: "",
  email: "",
  whatsapp: "",
  country: "",
  experience_level: "beginner",
  trading_duration: "",
  biggest_challenge: "",
  learning_goal: "",
  preferred_schedule: "",
  notes: "",
};

function Mentorship() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<MentorshipPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const packageErrorNotified = useRef(false);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { apply } = Route.useSearch();
  const applyTier = MENTORSHIP.find((program) => program.tier.toLowerCase() === apply)?.tier;
  const selectedTier =
    applyTier ?? MENTORSHIP.find((program) => program.popular)?.tier ?? MENTORSHIP[0].tier;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [applyTier]);
  const offerNow = useOfferClock();

  useEffect(() => {
    if (user?.email)
      setForm((current) => ({ ...current, email: current.email || user.email || "" }));
  }, [user?.email]);

  useEffect(() => {
    supabase
      .from("mentorship_packages")
      .select("id,slug,name,is_active,normal_price,promotion_price,promotion_ends_at")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load mentorship packages:", error);
          setPackagesError("We could not load mentorship packages. Please try again shortly.");
          if (!packageErrorNotified.current) {
            packageErrorNotified.current = true;
            toast.error("Mentorship packages could not be loaded.");
          }
        } else setPackages(data ?? []);
        setPackagesLoading(false);
      });
  }, []);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedPackage = packages.find(
      (item) =>
        item.slug ===
        PACKAGE_SLUGS[MENTORSHIP.findIndex((program) => program.tier === selectedTier)],
    );
    if (!selectedPackage?.is_active) {
      toast.error("This mentorship package is currently unavailable.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session has expired. Please sign in again.");
      const { data: applicationId, error } = await supabase.rpc("submit_mentorship_application", {
        p_mentorship_package_id: selectedPackage.id,
        p_full_name: form.full_name.trim(),
        p_email: form.email.trim(),
        p_whatsapp_number: form.whatsapp.trim(),
        p_country: form.country.trim(),
        p_experience_level: form.experience_level.toLowerCase(),
        p_trading_duration: form.trading_duration.trim(),
        p_biggest_challenge: form.biggest_challenge.trim(),
        p_learning_goal: form.learning_goal.trim(),
        p_preferred_schedule: form.preferred_schedule.trim(),
        p_notes: form.notes.trim() || null,
      });
      if (error) throw error;
      try {
        await sendNotification({
          data: { type: "mentorship_submitted", resourceId: applicationId },
        });
      } catch {
        console.error("Mentorship review notification could not be queued.");
      }
      toast.success("Mentorship application received.");
      setForm((current) => ({ ...EMPTY_FORM, email: current.email }));
    } catch (error) {
      console.error("Could not submit mentorship application:", error);
      const message =
        error && typeof error === "object" && "message" in error ? String(error.message) : "";
      if (/already have an active application/i.test(message))
        toast.error("You already have an active application for this mentorship package.");
      else if (/authentication|required|session/i.test(message))
        toast.error("Please sign in before submitting your mentorship application.");
      else if (/package.*available/i.test(message))
        toast.error("This mentorship package is currently unavailable.");
      else toast.error("We could not submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedIndex = MENTORSHIP.findIndex((program) => program.tier === selectedTier);
  const selectedProgram = MENTORSHIP[selectedIndex] ?? MENTORSHIP[1];
  const selectedDatabasePackage = packages.find(
    (item) => item.slug === PACKAGE_SLUGS[selectedIndex],
  );
  const selectedPrice = selectedDatabasePackage
    ? mentorshipPayablePrice(selectedDatabasePackage, offerNow ?? Infinity)
    : null;

  return (
    <div className="bp bp-page">
      <div className="page-bg" aria-hidden="true" />
      {!applyTier ? (
        <>
          <section className="pkg-intro">
            <div className="wrap center">
              <span className="eyebrow rise">
                <span className="tag">Mentorship</span> Learn directly with the desk
              </span>
              <h1 className="h1 rise d1" style={{ marginTop: 18 }}>
                What each programme covers.
              </h1>
              <p className="lead rise d2" style={{ maxWidth: 600, margin: "16px auto 0" }}>
                Live Zoom coaching, direct mentor communication and a structured path. Choose your
                programme and apply.
              </p>
            </div>
          </section>
          {packagesError ? (
            <div className="wrap" style={{ paddingBottom: 96 }}>
              <div className="card center" style={{ padding: 40 }}>
                <h2 className="h3">Unable to load mentorship packages</h2>
                <p className="small" style={{ marginTop: 8 }}>
                  {packagesError}
                </p>
              </div>
            </div>
          ) : !packagesLoading && packages.length === 0 ? (
            <div className="wrap" style={{ paddingBottom: 96 }}>
              <div className="card center" style={{ padding: 40 }}>
                <h2 className="h3">Mentorship unavailable for now</h2>
                <p className="small" style={{ marginTop: 8 }}>
                  Please check back soon for new mentorship availability.
                </p>
              </div>
            </div>
          ) : (
            <CompareTable packages={packages} offerNow={offerNow} />
          )}
        </>
      ) : (
        <>
          <section className="apply-top">
            <div className="wrap">
              <Link to="/mentorship" className="row small crumbs" style={{ gap: 8 }}>
                <span aria-hidden="true">←</span> All programmes
              </Link>
              <div className="rise" style={{ maxWidth: 680 }}>
                <p className="kicker">Apply · {selectedTier}</p>
                <h1 className="h1" style={{ marginTop: 12 }}>
                  From application to first session.
                </h1>
              </div>
              <div className="grid-4" style={{ marginTop: 32 }}>
                {STEPS.map((step, i) => (
                  <div
                    className="step spot rise"
                    style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                    key={step.t}
                  >
                    <span className="step-n">{i + 1}</span>
                    <span className="h3">{step.t}</span>
                    <span className="small">{step.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section id="apply" className="rise d2" style={{ padding: "28px 0 104px" }}>
            <div className="wrap">
              <div className="orbit">
                <div className="orbit-in split apply-grid">
                  <div>
                    <p className="kicker">Apply</p>
                    <h2 className="h2" style={{ marginTop: 14 }}>
                      Reserve your seat in <span className="gold-text">{selectedProgram.tier}</span>
                      .
                    </h2>
                    <p className="lead" style={{ marginTop: 16 }}>
                      We will review your goals and availability before discussing scheduling or
                      payment. The team replies on WhatsApp.
                    </p>
                    <div className="card-flat" style={{ marginTop: 28, padding: 22 }}>
                      <div className="between">
                        <span className="small">Selected programme</span>
                        <span className="chip chip-gold">
                          {selectedDatabasePackage?.name ?? selectedProgram.tier}
                        </span>
                      </div>
                      <div className="between" style={{ marginTop: 14 }}>
                        <span className="small">Programme fee</span>
                        <span style={{ fontSize: 26, fontWeight: 800 }}>
                          {selectedPrice !== null ? formatTZS(selectedPrice) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <form
                    className="stack"
                    style={{ gap: 16 }}
                    onSubmit={submitApplication}
                    aria-busy={submitting}
                  >
                    <div className="grid-2" style={{ gap: 14 }}>
                      <label className="field">
                        <span className="label">Full name</span>
                        <input
                          className="input"
                          required
                          autoComplete="name"
                          value={form.full_name}
                          onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span className="label">Email address</span>
                        <input
                          className="input"
                          required
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span className="label">WhatsApp number</span>
                        <input
                          className="input"
                          required
                          type="tel"
                          placeholder="+255 7XX XXX XXX"
                          value={form.whatsapp}
                          onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span className="label">Country</span>
                        <input
                          className="input"
                          required
                          value={form.country}
                          onChange={(event) => setForm({ ...form, country: event.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span className="label">Forex experience</span>
                        <select
                          className="input"
                          value={form.experience_level}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              experience_level: event.target
                                .value as ApplicationForm["experience_level"],
                            })
                          }
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="label">How long have you been trading?</span>
                        <input
                          className="input"
                          required
                          placeholder="For example, 2 years"
                          value={form.trading_duration}
                          onChange={(event) =>
                            setForm({ ...form, trading_duration: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span className="label">What are your biggest trading challenges?</span>
                      <textarea
                        className="input"
                        required
                        value={form.biggest_challenge}
                        onChange={(event) =>
                          setForm({ ...form, biggest_challenge: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="label">
                        What do you want to achieve through this mentorship?
                      </span>
                      <textarea
                        className="input"
                        required
                        value={form.learning_goal}
                        onChange={(event) =>
                          setForm({ ...form, learning_goal: event.target.value })
                        }
                      />
                    </label>
                    <div className="grid-2" style={{ gap: 14 }}>
                      <label className="field">
                        <span className="label">Preferred session time</span>
                        <input
                          className="input"
                          required
                          placeholder="For example, weekday evenings (EAT)"
                          value={form.preferred_schedule}
                          onChange={(event) =>
                            setForm({ ...form, preferred_schedule: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span className="label">Additional notes (optional)</span>
                        <input
                          className="input"
                          value={form.notes}
                          onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        />
                      </label>
                    </div>
                    <button
                      className="btn btn-gold btn-lg btn-block"
                      type="submit"
                      disabled={
                        submitting || packagesLoading || !selectedDatabasePackage?.is_active
                      }
                      aria-busy={submitting}
                    >
                      {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                      {submitting
                        ? "Submitting application…"
                        : packagesLoading
                          ? "Checking availability…"
                          : selectedDatabasePackage?.is_active
                            ? "Submit application"
                            : "Currently unavailable"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const STEPS = [
  { t: "Apply", d: "Choose a programme and tell us where you are today." },
  { t: "Review", d: "The team reviews your application and replies on WhatsApp." },
  { t: "Pay", d: "Pay with mobile money and submit your payment for confirmation." },
  { t: "Start", d: "Your programme opens in the BLACKPIPS app." },
];

const TIER_DESCRIPTIONS: Record<string, string> = {
  Regular:
    "Build your forex foundation through core market knowledge, structure, practical entries and selected advanced concepts.",
  Advanced:
    "Deepen an existing foundation with top-down analysis, structured market reading and a stronger decision process.",
  Masterclass:
    "The complete BLACKPIPS programme — Regular and Advanced combined, plus additional advanced material.",
};

type CompareValue = "yes" | "no" | string;
const COMPARE_ROWS: (string | [string, CompareValue, CompareValue, CompareValue])[] = [
  "Foundation",
  ["Market structure & swing points", "yes", "no", "yes"],
  ["Break of structure (BOS)", "yes", "no", "yes"],
  ["Liquidity engineering & failed LE", "yes", "no", "yes"],
  ["Formations & flip zones", "yes", "no", "yes"],
  "Execution & mastery",
  ["Directional bias", "yes", "yes", "yes"],
  ["Entry types", "T1–T2", "T1–T8", "T1–T8"],
  ["FTA & DTO", "no", "yes", "yes"],
  ["Liquidity consumption", "no", "yes", "yes"],
  ["LTF trading & TF switching", "no", "yes", "yes"],
  ["XAUUSD session trading", "no", "yes", "yes"],
  ["Top-down analysis", "no", "yes", "yes"],
];

const PACKAGE_TAGLINES = [
  "Build the foundation",
  "Execute with precision",
  "The complete programme",
];

/** One premium card per programme: what it covers, grouped the way the curriculum is taught. */
function CompareTable({
  packages,
  offerNow,
}: {
  packages: MentorshipPackage[];
  offerNow: number | null;
}) {
  const pricing = (index: number) => {
    const option = packages.find((item) => item.slug === PACKAGE_SLUGS[index]);
    if (!option) return null;
    const promo = offerNow !== null && isMentorshipPromotionActive(option, offerNow);
    return {
      price: formatTZS(mentorshipPayablePrice(option, offerNow ?? Infinity)),
      was: promo ? formatTZS(option.normal_price) : null,
      countdown:
        promo && option.promotion_ends_at && offerNow !== null
          ? mentorshipOfferCountdown(option.promotion_ends_at, offerNow)
          : null,
      available: option.is_active,
    };
  };
  const groups: { title: string; rows: [string, CompareValue, CompareValue, CompareValue][] }[] =
    [];
  for (const row of COMPARE_ROWS) {
    if (typeof row === "string") groups.push({ title: row, rows: [] });
    else groups[groups.length - 1].rows.push(row);
  }
  return (
    <section style={{ padding: "0 0 104px" }}>
      <div className="wrap">
        <div className="pkg-grid">
          {MENTORSHIP.map((program, i) => {
            const included = groups.flatMap((group) =>
              group.rows.filter((row) => row[i + 1] !== "no"),
            ).length;
            const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
            const price = pricing(i);
            const card = (
              <div className="pkg-in">
                <div className="pkg-head">
                  <div className="between" style={{ alignItems: "flex-start" }}>
                    <span className="pkg-n mono">0{i + 1}</span>
                    {program.popular && <span className="chip chip-gold">Most popular</span>}
                  </div>
                  <p className="micro" style={{ marginTop: 18 }}>
                    {PACKAGE_TAGLINES[i]}
                  </p>
                  <h3 className="h2" style={{ fontSize: 30, marginTop: 6 }}>
                    {program.tier}
                  </h3>
                  <p className="small" style={{ marginTop: 8 }}>
                    {TIER_DESCRIPTIONS[program.tier]}
                  </p>
                  <div className="pkg-price">
                    {price?.was && <s className="pkg-was">{price.was}</s>}
                    <span>{price?.price ?? "\u00a0"}</span>
                  </div>
                  {price?.countdown && (
                    <span className="chip chip-gold" style={{ marginTop: 10 }}>
                      Offer ends in {price.countdown.days}d {price.countdown.hours}h{" "}
                      {price.countdown.minutes}m
                    </span>
                  )}
                  <div className="pkg-cover">
                    <div className="csegs" aria-hidden="true">
                      {Array.from({ length: total }, (_, k) => (
                        <i key={k} className={k < included ? "on" : ""} />
                      ))}
                    </div>
                    <span className="small mono" style={{ fontSize: 12 }}>
                      {included} of {total} topics
                    </span>
                  </div>
                </div>
                {groups.map((group) => (
                  <div className="pkg-group" key={group.title}>
                    <p className="micro">{group.title}</p>
                    <ul>
                      {group.rows.map((row) => {
                        const value = row[i + 1];
                        const on = value !== "no";
                        return (
                          <li key={row[0]} className={on ? "" : "off"}>
                            <span className="pkg-ic" aria-hidden="true">
                              {on ? <Check /> : <X />}
                            </span>
                            <span style={{ flex: 1 }}>
                              {row[0]}
                              <span className="sr-only">
                                {on ? " — included" : " — not included"}
                              </span>
                            </span>
                            {on && value !== "yes" && (
                              <span className="chip chip-gold mono">{value}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                <div className="pkg-foot">
                  <Link
                    to="/mentorship"
                    search={{ apply: program.tier.toLowerCase() }}
                    className={`pkg-cta ${program.popular ? "gold" : ""}`}
                    aria-disabled={price ? !price.available : undefined}
                  >
                    Apply for {program.tier} <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
            return program.popular ? (
              <article key={program.tier} className="pkg pkg-hl orbit reveal">
                <div className="orbit-in">{card}</div>
              </article>
            ) : (
              <article key={program.tier} className="pkg card spot reveal">
                {card}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function useOfferClock() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
