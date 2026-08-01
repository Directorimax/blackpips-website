import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Image,
  ImagePlus,
  Loader2,
  Minus,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  JournalDatePicker,
  JournalDateTimePicker,
  JournalInstrumentSelect,
  JournalSelect,
} from "@/components/trading-journal/JournalControls";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  journalDirections,
  journalMarketTypes,
  journalResultConfig,
  journalResults,
  journalSessions,
  isJournalResult,
  normalizeJournalProfitLoss,
  summarizeJournalEntries,
  tradingJournalEntrySchema,
  humanizeJournalValue,
  type JournalResult,
  type TradingJournalEntry,
} from "@/lib/trading-journal";
import { extensionForImageMime, validateImageFile } from "@/lib/upload-security";
import {
  createTradingJournalEntry,
  deleteTradingJournalEntry,
  getUserTradingJournalEntries,
  getTradingJournalMonth,
  updateTradingJournalEntry,
} from "@/services/trading-journal/trading-journal.functions";

export const Route = createFileRoute("/tools/trading-journal")({
  head: () => ({
    meta: [
      { title: "Trading Journal — BlackPips" },
      { name: "description", content: "Record, review and improve your trading decisions." },
    ],
  }),
  component: TradingJournalPage,
});

const PAGE_SIZE = 10;
const emptyDraft = () => ({
  trade_at: new Date().toISOString().slice(0, 16),
  pair: "EURUSD",
  market_type: "forex",
  direction: "long",
  timeframe: "H1",
  strategy: "",
  session: "london",
  entry_price: "",
  stop_loss: "",
  take_profit: "",
  exit_price: "",
  lot_size: "0.01",
  risk_percent: "",
  reward_percent: "",
  risk_reward_ratio: "",
  result: "breakeven",
  profit_loss: "",
  emotion_before: "",
  emotion_after: "",
  confidence: "",
  mistakes: "",
  lessons: "",
  notes: "",
  tags: "",
});
type Draft = ReturnType<typeof emptyDraft>;
type ScreenshotState = {
  file: File | null;
  existingKey: string | null;
  removed: boolean;
  preview: string | null;
};
type Filters = {
  search: string;
  result: string;
  direction: string;
  market_type: string;
  session: string;
  pair: string;
  start_date: string;
  end_date: string;
  sort: "newest" | "oldest" | "highest_profit" | "largest_loss" | "highest_rr";
};
const defaultFilters: Filters = {
  search: "",
  result: "",
  direction: "",
  market_type: "",
  session: "",
  pair: "",
  start_date: "",
  end_date: "",
  sort: "newest",
};

function TradingJournalPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<TradingJournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchDraft, setSearchDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TradingJournalEntry | null | undefined>(undefined);
  const [viewing, setViewing] = useState<TradingJournalEntry | null>(null);
  const [view, setView] = useState<"calendar" | "list">(() =>
    typeof window === "undefined"
      ? "calendar"
      : (window.sessionStorage.getItem("blackpips-journal-view") as "calendar" | "list") ||
        "calendar",
  );
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [monthEntries, setMonthEntries] = useState<TradingJournalEntry[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [newTradeDate, setNewTradeDate] = useState<Date | null>(null);
  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters });
    setSearchDraft("");
    setPage(0);
    setSelectedDay(null);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchDraft }));
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setIsLoading(false);
      return;
    }
    try {
      const queryFilters = Object.fromEntries(
        Object.entries(filters)
          .filter(([, value]) => value !== "")
          .map(([key, value]) =>
            key === "start_date" || key === "end_date"
              ? [
                  key,
                  new Date(
                    `${value}T${key === "end_date" ? "23:59:59" : "00:00:00"}`,
                  ).toISOString(),
                ]
              : [key, value],
          ),
      );
      const result = await getUserTradingJournalEntries({
        data: {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          ...queryFilters,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (loadError) {
      console.error("Trading journal load failed:", loadError);
      setError("We could not load your journal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, user]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    window.sessionStorage.setItem("blackpips-journal-view", view);
  }, [view]);
  const loadMonth = useCallback(async () => {
    if (!user) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    setIsCalendarLoading(true);
    try {
      const result = await getTradingJournalMonth({
        data: {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          ...Object.fromEntries(
            Object.entries(filters).filter(
              ([key, value]) => !["sort", "start_date", "end_date"].includes(key) && value !== "",
            ),
          ),
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setMonthEntries(result);
    } catch (calendarError) {
      console.error("Trading journal calendar load failed:", calendarError);
      toast.error("We could not load this month of your journal.");
    } finally {
      setIsCalendarLoading(false);
    }
  }, [calendarMonth, filters, user]);
  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);
  const summary = useMemo(() => {
    const totals = summarizeJournalEntries(entries);
    return {
      total: entries.length,
      win: totals.wins,
      loss: totals.losses,
      breakeven: totals.breakEvens,
      pnl: totals.pnl,
    };
  }, [entries]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading)
    return (
      <main className="mx-auto max-w-7xl px-4 py-24">
        <div className="glass h-64 animate-pulse rounded-3xl" />
      </main>
    );
  if (!user)
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <NotebookPen className="mx-auto h-10 w-10 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-bold">Your Trading Journal</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to securely record and review your trades.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ redirect: "/tools/trading-journal" }}>
            Sign in to continue
          </Link>
        </Button>
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
            <NotebookPen className="h-4 w-4" /> TRADER TOOLS
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Trading Journal</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Build clarity through deliberate review of every trading decision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div
            className="flex rounded-xl border border-border bg-card p-1"
            role="group"
            aria-label="Journal view"
          >
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
            >
              <CalendarDays /> Calendar
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <NotebookPen /> List
            </Button>
          </div>
          <Button
            onClick={() => setEditing(null)}
            className="bg-gradient-gold text-primary-foreground shadow-glow"
          >
            <Plus /> New Trade
          </Button>
        </div>
      </header>
      <section
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        aria-label="Journal summary"
      >
        <Summary label="Total Trades" value={total} />
        <Summary label="Wins" value={summary.win} tone="positive" />
        <Summary label="Losses" value={summary.loss} tone="negative" />
        <Summary label="Break Even" value={summary.breakeven} />
        <Summary
          label="Win Rate"
          value={summary.total ? `${Math.round((summary.win / summary.total) * 100)}%` : "0%"}
        />
        <Summary
          label="Total P/L"
          value={`${summary.pnl > 0 ? "+" : ""}$${summary.pnl.toFixed(2)}`}
          tone={summary.pnl > 0 ? "positive" : summary.pnl < 0 ? "negative" : undefined}
        />
      </section>
      <section className="glass mt-8 rounded-3xl p-4 sm:p-5">
        <div className="grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.6fr)_repeat(5,minmax(8rem,1fr))]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search instrument, strategy, notes or tags"
              className="h-10 pl-10"
            />
          </label>
          <FilterInput
            label="Result"
            value={filters.result}
            options={journalResults}
            onChange={(result) => {
              setFilters((current) => ({ ...current, result }));
              setPage(0);
            }}
            allOptionLabel="All Results"
          />
          <FilterInput
            label="Direction"
            value={filters.direction}
            options={journalDirections}
            onChange={(direction) => {
              setFilters((current) => ({ ...current, direction }));
              setPage(0);
            }}
            allOptionLabel="All Directions"
          />
          <FilterInput
            label="Market"
            value={filters.market_type}
            options={journalMarketTypes}
            onChange={(market_type) => {
              setFilters((current) => ({ ...current, market_type }));
              setPage(0);
            }}
            allOptionLabel="All Markets"
          />
          <FilterInput
            label="Session"
            value={filters.session}
            options={journalSessions}
            onChange={(session) => {
              setFilters((current) => ({ ...current, session }));
              setPage(0);
            }}
            allOptionLabel="All Sessions"
          />
          <FilterInput
            label="Sort"
            value={filters.sort}
            options={["newest", "oldest", "highest_profit", "largest_loss", "highest_rr"]}
            onChange={(sort) => {
              setFilters((current) => ({ ...current, sort: sort as Filters["sort"] }));
              setPage(0);
            }}
          />
        </div>
        <div className="mt-3 grid items-center gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,auto)_minmax(10rem,auto)_2.5rem]">
          <JournalInstrumentSelect
            label="Instrument"
            value={filters.pair}
            clearable
            className="w-full"
            onChange={(pair) => {
              setFilters((current) => ({ ...current, pair }));
              setPage(0);
            }}
          />
          <JournalDatePicker
            value={filters.start_date}
            onChange={(start_date) => {
              setFilters((current) => ({ ...current, start_date }));
              setPage(0);
            }}
            label="Start date"
            className="w-full"
          />
          <JournalDatePicker
            value={filters.end_date}
            onChange={(end_date) => {
              setFilters((current) => ({ ...current, end_date }));
              setPage(0);
            }}
            label="End date"
            className="w-full"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={resetFilters}
                aria-label="Reset all filters"
                className="h-10 w-10 border-gold/40 text-gold hover:border-gold hover:bg-gold/10 hover:text-gold focus-visible:ring-gold"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset all filters</TooltipContent>
          </Tooltip>
        </div>
      </section>
      {error ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : view === "calendar" ? (
        <JournalCalendar
          month={calendarMonth}
          entries={monthEntries}
          loading={isCalendarLoading}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onPrevious={() =>
            setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))
          }
          onNext={() =>
            setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))
          }
          onToday={() =>
            setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
          }
          onView={setViewing}
          onEdit={setEditing}
          onNew={(date) => {
            setNewTradeDate(date);
            setEditing(null);
          }}
        />
      ) : isLoading ? (
        <div className="mt-6 grid gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="glass h-20 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : entries.length ? (
        <TradeList
          entries={entries}
          onView={setViewing}
          onEdit={setEditing}
          onDelete={async (entry) => {
            await removeTrade(entry, user.id);
            await load();
          }}
        />
      ) : (
        <div className="glass mt-6 rounded-3xl p-10 text-center">
          <NotebookPen className="mx-auto h-9 w-9 text-gold" />
          <h2 className="mt-4 font-display text-xl font-semibold">
            {total ? "No matching trades" : "Your journal is ready"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {total
              ? "Adjust or reset your filters to see trades."
              : "Record your first trade to make your review process deliberate."}
          </p>
          <Button className="mt-5" onClick={() => (total ? resetFilters() : setEditing(null))}>
            {total ? "Reset filters" : "Add your first trade"}
          </Button>
        </div>
      )}
      {total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {pages}
          </span>
          <Button
            variant="outline"
            disabled={page + 1 >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next <ChevronRight />
          </Button>
        </div>
      )}
      <AnimatePresence>
        {editing !== undefined && (
          <TradeEditor
            entry={editing}
            userId={user.id}
            initialDate={newTradeDate ?? undefined}
            onClose={() => setEditing(undefined)}
            onSaved={async () => {
              setEditing(undefined);
              setNewTradeDate(null);
              await load();
              await loadMonth();
            }}
          />
        )}
        {viewing && (
          <TradeDetails
            entry={viewing}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setViewing(null);
              setEditing(viewing);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-display text-xl font-bold ${tone === "positive" ? "text-bull" : tone === "negative" ? "text-bear" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
function FilterInput({
  label,
  value,
  options,
  onChange,
  allOptionLabel,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  allOptionLabel?: string;
}) {
  return (
    <JournalSelect
      ariaLabel={label}
      value={value}
      options={options}
      onChange={onChange}
      placeholder={`All ${label === "Market" ? "Markets" : `${label}s`}`}
      clearable
      allOptionLabel={allOptionLabel}
    />
  );
}
function TradeList({
  entries,
  onView,
  onEdit,
  onDelete,
}: {
  entries: TradingJournalEntry[];
  onView: (entry: TradingJournalEntry) => void;
  onEdit: (entry: TradingJournalEntry) => void;
  onDelete: (entry: TradingJournalEntry) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<TradingJournalEntry | null>(null);
  return (
    <section className="mt-6 space-y-3">
      <div className="journal-scrollbar hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <div className="min-w-[1050px]">
          <div className="sticky top-0 z-10 grid grid-cols-[.9fr_1fr_.85fr_.8fr_1.2fr_.8fr_.8fr_.8fr_.8fr_.7fr_.55fr_.8fr_.55fr_.7fr] gap-3 border-b border-border bg-card px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {[
              "Pair",
              "Trade date",
              "Trade type",
              "Session",
              "Strategy",
              "Entry",
              "Stop loss",
              "Take profit",
              "Exit",
              "Result",
              "RR",
              "P/L",
              "Shots",
              "Actions",
            ].map((heading) => (
              <span key={heading}>{heading}</span>
            ))}
          </div>
          {entries.map((entry) => (
            <DesktopTradeRow
              key={entry.id}
              entry={entry}
              onView={onView}
              onEdit={onEdit}
              onConfirmDelete={setConfirming}
              deleting={deleting === entry.id}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <article key={entry.id} className="glass grid gap-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">{entry.pair}</p>
              <Badge value={entry.result} />
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
              <MobileRow label="Trade date" value={new Date(entry.trade_at).toLocaleDateString()} />
              <MobileRow label="Trade type" value={<Badge value={entry.direction} />} />
              <MobileRow label="Session" value={entry.session.replaceAll("_", " ")} />
              <MobileRow label="Strategy" value={entry.strategy || "—"} />
              <MobileRow
                label="P/L"
                value={<Pnl value={entry.profit_loss} result={entry.result} />}
              />
              <MobileRow label="RR" value={entry.risk_reward_ratio ?? "—"} />
            </div>
            <TradeActions
              entry={entry}
              onView={onView}
              onEdit={onEdit}
              onConfirmDelete={setConfirming}
              deleting={deleting === entry.id}
            />
          </article>
        ))}
      </div>
      <Dialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && !deleting && setConfirming(null)}
      >
        <DialogContent className="max-w-md rounded-3xl bg-card">
          <DialogHeader>
            <DialogTitle>Delete {confirming?.pair} trade?</DialogTitle>
            <DialogDescription>
              This permanently removes the trade and its private screenshots. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={Boolean(deleting)}
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!confirming || Boolean(deleting)}
              onClick={async () => {
                if (!confirming) return;
                setDeleting(confirming.id);
                try {
                  await onDelete(confirming);
                  toast.success("Trade deleted.");
                  setConfirming(null);
                } catch {
                  toast.error("We could not delete this trade.");
                } finally {
                  setDeleting(null);
                }
              }}
            >
              {deleting && <Loader2 className="animate-spin" />}Delete trade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function MobileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate capitalize">{value}</div>
    </div>
  );
}
function Pnl({ value, result }: { value: number | null | undefined; result?: JournalResult }) {
  const amount = result ? normalizeJournalProfitLoss(result, value) : Number(value ?? 0);
  return (
    <span
      className={
        amount > 0
          ? "font-semibold text-bull"
          : amount < 0
            ? "font-semibold text-bear"
            : "font-semibold"
      }
    >
      {amount > 0 ? "+" : ""}${amount.toFixed(2)}
    </span>
  );
}
function TradeActions({
  entry,
  onView,
  onEdit,
  onConfirmDelete,
  deleting,
}: {
  entry: TradingJournalEntry;
  onView: (entry: TradingJournalEntry) => void;
  onEdit: (entry: TradingJournalEntry) => void;
  onConfirmDelete: (entry: TradingJournalEntry) => void;
  deleting: boolean;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onView(entry)}
        aria-label={`View ${entry.pair}`}
      >
        <NotebookPen />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onEdit(entry)}
        aria-label={`Edit ${entry.pair}`}
      >
        <Pencil />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={deleting}
        onClick={() => onConfirmDelete(entry)}
        aria-label={`Delete ${entry.pair}`}
      >
        <Trash2 className="text-destructive" />
      </Button>
    </div>
  );
}
function DesktopTradeRow({
  entry,
  onView,
  onEdit,
  onConfirmDelete,
  deleting,
}: {
  entry: TradingJournalEntry;
  onView: (entry: TradingJournalEntry) => void;
  onEdit: (entry: TradingJournalEntry) => void;
  onConfirmDelete: (entry: TradingJournalEntry) => void;
  deleting: boolean;
}) {
  return (
    <div className="grid grid-cols-[.9fr_1fr_.85fr_.8fr_1.2fr_.8fr_.8fr_.8fr_.8fr_.7fr_.55fr_.8fr_.55fr_.7fr] items-center gap-3 border-b border-border/70 px-4 py-3 text-sm last:border-0">
      <strong>{entry.pair}</strong>
      <span>{new Date(entry.trade_at).toLocaleDateString()}</span>
      <Badge value={entry.direction} />
      <span className="capitalize">{entry.session.replaceAll("_", " ")}</span>
      <span className="truncate">{entry.strategy || "—"}</span>
      <span>{entry.entry_price ?? "—"}</span>
      <span>{entry.stop_loss ?? "—"}</span>
      <span>{entry.take_profit ?? "—"}</span>
      <span>{entry.exit_price ?? "—"}</span>
      <Badge value={entry.result} />
      <span>{entry.risk_reward_ratio ?? "—"}</span>
      <Pnl value={entry.profit_loss} result={entry.result} />
      <span>
        {entry.before_image_url || entry.after_image_url ? (
          <Image className="h-4 w-4 text-gold" aria-label="Screenshots attached" />
        ) : (
          "—"
        )}
      </span>
      <TradeActions
        entry={entry}
        onView={onView}
        onEdit={onEdit}
        onConfirmDelete={onConfirmDelete}
        deleting={deleting}
      />
    </div>
  );
}
function Badge({ value }: { value: string }) {
  if (isJournalResult(value)) {
    const config = journalResultConfig[value];
    return (
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${config.badgeClassName}`}
      >
        {config.label}
      </span>
    );
  }

  const tone = value === "long" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear";
  return (
    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function JournalCalendar({
  month,
  entries,
  loading,
  selectedDay,
  onSelectDay,
  onPrevious,
  onNext,
  onToday,
  onView,
  onEdit,
  onNew,
}: {
  month: Date;
  entries: TradingJournalEntry[];
  loading: boolean;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onView: (entry: TradingJournalEntry) => void;
  onEdit: (entry: TradingJournalEntry) => void;
  onNew: (date: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const keyOf = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const byDay = entries.reduce<Record<string, TradingJournalEntry[]>>((map, entry) => {
    const key = keyOf(new Date(entry.trade_at));
    (map[key] ??= []).push(entry);
    return map;
  }, {});
  const summary = summarizeJournalEntries(entries);
  const selectedEntries = selectedDay ? (byDay[selectedDay] ?? []) : [];
  const best = Object.entries(byDay).sort(
    ([, a], [, b]) => summarizeJournalEntries(b).pnl - summarizeJournalEntries(a).pnl,
  )[0];
  const todayKey = keyOf(new Date());
  return (
    <section className="mt-6 space-y-4">
      <div className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onPrevious} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <div className="min-w-44 text-center">
              <h2 className="font-display text-xl font-semibold">
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
              <button
                type="button"
                onClick={onToday}
                className="text-xs font-semibold text-gold hover:underline"
              >
                Today
              </button>
            </div>
            <Button variant="outline" size="icon" onClick={onNext} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-5">
            <CalendarMetric label="Monthly P/L" value={<Pnl value={summary.pnl} />} />
            <CalendarMetric label="Trades" value={entries.length} />
            <CalendarMetric
              label="Win rate"
              value={entries.length ? `${Math.round((summary.wins / entries.length) * 100)}%` : "—"}
            />
            <CalendarMetric
              label="Profit factor"
              value={
                summary.grossLoss
                  ? (summary.grossProfit / summary.grossLoss).toFixed(2)
                  : summary.grossProfit
                    ? "∞"
                    : "—"
              }
            />
            <CalendarMetric
              label="Best day"
              value={
                best
                  ? new Date(`${best[0]}T12:00:00`).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"
              }
            />
          </div>
        </div>
      </div>
      <div className="journal-scrollbar overflow-x-auto rounded-3xl border border-border bg-card">
        <div className="min-w-[680px] p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((date) => {
              const key = keyOf(date);
              const daily = byDay[key] ?? [];
              const dailySummary = summarizeJournalEntries(daily);
              const pnl = dailySummary.pnl;
              const wins = dailySummary.wins;
              const losses = dailySummary.losses;
              const current = date.getMonth() === month.getMonth();
              const active = selectedDay === key;
              const tone =
                pnl > 0
                  ? "border-bull/35 bg-bull/8"
                  : pnl < 0
                    ? "border-bear/35 bg-bear/8"
                    : "border-border bg-background/40";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDay(key)}
                  className={`min-h-25 rounded-xl border p-2 text-left transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone} ${!current ? "opacity-40" : ""} ${active ? "ring-2 ring-gold" : ""}`}
                >
                  <div className="flex justify-between">
                    <span
                      className={
                        key === todayKey
                          ? "grid h-6 w-6 place-items-center rounded-full bg-gold text-primary-foreground"
                          : ""
                      }
                    >
                      {date.getDate()}
                    </span>
                    {daily.length ? (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {daily.length} trade{daily.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  {daily.length ? (
                    <div className="mt-3 space-y-1 text-xs">
                      <Pnl value={pnl} />
                      <p className="text-muted-foreground">
                        {wins}W / {losses}L
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-[10px] text-muted-foreground">No trades</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {loading ? <div className="glass h-28 animate-pulse rounded-3xl" /> : null}
      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => !open && onSelectDay(null)}>
        <DialogContent className="journal-scrollbar max-h-[88vh] max-w-2xl overflow-y-auto rounded-3xl bg-card">
          <DialogHeader>
            <DialogTitle>
              {selectedDay
                ? new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Day trades"}
            </DialogTitle>
            <DialogDescription>
              {selectedEntries.length
                ? `${selectedEntries.length} trade${selectedEntries.length === 1 ? "" : "s"} recorded on this day.`
                : "No trades recorded on this day."}
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-fit bg-gradient-gold text-primary-foreground"
            onClick={() => selectedDay && onNew(new Date(`${selectedDay}T12:00:00`))}
          >
            <Plus /> New Trade
          </Button>
          <div className="space-y-2">
            {selectedEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {entry.pair} · {humanizeJournalValue(entry.direction)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.strategy || "No strategy recorded"}
                    </p>
                  </div>
                  <Pnl value={entry.profit_loss} result={entry.result} />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onView(entry)}>
                    Review
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}>
                    Edit
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function CalendarMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function TradeEditor({
  entry,
  userId,
  initialDate,
  onClose,
  onSaved,
}: {
  entry: TradingJournalEntry | null;
  userId: string;
  initialDate?: Date;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft>(() => {
    if (entry) return entryToDraft(entry);
    const initial = emptyDraft();
    if (initialDate) initial.trade_at = initialDate.toISOString().slice(0, 16);
    return initial;
  });
  const [before, setBefore] = useState<ScreenshotState>(() => imageState(entry?.before_image_url));
  const [after, setAfter] = useState<ScreenshotState>(() => imageState(entry?.after_image_url));
  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    const parsed = tradingJournalEntrySchema.safeParse(toPayload(draft));
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(nextErrors);
      toast.error("Review the highlighted fields.");
      return;
    }
    setSaving(true);
    const uploaded: string[] = [];
    try {
      const [beforeKey, afterKey] = await Promise.all([
        resolveImage(before, userId, uploaded),
        resolveImage(after, userId, uploaded),
      ]);
      const { data: sessionData } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${sessionData.session?.access_token ?? ""}` };
      if (!sessionData.session?.access_token) throw new Error("Your session has expired.");
      const payload = {
        ...parsed.data,
        before_image_url: before.removed ? null : beforeKey,
        after_image_url: after.removed ? null : afterKey,
      };
      if (entry) await updateTradingJournalEntry({ data: { id: entry.id, ...payload }, headers });
      else await createTradingJournalEntry({ data: payload, headers });
      const oldKeys = entry
        ? ([
            before.file || before.removed ? entry.before_image_url : null,
            after.file || after.removed ? entry.after_image_url : null,
          ].filter(Boolean) as string[])
        : [];
      if (oldKeys.length)
        await supabase.storage.from("trading-journal-screenshots").remove(oldKeys);
      toast.success(entry ? "Trade updated." : "Trade saved.");
      await onSaved();
    } catch (saveError) {
      console.error("Trading journal save failed:", saveError);
      if (uploaded.length)
        await supabase.storage.from("trading-journal-screenshots").remove(uploaded);
      toast.error(saveError instanceof Error ? saveError.message : "We could not save this trade.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="journal-scrollbar max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {entry ? "Edit trade" : "New Trade"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 — your draft remains intact as you move through each section.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4].map((number) => (
            <span
              key={number}
              className={`h-1 flex-1 rounded-full ${number <= step ? "bg-gold" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="py-2">
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <JournalInstrumentSelect
                label="Pair / instrument"
                value={draft.pair}
                onChange={(pair, market_type) =>
                  setDraft((current) => ({ ...current, pair, market_type }))
                }
              />
              <Field label="Direction">
                <JournalSelect
                  ariaLabel="Direction"
                  value={draft.direction}
                  options={journalDirections}
                  onChange={(value) => set("direction", value)}
                  placeholder="Select direction"
                />
              </Field>
              <Field label="Trade date and time" error={errors.trade_at}>
                <JournalDateTimePicker
                  label="Trade date and time"
                  value={draft.trade_at}
                  onChange={(value) => set("trade_at", value)}
                />
              </Field>
              <Field label="Session">
                <JournalSelect
                  ariaLabel="Session"
                  value={draft.session}
                  options={journalSessions}
                  onChange={(value) => set("session", value)}
                  placeholder="Select session"
                />
              </Field>
              <Field label="Timeframe" error={errors.timeframe}>
                <Input
                  value={draft.timeframe}
                  onChange={(event) => set("timeframe", event.target.value)}
                />
              </Field>
              <Field label="Strategy" error={errors.strategy}>
                <Input
                  value={draft.strategy}
                  onChange={(event) => set("strategy", event.target.value)}
                  placeholder="e.g. London breakout"
                />
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  "entry_price",
                  "stop_loss",
                  "take_profit",
                  "exit_price",
                  "lot_size",
                  "risk_percent",
                  "reward_percent",
                  "risk_reward_ratio",
                  "profit_loss",
                ] as const
              ).map((key) => (
                <Field key={key} label={key.replaceAll("_", " ")} error={errors[key]}>
                  <Input
                    inputMode="decimal"
                    value={draft[key]}
                    onChange={(event) => set(key, event.target.value)}
                  />
                </Field>
              ))}
              <Field label="Result">
                <JournalSelect
                  ariaLabel="Result"
                  value={draft.result}
                  options={journalResults}
                  onChange={(value) => set("result", value)}
                  placeholder="Select result"
                />
              </Field>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emotion before">
                <Input
                  value={draft.emotion_before}
                  onChange={(event) => set("emotion_before", event.target.value)}
                />
              </Field>
              <Field label="Emotion after">
                <Input
                  value={draft.emotion_after}
                  onChange={(event) => set("emotion_after", event.target.value)}
                />
              </Field>
              <Field label="Confidence (1–5)">
                <Input
                  inputMode="numeric"
                  value={draft.confidence}
                  onChange={(event) => set("confidence", event.target.value)}
                />
              </Field>
              <Field label="Tags">
                <Input
                  value={draft.tags}
                  onChange={(event) => set("tags", event.target.value)}
                  placeholder="breakout, discipline"
                />
              </Field>
              <Field label="Mistakes" className="sm:col-span-2">
                <Textarea
                  value={draft.mistakes}
                  onChange={(event) => set("mistakes", event.target.value)}
                />
              </Field>
              <Field label="Lessons learned" className="sm:col-span-2">
                <Textarea
                  value={draft.lessons}
                  onChange={(event) => set("lessons", event.target.value)}
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea
                  value={draft.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
              </Field>
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <ScreenshotInput
                label="Before-trade screenshot"
                state={before}
                onChange={setBefore}
              />
              <ScreenshotInput label="After-trade screenshot" state={after} onChange={setAfter} />
            </div>
          )}
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? onClose() : setStep((current) => current - 1))}
            disabled={saving}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((current) => current + 1)}>Continue</Button>
          ) : (
            <Button
              onClick={() => void submit()}
              disabled={saving}
              className="bg-gradient-gold text-primary-foreground"
            >
              {saving && <Loader2 className="animate-spin" />}
              {saving ? "Saving trade..." : "Save trade"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium ${className}`}>
      <span className="capitalize">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
function ScreenshotInput({
  label,
  state,
  onChange,
}: {
  label: string;
  state: ScreenshotState;
  onChange: (state: ScreenshotState) => void;
}) {
  const choose = (file: File | null) => {
    if (!file) return;
    if (validateImageFile(file, { maxBytes: 10 * 1024 * 1024 })) {
      toast.error("Use a JPEG, PNG or WebP image up to 10 MB.");
      return;
    }
    onChange({ ...state, file, removed: false, preview: URL.createObjectURL(file) });
  };
  return (
    <div className="rounded-2xl border border-dashed border-gold/40 p-4">
      <p className="font-medium">{label}</p>
      {state.preview ? (
        <img
          src={state.preview}
          alt={`${label} preview`}
          className="mt-3 aspect-video w-full rounded-xl object-cover"
        />
      ) : state.existingKey && !state.removed ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Existing private screenshot will be kept.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Optional JPEG, PNG or WebP up to 10 MB.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs font-semibold">
          <ImagePlus className="h-4 w-4" /> Choose image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
          />
        </label>
        {(state.file || state.existingKey) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...state, file: null, preview: null, removed: true })}
          >
            <X /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function TradeDetails({
  entry,
  onClose,
  onEdit,
}: {
  entry: TradingJournalEntry;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const normalizedProfitLoss = normalizeJournalProfitLoss(entry.result, entry.profit_loss);
  useEffect(() => {
    void Promise.all(
      [entry.before_image_url, entry.after_image_url]
        .filter((key): key is string => typeof key === "string")
        .map(async (key) => {
          const { data } = await supabase.storage
            .from("trading-journal-screenshots")
            .createSignedUrl(key!, 600);
          return [key, data?.signedUrl] as const;
        }),
    ).then((items) =>
      setImages(
        Object.fromEntries(
          items.filter((item): item is readonly [string, string] => typeof item[1] === "string"),
        ),
      ),
    );
  }, [entry]);
  const sections = [
    [
      "Setup",
      [
        ["Instrument", entry.pair],
        ["Direction", entry.direction],
        ["Session", entry.session],
        ["Strategy", entry.strategy],
        ["Timeframe", entry.timeframe],
      ],
    ],
    [
      "Execution",
      [
        ["Entry", entry.entry_price],
        ["Stop loss", entry.stop_loss],
        ["Take profit", entry.take_profit],
        ["Exit", entry.exit_price],
        ["Lot size", entry.lot_size],
        ["RR", entry.risk_reward_ratio],
      ],
    ],
    [
      "Outcome",
      [
        ["Result", journalResultConfig[entry.result].label],
        [
          "Profit / loss",
          `${normalizedProfitLoss > 0 ? "+" : ""}$${normalizedProfitLoss.toFixed(2)}`,
        ],
      ],
    ],
    [
      "Psychology",
      [
        ["Before", entry.emotion_before],
        ["After", entry.emotion_after],
        ["Confidence", entry.confidence],
      ],
    ],
    [
      "Review",
      [
        ["Mistakes", entry.mistakes],
        ["Lessons", entry.lessons],
        ["Notes", entry.notes],
        ["Tags", entry.tags?.join(", ")],
      ],
    ],
  ] as const;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="journal-scrollbar max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{entry.pair} trade review</DialogTitle>
          <DialogDescription>{new Date(entry.trade_at).toLocaleString()}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          {sections.map(([title, fields]) => (
            <section key={title}>
              <h3 className="font-display font-semibold text-gold">{title}</h3>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                {fields
                  .filter(([, value]) => value !== null && value !== undefined && value !== "")
                  .map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-sm capitalize">
                        {String(value).replaceAll("_", " ")}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
          {Object.keys(images).length ? (
            <section>
              <h3 className="font-display font-semibold text-gold">Screenshots</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {Object.entries(images).map(([key, url], index) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="group relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <img
                      src={url}
                      alt={`${key === entry.before_image_url ? "Before" : "After"}-trade screenshot`}
                      className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-background/80 px-3 py-2 text-left text-xs font-semibold backdrop-blur-sm">
                      {key === entry.before_image_url ? "Before trade" : "After trade"}
                    </span>
                  </button>
                ))}
              </div>
              <ScreenshotLightbox
                items={Object.entries(images).map(([key, url]) => ({
                  url,
                  label: key === entry.before_image_url ? "Before trade" : "After trade",
                }))}
                index={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onIndexChange={setLightboxIndex}
              />
            </section>
          ) : null}
        </div>
        <Button
          onClick={onEdit}
          className="border border-gold/65 bg-gradient-gold text-primary-foreground shadow-glow hover:brightness-105 focus-visible:ring-gold"
        >
          <Pencil /> Edit trade
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ScreenshotLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: { url: string; label: string }[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => setZoom(1), [index]);
  const current = index === null ? null : items[index];
  return (
    <Dialog open={index !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="journal-scrollbar max-h-[94vh] max-w-6xl overflow-auto rounded-3xl bg-card p-3 sm:p-5">
        <DialogHeader className="pr-10">
          <DialogTitle>{current?.label ?? "Trade screenshot"}</DialogTitle>
          <DialogDescription>Private screenshot preview</DialogDescription>
        </DialogHeader>
        {current ? (
          <div className="relative mt-3 flex min-h-[45vh] items-center justify-center overflow-hidden rounded-2xl bg-background">
            <img
              src={current.url}
              alt={current.label}
              className="max-h-[70vh] max-w-full object-contain transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-elegant">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
                aria-label="Zoom out"
              >
                <Minus />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setZoom(1)}>
                <RotateCcw /> Reset
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
                aria-label="Zoom in"
              >
                <Plus />
              </Button>
            </div>
            {items.length > 1 ? (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  onClick={() => onIndexChange((index! + items.length - 1) % items.length)}
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => onIndexChange((index! + 1) % items.length)}
                  aria-label="Next screenshot"
                >
                  <ChevronRight />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function entryToDraft(entry: TradingJournalEntry): Draft {
  const asText = (value: unknown) => (value === null || value === undefined ? "" : String(value));
  return {
    trade_at: new Date(entry.trade_at).toISOString().slice(0, 16),
    pair: entry.pair,
    market_type: entry.market_type,
    direction: entry.direction,
    timeframe: entry.timeframe,
    strategy: entry.strategy,
    session: entry.session,
    entry_price: asText(entry.entry_price),
    stop_loss: asText(entry.stop_loss),
    take_profit: asText(entry.take_profit),
    exit_price: asText(entry.exit_price),
    lot_size: asText(entry.lot_size),
    risk_percent: asText(entry.risk_percent),
    reward_percent: asText(entry.reward_percent),
    risk_reward_ratio: asText(entry.risk_reward_ratio),
    result: entry.result,
    profit_loss: asText(normalizeJournalProfitLoss(entry.result, entry.profit_loss)),
    emotion_before: entry.emotion_before ?? "",
    emotion_after: entry.emotion_after ?? "",
    confidence: asText(entry.confidence),
    mistakes: entry.mistakes ?? "",
    lessons: entry.lessons ?? "",
    notes: entry.notes ?? "",
    tags: entry.tags?.join(", ") ?? "",
  };
}
function toPayload(draft: Draft) {
  const number = (value: string) => (value.trim() === "" ? null : Number(value));
  const text = (value: string) => value.trim() || null;
  return {
    ...draft,
    trade_at: new Date(draft.trade_at).toISOString(),
    entry_price: number(draft.entry_price),
    stop_loss: number(draft.stop_loss),
    take_profit: number(draft.take_profit),
    exit_price: number(draft.exit_price),
    lot_size: Number(draft.lot_size),
    risk_percent: number(draft.risk_percent),
    reward_percent: number(draft.reward_percent),
    risk_reward_ratio: number(draft.risk_reward_ratio),
    profit_loss: normalizeJournalProfitLoss(
      draft.result as JournalResult,
      number(draft.profit_loss),
    ),
    confidence: draft.confidence ? Number(draft.confidence) : null,
    emotion_before: text(draft.emotion_before),
    emotion_after: text(draft.emotion_after),
    mistakes: text(draft.mistakes),
    lessons: text(draft.lessons),
    notes: text(draft.notes),
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}
function imageState(existingKey?: string | null): ScreenshotState {
  return { file: null, existingKey: existingKey ?? null, removed: false, preview: null };
}
async function resolveImage(state: ScreenshotState, userId: string, uploaded: string[]) {
  if (!state.file) return state.removed ? null : state.existingKey;
  if (validateImageFile(state.file, { maxBytes: 10 * 1024 * 1024 })) {
    throw new Error("Use a valid JPEG, PNG or WebP image up to 10 MB.");
  }
  const key = `${userId}/${crypto.randomUUID()}.${extensionForImageMime(state.file.type)}`;
  const { error } = await supabase.storage
    .from("trading-journal-screenshots")
    .upload(key, state.file, { contentType: state.file.type, upsert: false });
  if (error) throw error;
  uploaded.push(key);
  return key;
}
async function removeTrade(entry: TradingJournalEntry, userId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Your session has expired.");
  await deleteTradingJournalEntry({
    data: { id: entry.id },
    headers: { Authorization: `Bearer ${token}` },
  });
  const keys = [entry.before_image_url, entry.after_image_url].filter(
    (key): key is string => typeof key === "string" && key.startsWith(`${userId}/`),
  );
  if (keys.length) {
    const { error } = await supabase.storage.from("trading-journal-screenshots").remove(keys);
    if (error) console.error("Trading journal screenshot cleanup failed:", error.message);
  }
}
