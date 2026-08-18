import { z } from "zod";
import { sanitizePlainText } from "@/lib/text-security";

export const journalMarketTypes = [
  "forex",
  "metals",
  "indices",
  "energy",
  "crypto",
  "other",
] as const;
export const journalDirections = ["long", "short"] as const;
export const journalSessions = [
  "asian",
  "london",
  "new_york",
  "london_new_york_overlap",
  "other",
] as const;
export const journalResults = ["win", "loss", "breakeven"] as const;
export type JournalResult = (typeof journalResults)[number];

export const journalResultConfig: Record<JournalResult, { label: string; badgeClassName: string }> =
  {
    win: { label: "Win", badgeClassName: "bg-bull/15 text-bull" },
    loss: { label: "Loss", badgeClassName: "bg-bear/15 text-bear" },
    breakeven: { label: "Break Even", badgeClassName: "bg-muted text-muted-foreground" },
  };

const optionalNonNegativeNumber = z.number().finite().nonnegative().nullable().optional();
const safeText = z.string().trim().max(5_000).transform(sanitizePlainText);
const optionalText = safeText.nullable().optional();

export const tradingJournalEntrySchema = z
  .object({
    trade_at: z.string().datetime(),
    pair: z
      .string()
      .trim()
      .min(1)
      .max(24)
      .transform((value) => value.toUpperCase()),
    market_type: z.enum(journalMarketTypes),
    direction: z.enum(journalDirections),
    timeframe: z.string().trim().min(1).max(32),
    strategy: z.string().trim().min(1).max(120),
    session: z.enum(journalSessions),
    entry_price: optionalNonNegativeNumber,
    stop_loss: optionalNonNegativeNumber,
    take_profit: optionalNonNegativeNumber,
    exit_price: optionalNonNegativeNumber,
    lot_size: z.number().finite().positive().max(10_000),
    risk_percent: optionalNonNegativeNumber,
    reward_percent: optionalNonNegativeNumber,
    risk_reward_ratio: optionalNonNegativeNumber,
    result: z.enum(journalResults),
    profit_loss: z.number().finite().nullable().optional(),
    emotion_before: optionalText,
    emotion_after: optionalText,
    confidence: z.number().int().min(1).max(5).nullable().optional(),
    mistakes: optionalText,
    lessons: optionalText,
    notes: optionalText,
    before_image_url: z.string().trim().max(512).nullable().optional(),
    after_image_url: z.string().trim().max(512).nullable().optional(),
    tags: z
      .array(z.string().trim().min(1).max(30).transform(sanitizePlainText))
      .max(20)
      .default([]),
  })
  .strict();

export const tradingJournalEntryPatchSchema = tradingJournalEntrySchema.partial();

export const tradingJournalEntryUpdateSchema = tradingJournalEntryPatchSchema.refine(
  (entry) => Object.keys(entry).length > 0,
  "Provide at least one field to update.",
);

export const tradingJournalIdSchema = z.object({ id: z.string().uuid() });
export const tradingJournalListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  search: z.string().trim().max(100).optional(),
  result: z.enum(journalResults).optional(),
  direction: z.enum(journalDirections).optional(),
  market_type: z.enum(journalMarketTypes).optional(),
  session: z.enum(journalSessions).optional(),
  pair: z.string().trim().max(24).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  sort: z
    .enum(["newest", "oldest", "highest_profit", "largest_loss", "highest_rr"])
    .default("newest"),
});

export const tradingJournalMonthSchema = tradingJournalListSchema
  .pick({
    search: true,
    result: true,
    direction: true,
    market_type: true,
    session: true,
    pair: true,
  })
  .extend({ start_date: z.string().datetime(), end_date: z.string().datetime() });

export type TradingJournalEntryInput = z.output<typeof tradingJournalEntrySchema>;
export type TradingJournalEntryUpdate = z.output<typeof tradingJournalEntryUpdateSchema>;
export type TradingJournalEntry = TradingJournalEntryInput & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export function isJournalResult(value: string): value is JournalResult {
  return journalResults.includes(value as JournalResult);
}

export function normalizeJournalProfitLoss(
  result: JournalResult,
  amount: number | null | undefined,
) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value) || result === "breakeven") return 0;

  return result === "loss" ? -Math.abs(value) : Math.abs(value);
}

export function hasOwnedJournalScreenshotPath(path: string | null | undefined, userId: string) {
  return !path || path.startsWith(`${userId}/`);
}

export function humanizeJournalValue(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type RiskRewardParseResult =
  { valid: true; value: number | null } | { valid: false; value: null };

/** Converts numeric or trader-style risk:reward input to the numeric DB ratio. */
export function parseRiskReward(input: string): RiskRewardParseResult {
  const value = input.trim();
  if (!value) return { valid: true, value: null };

  const colonMatch = value.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (colonMatch) {
    const risk = Number(colonMatch[1]);
    const reward = Number(colonMatch[2]);
    if (risk > 0 && reward > 0) return { valid: true, value: reward / risk };
    return { valid: false, value: null };
  }

  if (!/^\d+(?:\.\d+)?$/.test(value)) return { valid: false, value: null };
  const numeric = Number(value);
  return numeric > 0 && Number.isFinite(numeric)
    ? { valid: true, value: numeric }
    : { valid: false, value: null };
}

/** Numeric historical records are presented in consistent 1:reward notation. */
export function formatRiskReward(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `1:${Number(value)}`;
}

export function removeJournalEntryById<T extends { id: string }>(entries: T[], id: string) {
  return entries.filter((entry) => entry.id !== id);
}

export function summarizeJournalEntries(
  entries: Pick<TradingJournalEntry, "profit_loss" | "result">[],
) {
  return entries.reduce(
    (summary, entry) => {
      const profitLoss = normalizeJournalProfitLoss(entry.result, entry.profit_loss);
      summary.pnl += profitLoss;
      summary.wins += entry.result === "win" ? 1 : 0;
      summary.losses += entry.result === "loss" ? 1 : 0;
      summary.breakEvens += entry.result === "breakeven" ? 1 : 0;
      summary.grossProfit += Math.max(profitLoss, 0);
      summary.grossLoss += Math.abs(Math.min(profitLoss, 0));
      return summary;
    },
    { pnl: 0, wins: 0, losses: 0, breakEvens: 0, grossProfit: 0, grossLoss: 0 },
  );
}
