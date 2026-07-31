import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tradingPlanSchema, type TradingPlan } from "@/lib/trading-plan";

const table = (client: unknown) => client as SupabaseClient;
type SupabaseError = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

function fail(action: "load" | "create" | "update", error: SupabaseError): never {
  console.error("Trading Plan database operation failed.", {
    action,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  if (error.code === "PGRST204" || error.code === "42703") {
    throw new Error("Trading Plan setup is incomplete. Please contact support.");
  }
  if (error.code === "42501") {
    throw new Error("You do not have permission to save this Trading Plan.");
  }
  throw new Error(`We could not ${action} your Trading Plan. Please try again.`);
}

export const getTradingPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await table(context.supabase)
      .from("trading_plans")
      .select("*")
      .maybeSingle();
    if (error) fail("load", error);
    return data as TradingPlan | null;
  });
export const createTradingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(tradingPlanSchema)
  .handler(async ({ data, context }) => {
    const { data: plan, error } = await table(context.supabase)
      .from("trading_plans")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) fail("create", error);
    return plan as TradingPlan;
  });
export const updateTradingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(tradingPlanSchema)
  .handler(async ({ data, context }) => {
    const { data: plan, error } = await table(context.supabase)
      .from("trading_plans")
      .update(data)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) fail("update", error);
    return plan as TradingPlan;
  });
