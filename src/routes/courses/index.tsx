import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Unlock, Star, Clock, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { COURSES, formatTZS } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Premium Courses — BlackPips" },
      {
        name: "description",
        content:
          "Premium ALC forex courses. Foundations, liquidity, entries and XAUUSD session mastery — with lifetime access.",
      },
    ],
  }),
  component: Courses,
});

function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchasedSlugs, setPurchasedSlugs] = useState<Set<string>>(new Set());
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPurchasesLoading(false);
      return;
    }
    const userId = user.id;
    let active = true;
    async function loadPurchases() {
      setPurchasesLoading(true);
      const [
        { data: purchases, error: purchasesError },
        { data: databaseCourses, error: coursesError },
      ] = await Promise.all([
        supabase.from("purchases").select("course_id").eq("user_id", userId),
        supabase.from("courses").select("id,slug"),
      ]);
      if (active && !purchasesError && !coursesError) {
        const courseSlugById = new Map(
          (databaseCourses ?? []).map((course) => [course.id, course.slug]),
        );
        setPurchasedSlugs(
          new Set(
            (purchases ?? [])
              .map((purchase) => courseSlugById.get(purchase.course_id))
              .filter((courseSlug): courseSlug is string => Boolean(courseSlug)),
          ),
        );
      }
      if (active) setPurchasesLoading(false);
    }
    void loadPurchases();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Premium
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">
          Courses built to be traded
        </h1>
        <p className="mt-3 text-muted-foreground">
          Every course is unlocked after payment. Lifetime access. All future updates included.
        </p>
      </header>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((course) => {
          const purchased = purchasedSlugs.has(course.slug);
          return (
            <article
              key={course.slug}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-accent to-secondary">
                <div className="absolute inset-0 bg-hero-glow opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gradient-gold font-display text-6xl font-black opacity-40">
                    {course.level}
                  </div>
                </div>
                <div
                  className="absolute right-3 top-3 glass rounded-full p-2"
                  aria-label={purchased ? "Course unlocked" : "Course locked"}
                  role="img"
                >
                  {purchased ? (
                    <Unlock className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                  )}
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                  {course.level}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-display text-xl font-semibold">{course.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">by {course.instructor}</p>
                <p className="mt-3 text-sm text-muted-foreground">{course.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {course.lessons} lessons
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {course.duration}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gold">
                    <Star className="h-3.5 w-3.5 fill-current" /> {course.rating}
                  </span>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                  <div>
                    {purchased ? (
                      <>
                        <div className="text-xs font-semibold text-gold">Purchased</div>
                        <div className="text-sm text-muted-foreground">Lifetime access</div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-muted-foreground">One-time</div>
                        <div className="text-gradient-gold font-display text-2xl font-bold">
                          {formatTZS(course.price)}
                        </div>
                      </>
                    )}
                  </div>
                  {purchased ? (
                    <button
                      onClick={() =>
                        navigate({ to: "/courses/$slug", params: { slug: course.slug } })
                      }
                      className="rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
                    >
                      View Lessons
                    </button>
                  ) : (
                    <button
                      disabled={purchasesLoading}
                      onClick={() =>
                        navigate({ to: "/payment/$slug", params: { slug: course.slug } })
                      }
                      className="rounded-full bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      Buy now
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
