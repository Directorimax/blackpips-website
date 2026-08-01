import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  hasOwnedJournalScreenshotPath,
  normalizeJournalProfitLoss,
  tradingJournalEntrySchema,
  tradingJournalEntryPatchSchema,
  tradingJournalIdSchema,
  tradingJournalListSchema,
  tradingJournalMonthSchema,
  type TradingJournalEntry,
} from "@/lib/trading-journal";

const journalUpdateInputSchema = z
  .object({ id: z.string().uuid() })
  .merge(tradingJournalEntryPatchSchema)
  .refine(
    (entry) => Object.keys(entry).some((key) => key !== "id"),
    "Provide at least one field to update.",
  );

function journalTableClient(client: unknown) {
  return client as SupabaseClient;
}

function assertOwnedScreenshotPaths(
  values: { before_image_url?: string | null; after_image_url?: string | null },
  userId: string,
) {
  if (
    !hasOwnedJournalScreenshotPath(values.before_image_url, userId) ||
    !hasOwnedJournalScreenshotPath(values.after_image_url, userId)
  ) {
    throw new Error("Journal screenshot paths must belong to the authenticated user.");
  }
}

function throwJournalError(action: string, error: { message: string }) {
  console.error(`Trading journal ${action} failed:`, error.message);
  throw new Error(`We could not ${action} this journal entry. Please try again.`);
}

export const createTradingJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(tradingJournalEntrySchema)
  .handler(async ({ data, context }) => {
    assertOwnedScreenshotPaths(data, context.userId);
    const normalizedData = {
      ...data,
      profit_loss: normalizeJournalProfitLoss(data.result, data.profit_loss),
    };
    const { data: entry, error } = await journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .insert({ ...normalizedData, user_id: context.userId })
      .select()
      .single();
    if (error) throwJournalError("create", error);
    return entry as TradingJournalEntry;
  });

export const updateTradingJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(journalUpdateInputSchema)
  .handler(async ({ data, context }) => {
    const { id, ...changes } = data;
    assertOwnedScreenshotPaths(changes, context.userId);
    const { data: existing, error: existingError } = await journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .select("result, profit_loss")
      .eq("id", id)
      .single();
    if (existingError) throwJournalError("load", existingError);
    if (!existing) throw new Error("Journal entry no longer exists.");

    const result = changes.result ?? existing.result;
    const profitLoss = changes.profit_loss ?? existing.profit_loss;
    const normalizedChanges = {
      ...changes,
      profit_loss: normalizeJournalProfitLoss(result, profitLoss),
    };
    const { data: entry, error } = await journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .update(normalizedChanges)
      .eq("id", id)
      .select()
      .single();
    if (error) throwJournalError("update", error);
    return entry as TradingJournalEntry;
  });

export const deleteTradingJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(tradingJournalIdSchema)
  .handler(async ({ data, context }) => {
    const { error } = await journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .delete()
      .eq("id", data.id);
    if (error) throwJournalError("delete", error);
    return { deleted: true };
  });

export const getTradingJournalEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(tradingJournalIdSchema)
  .handler(async ({ data, context }) => {
    const { data: entry, error } = await journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .select()
      .eq("id", data.id)
      .single();
    if (error) throwJournalError("load", error);
    return entry as TradingJournalEntry;
  });

export const getUserTradingJournalEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(tradingJournalListSchema)
  .handler(async ({ data, context }) => {
    let query = journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .select("*", { count: "exact" })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.search) {
      const search = data.search.replace(/[,%()]/g, " ");
      query = query.or(
        `pair.ilike.%${search}%,strategy.ilike.%${search}%,notes.ilike.%${search}%,tags.cs.{${search}}`,
      );
    }
    if (data.result) query = query.eq("result", data.result);
    if (data.direction) query = query.eq("direction", data.direction);
    if (data.market_type) query = query.eq("market_type", data.market_type);
    if (data.session) query = query.eq("session", data.session);
    if (data.pair) query = query.ilike("pair", `%${data.pair.replace(/[%_]/g, "")}%`);
    if (data.start_date) query = query.gte("trade_at", data.start_date);
    if (data.end_date) query = query.lte("trade_at", data.end_date);

    const [orderColumn, ascending] =
      data.sort === "highest_profit"
        ? ["profit_loss", false]
        : data.sort === "largest_loss"
          ? ["profit_loss", true]
          : data.sort === "highest_rr"
            ? ["risk_reward_ratio", false]
            : ["trade_at", data.sort !== "oldest"];
    const { data: entries, error, count } = await query.order(orderColumn, { ascending });
    if (error) throwJournalError("load", error);
    return { entries: (entries ?? []) as TradingJournalEntry[], total: count ?? 0 };
  });

/** A bounded, month-scoped read for calendar aggregates. RLS still scopes it to its owner. */
export const getTradingJournalMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(tradingJournalMonthSchema)
  .handler(async ({ data, context }) => {
    let query = journalTableClient(context.supabase)
      .from("trading_journal_entries")
      .select("*")
      .gte("trade_at", data.start_date)
      .lt("trade_at", data.end_date)
      .order("trade_at", { ascending: true });
    if (data.search) {
      const search = data.search.replace(/[,%()]/g, " ");
      query = query.or(
        `pair.ilike.%${search}%,strategy.ilike.%${search}%,notes.ilike.%${search}%,tags.cs.{${search}}`,
      );
    }
    if (data.result) query = query.eq("result", data.result);
    if (data.direction) query = query.eq("direction", data.direction);
    if (data.market_type) query = query.eq("market_type", data.market_type);
    if (data.session) query = query.eq("session", data.session);
    if (data.pair) query = query.ilike("pair", `%${data.pair.replace(/[%_]/g, "")}%`);
    const { data: entries, error } = await query;
    if (error) throwJournalError("load calendar", error);
    return (entries ?? []) as TradingJournalEntry[];
  });
