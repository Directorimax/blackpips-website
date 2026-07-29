import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Check, ChevronDown, Clock, Minus, Plus, Search } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CATEGORY_ORDER,
  calculateEstimatedValue,
  INSTRUMENTS,
  isValidLotSize,
  type InstrumentConfig,
} from "@/lib/pip-calculator";

const formatUsd = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PipCalculator() {
  const [symbol, setSymbol] = useState("EURUSD");
  const instrument = INSTRUMENTS.find((item) => item.symbol === symbol) ?? INSTRUMENTS[0];
  const [lots, setLots] = useState<number | null>(instrument.defaultLotSize);
  const [move, setMove] = useState(20);

  useEffect(() => {
    setLots(instrument.defaultLotSize);
    setMove(Math.max(20, instrument.minMove));
  }, [instrument]);

  const estimatedValue = useMemo(
    () => (lots === null ? null : calculateEstimatedValue(instrument, lots, move)),
    [instrument, lots, move],
  );
  const moveLabel =
    instrument.calculationType === "pip"
      ? "Pips"
      : instrument.calculationType === "tick"
        ? "Ticks"
        : "Points";
  const valueLabel =
    instrument.calculationType === "pip"
      ? "Estimated Pip Value"
      : instrument.calculationType === "tick"
        ? "Estimated Tick Value"
        : "Estimated Point Value";

  return (
    <div className="glass relative rounded-3xl p-5 sm:p-8">
      <div className="flex items-center gap-2 text-foreground dark:text-gold">
        <Calculator className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Pip Value Calculator</span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold">Estimate your move value</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use configured estimates for planning. Your broker&apos;s contract specifications can vary.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Instrument</span>
          <InstrumentSelect value={symbol} onValueChange={setSymbol} />
        </div>
        <NumberStepper
          label="Lot size"
          value={lots}
          onValueChange={setLots}
          min={instrument.minLotSize}
          max={100}
          step={instrument.lotStep}
          validate={(value) => isValidLotSize(instrument, value)}
          defaultValue={instrument.defaultLotSize}
          resetKey={instrument.symbol}
        />
        <NumberStepper
          label={moveLabel}
          value={move}
          onValueChange={(value) => {
            if (value !== null) setMove(value);
          }}
          min={instrument.minMove}
          max={100_000}
          step={instrument.moveStep}
          defaultValue={Math.max(20, instrument.minMove)}
          resetKey={instrument.symbol}
        />
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-card-foreground shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Contract basis</div>
          <div className="mt-1 font-display text-sm font-semibold">
            {instrument.contractBasis ?? `${instrument.contractSize.toLocaleString()} units / lot`}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {instrument.contractBasis
              ? instrument.supportingText
              : `${instrument.quoteCurrency} quote currency`}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-center shadow-glow">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {valueLabel}
        </div>
        <div
          className={`mt-1 font-display text-4xl font-black ${estimatedValue === null ? "text-muted-foreground" : "text-gradient-gold"}`}
        >
          {estimatedValue === null ? "—" : `$${formatUsd(estimatedValue)}`}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {lots === null
            ? "Enter a complete valid lot size to see an estimate."
            : `Estimated value for ${move} ${moveLabel.toLowerCase()} at ${lots} lot${lots === 1 ? "" : "s"}.`}
        </p>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {instrument.disclaimer ??
          "This is an estimate in USD based on the configured instrument value. Verify tick size, contract size and conversion with your broker before trading."}
      </p>
    </div>
  );
}

function InstrumentSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = INSTRUMENTS.find((instrument) => instrument.symbol === value) ?? INSTRUMENTS[0];
  const visibleInstruments = INSTRUMENTS.filter((instrument) =>
    `${instrument.symbol} ${instrument.displayName} ${instrument.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const select = (instrument: InstrumentConfig) => {
    onValueChange(instrument.symbol);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleInstruments.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && visibleInstruments[activeIndex]) {
      event.preventDefault();
      select(visibleInstruments[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!open) {
            setQuery("");
            setActiveIndex(
              Math.max(
                0,
                INSTRUMENTS.findIndex((instrument) => instrument.symbol === value),
              ),
            );
          }
          setOpen((current) => !current);
        }}
        className="flex w-full items-center justify-between rounded-xl border border-gold/45 bg-card px-4 py-3 text-left text-sm text-card-foreground shadow-[0_8px_20px_rgb(31_27_17_/_0.08)] transition hover:border-gold/70 hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 dark:shadow-[0_8px_20px_rgb(0_0_0_/_0.24)]"
      >
        <span className="min-w-0">
          <span className="font-display font-semibold text-card-foreground">{selected.symbol}</span>
          <span className="ml-2 truncate text-xs text-muted-foreground">
            {selected.displayName}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground transition-transform dark:text-gold ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-gold/45 bg-popover p-2 text-popover-foreground shadow-[0_20px_50px_rgb(31_27_17_/_0.18)] dark:shadow-[0_20px_50px_rgb(0_0_0_/_0.55)]"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground dark:text-gold"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded="true"
                aria-activedescendant={
                  visibleInstruments[activeIndex]
                    ? `${listId}-${visibleInstruments[activeIndex].symbol}`
                    : undefined
                }
                placeholder="Search instruments"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold/70 focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div
              id={listId}
              role="listbox"
              aria-label="Available instruments"
              className="mt-2 max-h-72 overflow-y-auto overscroll-contain pr-1"
            >
              {CATEGORY_ORDER.map((category) => {
                const instruments = visibleInstruments.filter(
                  (instrument) => instrument.category === category,
                );
                if (!instruments.length) return null;
                return (
                  <div key={category} className="py-1">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-foreground dark:text-gold">
                      {category}
                    </div>
                    {instruments.map((instrument) => {
                      const index = visibleInstruments.indexOf(instrument);
                      const isSelected = instrument.symbol === value;
                      return (
                        <button
                          key={instrument.symbol}
                          id={`${listId}-${instrument.symbol}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onMouseMove={() => setActiveIndex(index)}
                          onClick={() => select(instrument)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${index === activeIndex ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"}`}
                        >
                          <span className="font-medium">{instrument.symbol}</span>
                          {isSelected ? (
                            <Check
                              className="h-4 w-4 text-foreground dark:text-gold"
                              aria-label="Selected"
                            />
                          ) : (
                            <span className="text-xs">{instrument.displayName}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {!visibleInstruments.length ? (
                <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                  No instruments found.
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NumberStepper({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  validate,
  defaultValue,
  resetKey,
}: {
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  min: number;
  max: number;
  step: number;
  validate?: (value: number) => boolean;
  defaultValue: number;
  resetKey: string;
}) {
  const [inputValue, setInputValue] = useState(() => (value === null ? "" : String(value)));
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const lastValidValue = useRef(value ?? defaultValue);
  const previousResetKey = useRef(resetKey);
  const errorId = `${label.replaceAll(" ", "-").toLowerCase()}-error`;

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setInputValue(String(defaultValue));
    lastValidValue.current = defaultValue;
    setValidationMessage(null);
    onValueChange(defaultValue);
  }, [defaultValue, onValueChange, resetKey]);

  const isComplete = (nextValue: string) =>
    /^\d+(?:\.\d+)?$/.test(nextValue) && Number(nextValue) > 0;

  const commitValue = (nextValue: string, source: "blur" | "enter") => {
    if (!nextValue) {
      setInputValue(String(defaultValue));
      lastValidValue.current = defaultValue;
      onValueChange(defaultValue);
      setValidationMessage(null);
      return;
    }
    const parsed = Number(nextValue);
    if (!isComplete(nextValue) || !Number.isFinite(parsed) || parsed < min) {
      setInputValue(String(min));
      lastValidValue.current = min;
      onValueChange(min);
      setValidationMessage(`${label} must be at least ${min}.`);
      return;
    }
    if (!(validate?.(parsed) ?? true)) {
      setInputValue(String(lastValidValue.current));
      onValueChange(lastValidValue.current);
      setValidationMessage(`Use ${step} ${label.toLowerCase()} increments.`);
      return;
    }
    lastValidValue.current = parsed;
    onValueChange(parsed);
    setValidationMessage(null);
    if (source === "blur") setInputValue(String(parsed));
  };

  const updateFromButton = (direction: -1 | 1) => {
    const parsed = Number(inputValue);
    const current = isComplete(inputValue) && (validate?.(parsed) ?? true) ? parsed : defaultValue;
    const nextValue = Math.min(max, Math.max(min, Number((current + direction * step).toFixed(6))));
    setInputValue(String(nextValue));
    lastValidValue.current = nextValue;
    onValueChange(nextValue);
    setValidationMessage(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (!/^-?\d*(?:\.\d*)?$/.test(nextValue)) {
      setValidationMessage("Enter a numeric lot size.");
      return;
    }
    setInputValue(nextValue);
    setValidationMessage(null);
    if (!isComplete(nextValue)) {
      onValueChange(null);
      return;
    }
    const parsed = Number(nextValue);
    if (validate?.(parsed) ?? parsed >= min) {
      lastValidValue.current = parsed;
      onValueChange(parsed);
    } else {
      onValueChange(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitValue(inputValue, "enter");
    }
  };

  const isAtMinimum = value !== null && value <= min;
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="mt-1.5 flex overflow-hidden rounded-xl border border-input bg-card text-card-foreground shadow-sm transition focus-within:border-gold/70 focus-within:ring-2 focus-within:ring-gold/30">
        <button
          type="button"
          onClick={() => updateFromButton(-1)}
          disabled={isAtMinimum}
          aria-label={`Decrease ${label}`}
          className="grid h-11 w-11 shrink-0 place-items-center border-r border-border text-foreground transition hover:bg-gold/15 hover:text-gold disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          type="text"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          aria-invalid={validationMessage ? "true" : undefined}
          aria-describedby={validationMessage ? errorId : undefined}
          value={inputValue}
          onChange={handleChange}
          onBlur={() => commitValue(inputValue, "blur")}
          onKeyDown={handleKeyDown}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent px-2 text-center text-sm font-semibold text-card-foreground outline-none"
        />
        <button
          type="button"
          onClick={() => updateFromButton(1)}
          disabled={value !== null && value >= max}
          aria-label={`Increase ${label}`}
          className="grid h-11 w-11 shrink-0 place-items-center border-l border-border text-foreground transition hover:bg-gold/15 hover:text-gold disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
      {validationMessage ? (
        <span id={errorId} className="mt-1 block text-xs text-destructive" role="alert">
          {validationMessage}
        </span>
      ) : null}
    </label>
  );
}

const SESSIONS = [
  { name: "Sydney", openUTC: 22, closeUTC: 7 },
  { name: "Tokyo", openUTC: 0, closeUTC: 9 },
  { name: "London", openUTC: 7, closeUTC: 16 },
  { name: "New York", openUTC: 13, closeUTC: 22 },
];

export function MarketSessions() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const hour = now.getUTCHours();
  const isOpen = (openUTC: number, closeUTC: number) =>
    openUTC < closeUTC ? hour >= openUTC && hour < closeUTC : hour >= openUTC || hour < closeUTC;
  return (
    <div className="glass rounded-3xl p-5 sm:p-8">
      <div className="flex items-center gap-2 text-foreground dark:text-gold">
        <Clock className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Market Sessions</span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold">Live session clock</h1>
      <p className="text-xs text-muted-foreground">
        UTC +3 now {new Date(now.getTime() + 3 * 60 * 60 * 1000).toUTCString().slice(17, 25)}
      </p>
      <div className="mt-6 space-y-2">
        {SESSIONS.map((session) => {
          const open = isOpen(session.openUTC, session.closeUTC);
          return (
            <div
              key={session.name}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-sm"
            >
              <div>
                <div className="font-display text-sm font-semibold">{session.name}</div>
                <div className="text-xs text-muted-foreground">
                  {String(session.openUTC).padStart(2, "0")}:00 –{" "}
                  {String(session.closeUTC).padStart(2, "0")}:00 UTC
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${open ? "bg-bull/20 text-bull" : "bg-muted text-muted-foreground"}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${open ? "animate-pulse-gold bg-bull" : "bg-muted-foreground"}`}
                />
                {open ? "Open" : "Closed"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
