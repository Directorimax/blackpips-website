import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Crown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MENTORSHIP, formatTZS } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/mentorship")({
  head: () =>
    createSeoHead({
      title: "Forex Mentorship",
      description:
        "Apply for BLACKPIPS mentorship and receive structured support through the selected mentorship package.",
      path: "/mentorship",
      noindex: true,
    }),
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
};
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
  const [selectedPackage, setSelectedPackage] = useState<MentorshipPackage | null>(null);
  const [packages, setPackages] = useState<MentorshipPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const packageErrorNotified = useRef(false);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email)
      setForm((current) => ({ ...current, email: current.email || user.email || "" }));
  }, [user?.email]);

  useEffect(() => {
    supabase
      .from("mentorship_packages")
      .select("id,slug,name,is_active")
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

  function openApplication(packageOption: MentorshipPackage | undefined) {
    if (!packageOption?.is_active)
      return toast.error("This mentorship package is currently unavailable.");
    setSelectedPackage(packageOption);
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPackage || submitting) return;
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session has expired. Please sign in again.");
      const { error } = await supabase.rpc("submit_mentorship_application", {
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
      toast.success("Mentorship application received.");
      setSelectedPackage(null);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Mentorship
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
          The complete ALC program
        </h1>
        <p className="mt-3 text-muted-foreground">
          Live Zoom coaching, direct mentor communication, market analysis and a structured path
          built around your goals.
        </p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          "Complete Forex foundation",
          "Risk management",
          "Trading psychology",
          "Live market analysis",
          "Homework & practice",
          "Trading journal template",
          "Practical exercises",
          "Lifetime updates",
        ].map((feature) => (
          <div key={feature} className="glass flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {packagesError ? (
          <div className="glass lg:col-span-3 rounded-3xl p-10 text-center">
            <h2 className="font-display text-xl font-semibold">
              Unable to load mentorship packages
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{packagesError}</p>
          </div>
        ) : !packagesLoading && packages.length === 0 ? (
          <div className="glass lg:col-span-3 rounded-3xl p-10 text-center">
            <h2 className="font-display text-xl font-semibold">Mentorship unavailable for now</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please check back soon for new mentorship availability.
            </p>
          </div>
        ) : (
          MENTORSHIP.map((mentorshipPackage, index) => {
            const databasePackage = packages.find((item) => item.slug === PACKAGE_SLUGS[index]);
            const available = Boolean(databasePackage?.is_active);
            return (
              <div
                key={mentorshipPackage.tier}
                className={`relative flex flex-col rounded-3xl border p-8 transition-all ${mentorshipPackage.popular ? "border-gold/50 bg-card shadow-elegant lg:-translate-y-3" : "border-border bg-card"}`}
              >
                {mentorshipPackage.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                    Most popular
                  </div>
                )}
                <div className="flex items-center gap-2 text-gold">
                  {mentorshipPackage.popular ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {databasePackage?.name ?? mentorshipPackage.tier}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-gradient-gold font-display text-5xl font-black">
                    {formatTZS(mentorshipPackage.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ program</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Application required Â· Scheduling and payment follow approval
                </p>
                <button
                  disabled={packagesLoading || !available}
                  onClick={() => openApplication(databasePackage)}
                  className="mt-6 rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                >
                  {packagesLoading
                    ? "Checking availability…"
                    : available
                      ? "Enroll now"
                      : "Currently unavailable"}
                </button>
                <div className="mt-8 border-t border-border pt-6">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Curriculum
                  </div>
                  <div className="space-y-4">
                    {mentorshipPackage.modules.map((module) => (
                      <div key={module.name}>
                        <div className="text-sm font-semibold">{module.name}</div>
                        <ul className="mt-1.5 space-y-1">
                          {module.items.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog
        open={Boolean(selectedPackage)}
        onOpenChange={(open) => !open && setSelectedPackage(null)}
      >
        <DialogContent className="mentorship-application-scrollbar max-h-[90vh] max-w-2xl overflow-x-hidden overflow-y-auto rounded-3xl border-gold/20 bg-card p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Mentorship application</DialogTitle>
            <DialogDescription>
              Apply for the {selectedPackage?.name} program. We will review your goals and
              availability before discussing scheduling or payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitApplication} className="mt-2 grid gap-4">
            <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gold">
                Selected Mentorship Package
              </div>
              <div className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
                <CheckCircle2 className="h-4 w-4 text-gold" /> {selectedPackage?.name}
              </div>
            </div>
            <ApplicationField label="Selected mentorship package">
              <input value={selectedPackage?.name ?? ""} readOnly aria-readonly="true" />
            </ApplicationField>
            <div className="grid gap-4 sm:grid-cols-2">
              <ApplicationField label="Full name">
                <input
                  required
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                />
              </ApplicationField>
              <ApplicationField label="Email address">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </ApplicationField>
              <ApplicationField label="WhatsApp number">
                <input
                  required
                  value={form.whatsapp}
                  onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                  placeholder="+255 …"
                />
              </ApplicationField>
              <ApplicationField label="Country">
                <input
                  required
                  value={form.country}
                  onChange={(event) => setForm({ ...form, country: event.target.value })}
                />
              </ApplicationField>
            </div>
            <ApplicationField label="Forex experience">
              <Select
                value={form.experience_level}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    experience_level: value as ApplicationForm["experience_level"],
                  })
                }
              >
                <SelectTrigger
                  aria-label="Forex experience"
                  className="h-10 rounded-xl border-gold/30 bg-background/60 text-foreground focus:ring-gold/50"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] rounded-xl border-gold/30 bg-card text-foreground">
                  <SelectItem value="beginner" className="focus:bg-gold/15 focus:text-gold">
                    Beginner
                  </SelectItem>
                  <SelectItem value="intermediate" className="focus:bg-gold/15 focus:text-gold">
                    Intermediate
                  </SelectItem>
                  <SelectItem value="advanced" className="focus:bg-gold/15 focus:text-gold">
                    Advanced
                  </SelectItem>
                </SelectContent>
              </Select>
            </ApplicationField>
            <ApplicationField label="How long have you been trading?">
              <input
                required
                value={form.trading_duration}
                onChange={(event) => setForm({ ...form, trading_duration: event.target.value })}
                placeholder="For example, 2 years"
              />
            </ApplicationField>
            <ApplicationField label="What are your biggest trading challenges?">
              <textarea
                required
                value={form.biggest_challenge}
                onChange={(event) => setForm({ ...form, biggest_challenge: event.target.value })}
              />
            </ApplicationField>
            <ApplicationField label="What do you want to achieve through this mentorship?">
              <textarea
                required
                value={form.learning_goal}
                onChange={(event) => setForm({ ...form, learning_goal: event.target.value })}
              />
            </ApplicationField>
            <ApplicationField label="Preferred session time">
              <input
                required
                value={form.preferred_schedule}
                onChange={(event) => setForm({ ...form, preferred_schedule: event.target.value })}
                placeholder="For example, weekday evenings (EAT)"
              />
            </ApplicationField>
            <ApplicationField label="Additional notes (optional)">
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </ApplicationField>
            <button
              disabled={submitting}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting application…" : "Submit application"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicationField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="glass rounded-xl px-3 py-2.5 [&_input]:w-full [&_input]:bg-transparent [&_input]:outline-none [&_select]:w-full [&_select]:bg-transparent [&_select]:outline-none [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:bg-transparent [&_textarea]:outline-none">
        {children}
      </div>
    </label>
  );
}
