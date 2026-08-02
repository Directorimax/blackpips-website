import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TradingPlanHeader } from "@/components/trading-plan/TradingPlanHeader";
import { TradingPlanForm } from "@/components/trading-plan/TradingPlanForm";
import { getPlanCompletion } from "@/components/trading-plan/completion";
import type { TradingPlanDraft } from "@/components/trading-plan/types";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { tradingPlanSchema, type TradingPlan } from "@/lib/trading-plan";
import {
  createTradingPlan,
  getTradingPlan,
  updateTradingPlan,
} from "@/services/trading-plan/trading-plan.functions";

export const Route = createFileRoute("/_authenticated/dashboard/trading-plan")({
  component: TradingPlanPage,
});

const blankPlan: TradingPlanDraft = {
  trader_name: "",
  trading_style: "",
  preferred_market: "",
  preferred_session: "",
  preferred_markets: [],
  preferred_sessions: [],
  preferred_timeframes: [],
  max_risk_per_trade: 1,
  max_daily_loss: 3,
  max_weekly_loss: 6,
  max_open_trades: 2,
  psychology_rules: null,
  psychology_rules_list: [],
  daily_routine: null,
  daily_routine_before: null,
  daily_routine_during: null,
  daily_routine_after: null,
  notes: null,
};

function toDraft(plan: TradingPlan): TradingPlanDraft {
  return {
    ...plan,
    preferred_markets:
      plan.preferred_markets?.length > 0
        ? plan.preferred_markets
        : plan.preferred_market
          ? [plan.preferred_market as TradingPlanDraft["preferred_markets"][number]]
          : [],
    preferred_sessions:
      plan.preferred_sessions?.length > 0
        ? plan.preferred_sessions
        : plan.preferred_session
          ? [plan.preferred_session as TradingPlanDraft["preferred_sessions"][number]]
          : [],
    psychology_rules_list:
      plan.psychology_rules_list?.length > 0
        ? plan.psychology_rules_list
        : (plan.psychology_rules ?? "")
            .split(/\r?\n/)
            .map((rule) => rule.trim())
            .filter(Boolean),
    daily_routine_before: plan.daily_routine_before ?? plan.daily_routine ?? null,
    daily_routine_during: plan.daily_routine_during ?? null,
    daily_routine_after: plan.daily_routine_after ?? null,
  };
}

function TradingPlanPage() {
  const [draft, setDraft] = useState<TradingPlanDraft>(blankPlan);
  const [savedDraft, setSavedDraft] = useState<TradingPlanDraft>(blankPlan);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [numericFieldsValid, setNumericFieldsValid] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;

        const plan = await getTradingPlan({ headers: { Authorization: `Bearer ${token}` } });
        if (!active) return;

        if (plan) {
          const loadedDraft = toDraft(plan);
          setDraft(loadedDraft);
          setSavedDraft(loadedDraft);
          setLastSavedAt(plan.updated_at);
          setExists(true);
        }
      } catch (error) {
        console.error("Unable to load the trading plan.", error);
        if (active) {
          toast.error("We could not load your Trading Plan.");
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const set = <K extends keyof TradingPlanDraft>(key: K, value: TradingPlanDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (!numericFieldsValid) {
      toast.error("Review the highlighted numeric fields before saving.");
      return;
    }
    const payload = {
      ...draft,
      preferred_market: draft.preferred_markets[0] ?? draft.preferred_market,
      preferred_session: draft.preferred_sessions[0] ?? draft.preferred_session,
      psychology_rules: draft.psychology_rules_list
        .map((rule) => rule.trim())
        .filter(Boolean)
        .join("\n"),
      // Keep the original column populated for backwards compatibility with the first release.
      daily_routine: draft.daily_routine_before ?? draft.daily_routine ?? null,
    };
    const parsed = tradingPlanSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Review your plan details.");
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    setSaving(true);
    const operation = exists ? "update" : "create";
    try {
      const plan = exists
        ? await updateTradingPlan({
            data: parsed.data,
            headers: { Authorization: `Bearer ${token}` },
          })
        : await createTradingPlan({
            data: parsed.data,
            headers: { Authorization: `Bearer ${token}` },
          });

      const savedDraft = toDraft(plan);
      setDraft(savedDraft);
      setSavedDraft(savedDraft);
      setLastSavedAt(plan.updated_at);
      setExists(true);
      setSaved(true);
      toast.success(exists ? "Trading plan updated." : "Trading plan saved.");
    } catch (error) {
      console.error("Trading Plan save failed.", { operation, error });
      toast.error(error instanceof Error ? error.message : "We could not save your Trading Plan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TradingPlanSkeleton />;

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Target className="mx-auto h-10 w-10 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-bold">Trading Plan unavailable</h1>
        <p className="mt-3 text-muted-foreground">
          We could not load your workspace. Please refresh the page and try again.
        </p>
      </main>
    );
  }

  const valid =
    numericFieldsValid &&
    tradingPlanSchema.safeParse({
      ...draft,
      preferred_market: draft.preferred_markets[0] ?? draft.preferred_market,
      preferred_session: draft.preferred_sessions[0] ?? draft.preferred_session,
      psychology_rules: draft.psychology_rules_list
        .map((rule) => rule.trim())
        .filter(Boolean)
        .join("\n"),
      daily_routine: draft.daily_routine_before ?? draft.daily_routine ?? null,
    }).success;
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const { completedCount, requiredCount, percentage } = getPlanCompletion(draft);
  const status = saving
    ? "saving"
    : hasChanges
      ? exists
        ? "unsaved"
        : "draft"
      : exists
        ? percentage === 100
          ? "complete"
          : "saved"
        : "draft";

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <TradingPlanHeader
        draft={draft}
        percentage={percentage}
        completedCount={completedCount}
        requiredCount={requiredCount}
        lastSavedAt={lastSavedAt}
        status={status}
      />

      {!exists && !showForm ? (
        <EmptyTradingPlan onCreate={() => setShowForm(true)} />
      ) : (
        <TradingPlanForm
          draft={draft}
          saving={saving}
          saved={saved}
          hasChanges={hasChanges}
          valid={valid}
          lastSavedAt={lastSavedAt}
          setDraft={set}
          onNumericValidityChange={setNumericFieldsValid}
          onSave={() => void save()}
        />
      )}
    </main>
  );
}

function EmptyTradingPlan({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="glass mt-8 rounded-3xl px-6 py-14 text-center shadow-elegant sm:px-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/10 text-gold">
        <Target className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold">Build your first Trading Plan</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Set your market preferences, risk limits and routine before your next trading session.
      </p>
      <Button
        onClick={onCreate}
        className="mt-6 bg-gradient-gold text-primary-foreground shadow-glow"
      >
        <Plus /> Create trading plan
      </Button>
    </section>
  );
}

function TradingPlanSkeleton() {
  return (
    <main
      className="mx-auto max-w-6xl space-y-5 px-4 py-16"
      aria-busy="true"
      aria-label="Loading Trading Plan"
    >
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="h-10 w-72 animate-pulse rounded bg-muted" />
      <div className="glass h-56 animate-pulse rounded-3xl" />
      <div className="glass h-48 animate-pulse rounded-3xl" />
    </main>
  );
}
