import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookmarkX, LogOut, PlayCircle, Sparkles, CreditCard, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { COURSES, FREE_LESSONS } from "@/lib/site-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BlackPips" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Tab = "learning" | "bookmarks" | "account" | "billing";

type Profile = { display_name: string | null; avatar_url: string | null; country: string | null };
type Enrollment = { course_slug: string; progress: number };

function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("learning");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({ display_name: "", avatar_url: "", country: "" });
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const [{ data: p }, { data: bm }, { data: en }] = await Promise.all([
        supabase.from("profiles").select("display_name,avatar_url,country").eq("id", u.user.id).maybeSingle(),
        supabase.from("bookmarks").select("lesson_id").eq("user_id", u.user.id),
        supabase.from("enrollments").select("course_slug,progress").eq("user_id", u.user.id),
      ]);
      if (p) setProfile({ display_name: p.display_name ?? "", avatar_url: p.avatar_url ?? "", country: p.country ?? "" });
      setBookmarkIds((bm ?? []).map((b) => b.lesson_id));
      setEnrollments(en ?? []);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function removeBookmark(lessonId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("bookmarks").delete().eq("user_id", u.user.id).eq("lesson_id", lessonId);
    if (error) return toast.error("Could not remove bookmark");
    setBookmarkIds((prev) => prev.filter((id) => id !== lessonId));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const nm = z.string().trim().min(1).max(80).parse(profile.display_name ?? "");
      const country = z.string().trim().max(80).parse(profile.country ?? "");
      const avatar = z.string().trim().max(500).parse(profile.avatar_url ?? "");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase.from("profiles").upsert({
        id: u.user.id,
        display_name: nm,
        country: country || null,
        avatar_url: avatar || null,
      });
      if (error) throw error;
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof z.ZodError ? err.issues[0].message : err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingProfile(false);
    }
  }

  const enrolledSlugs = new Set(enrollments.map((e) => e.course_slug));
  const myCourses = COURSES.filter((c) => enrolledSlugs.has(c.slug));
  const bookmarkedLessons = FREE_LESSONS.filter((l) => bookmarkIds.includes(l.id));
  const initials = (profile.display_name || email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-gold font-display text-xl font-bold text-primary-foreground shadow-glow">
            {initials}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gold">Dashboard</div>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Welcome{profile.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.</h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <button onClick={signOut} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <nav className="glass mt-8 flex gap-1 overflow-x-auto rounded-full p-1">
        {([
          ["learning", "My Learning", Sparkles],
          ["bookmarks", "Bookmarks", PlayCircle],
          ["account", "Account", UserIcon],
          ["billing", "Billing", CreditCard],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${tab === id ? "bg-gradient-gold text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </nav>

      <section className="mt-8">
        {tab === "learning" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Continue learning</h2>
            {myCourses.length === 0 ? (
              <EmptyState
                title="No enrolled lessons yet"
                body="Browse Premium Lessons to unlock the full ALC curriculum."
                ctaTo="/courses"
                ctaLabel="Browse Premium Lessons"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myCourses.map((c) => {
                  const e = enrollments.find((x) => x.course_slug === c.slug);
                  return (
                    <article key={c.slug} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-elegant">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">{c.level}</span>
                      <h3 className="mt-2 font-display text-base font-semibold">{c.title}</h3>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-gradient-gold" style={{ width: `${e?.progress ?? 0}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{e?.progress ?? 0}% complete</span>
                        <span>{c.lessons} lessons</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "bookmarks" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Saved free lessons</h2>
            {bookmarkedLessons.length === 0 ? (
              <EmptyState
                title="Nothing bookmarked yet"
                body="Save any free lesson from the library to find it here."
                ctaTo="/free"
                ctaLabel="Explore free lessons"
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bookmarkedLessons.map((l) => (
                  <article key={l.id} className="rounded-2xl border border-border bg-card p-5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">{l.level}</span>
                    <h3 className="mt-2 font-display text-base font-semibold">{l.title}</h3>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{l.duration}</span>
                      <button onClick={() => removeBookmark(l.id)} className="inline-flex items-center gap-1 hover:text-foreground">
                        <BookmarkX className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "account" && (
          <form onSubmit={saveProfile} className="glass max-w-xl rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">Profile</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Display name">
                <input
                  value={profile.display_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  maxLength={80}
                  className="w-full bg-transparent outline-none"
                />
              </Field>
              <Field label="Country">
                <input
                  value={profile.country ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                  maxLength={80}
                  className="w-full bg-transparent outline-none"
                />
              </Field>
              <Field label="Avatar URL">
                <input
                  value={profile.avatar_url ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value }))}
                  maxLength={500}
                  placeholder="https://…"
                  className="w-full bg-transparent outline-none"
                />
              </Field>
              <Field label="Email">
                <input value={email} disabled className="w-full bg-transparent text-muted-foreground outline-none" />
              </Field>
            </div>
            <button disabled={savingProfile} className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              Save changes
            </button>
          </form>
        )}

        {tab === "billing" && (
          <div className="glass max-w-xl rounded-3xl p-8 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-gold" />
            <h2 className="mt-3 font-display text-xl font-semibold">No active subscription</h2>
            <p className="mt-2 text-sm text-muted-foreground">Payments launch soon. You'll be able to unlock Premium Lessons and Mentorship tiers right from here.</p>
            <Link to="/mentorship" className="mt-5 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              View Mentorship
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="glass rounded-xl px-3 py-2.5">{children}</div>
    </label>
  );
}

function EmptyState({ title, body, ctaTo, ctaLabel }: { title: string; body: string; ctaTo: string; ctaLabel: string }) {
  return (
    <div className="glass mt-4 rounded-3xl p-10 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link to={ctaTo} className="mt-5 inline-flex rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
        {ctaLabel}
      </Link>
    </div>
  );
}
