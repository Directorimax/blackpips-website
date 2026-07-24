import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PlayCircle, Search, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { FREE_LESSONS } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";

export const Route = createFileRoute("/free")({
  head: () => ({
    meta: [
      { title: "Free Forex Lessons — BlackPips" },
      {
        name: "description",
        content:
          "Free forex education videos — beginner to advanced. Search, filter and start learning the ALC framework today.",
      },
      { property: "og:title", content: "Free Forex Lessons — BlackPips" },
      {
        property: "og:description",
        content: "Beginner, intermediate and advanced forex lessons — free to watch.",
      },
    ],
  }),
  component: () => (
    <AuthenticatedRouteGuard>
      <Free />
    </AuthenticatedRouteGuard>
  ),
});

const LEVELS = ["All", "Beginner", "Advanced"] as const;

function logBookmarkError(
  action: string,
  error: { code?: string; message?: string; details?: string; hint?: string },
) {
  console.error(`[bookmarks] Free lesson ${action} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function Free() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("All");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setBookmarks(new Set());
      return;
    }
    supabase
      .from("free_lesson_bookmarks")
      .select("lesson_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setBookmarks(new Set((data ?? []).map((r) => r.lesson_id)));
      });
  }, [user]);

  const filtered = useMemo(() => {
    return FREE_LESSONS.filter(
      (l) =>
        (level === "All" || l.level === level) && l.title.toLowerCase().includes(q.toLowerCase()),
    );
  }, [q, level]);

  async function toggleBookmark(id: string) {
    if (!user) {
      toast.info("Sign in to save lessons");
      navigate({ to: "/auth" });
      return;
    }
    if (savingBookmarkId) return;
    const has = bookmarks.has(id);
    const next = new Set(bookmarks);
    if (has) next.delete(id);
    else next.add(id);
    setBookmarks(next);
    setSavingBookmarkId(id);
    if (has) {
      const { error } = await supabase
        .from("free_lesson_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", id);
      if (error) {
        logBookmarkError("removal", error);
        setBookmarks(bookmarks);
        toast.error("Could not remove");
      }
    } else {
      const { error } = await supabase
        .from("free_lesson_bookmarks")
        .upsert({ user_id: user.id, lesson_id: id }, { onConflict: "user_id,lesson_id" });
      if (error) {
        logBookmarkError("save", error);
        setBookmarks(bookmarks);
        toast.error("Could not save");
      } else {
        toast.success("Saved successfully");
      }
    }
    setSavingBookmarkId(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Free Library
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Learn for free</h1>
        <p className="mt-3 text-muted-foreground">
          A growing library of professional lessons. Bookmark what matters, come back where you left
          off.
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lessons…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="glass flex gap-1 rounded-full p-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${level === l ? "bg-gradient-gold text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => {
          const saved = bookmarks.has(l.id);
          return (
            <article
              key={l.id}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-accent to-secondary">
                <div className="absolute inset-0 bg-hero-glow opacity-70" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="glass grid h-14 w-14 place-items-center rounded-full transition-transform group-hover:scale-110">
                    <PlayCircle className="h-7 w-7 text-gold" />
                  </div>
                </div>
                <span className="absolute right-3 top-3 glass rounded-full px-2 py-1 text-[10px] font-semibold">
                  {l.duration}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">
                    {l.level}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold">{l.title}</h3>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">Free</span>
                  <button
                    type="button"
                    onClick={() => void toggleBookmark(l.id)}
                    disabled={savingBookmarkId === l.id}
                    aria-pressed={saved}
                    aria-label={saved ? "Remove saved lesson" : "Save lesson"}
                    className={`glass grid h-8 w-8 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${saved ? "text-gold" : "hover:text-gold"}`}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-gold" : ""}`} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
            No lessons match your search.
          </div>
        )}
      </div>
    </div>
  );
}
