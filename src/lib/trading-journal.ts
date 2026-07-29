import { z } from "zod";

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

const optionalNonNegativeNumber = z.number().finite().nonnegative().nullable().optional();
const optionalText = z.string().trim().max(5_000).nullable().optional();

export const tradingJournalEntrySchema = z.object({
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
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
});

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

export function hasOwnedJournalScreenshotPath(path: string | null | undefined, userId: string) {
  return !path || path.startsWith(`${userId}/`);
}

export function humanizeJournalValue(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function summarizeJournalEntries(
  entries: Pick<TradingJournalEntry, "profit_loss" | "result">[],
) {
  return entries.reduce(
    (summary, entry) => {
      const profitLoss = Number(entry.profit_loss ?? 0);
      summary.pnl += profitLoss;
      summary.wins += entry.result === "win" ? 1 : 0;
      summary.losses += entry.result === "loss" ? 1 : 0;
      summary.grossProfit += Math.max(profitLoss, 0);
      summary.grossLoss += Math.abs(Math.min(profitLoss, 0));
      return summary;
    },
    { pnl: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0 },
  );
}
