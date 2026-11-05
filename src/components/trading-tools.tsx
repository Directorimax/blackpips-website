import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Check, ChevronDown, Minus, Plus, Search } from "lucide-react";
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
  convertReferenceCurrency,
  INSTRUMENTS,
  isValidLotSize,
  type InstrumentConfig,
} from "@/lib/pip-calculator";
import { loadFxReferenceRates, type FxReferenceRates } from "@/lib/fx-reference-rates";
import { MarketSessionsWorkspace } from "@/components/market-sessions/MarketSessionsWorkspace";

const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACCOUNT_CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
] as const;

/** Shows instruments as plain pairs, for example EURUSD → EUR/USD. */
export function formatInstrumentSymbol(symbol: string) {
  return /^[A-Z]{6}$/.test(symbol) ? `${symbol.slice(0, 3)}/${symbol.slice(3)}` : symbol;
}

type CalculatorMode = "pip" | "risk";

type CalculationResult =
  | { mode: "pip"; value: number | null; perUnit: number | null; lots: number; move: number }
  | {
      mode: "risk";
      riskAmount: number;
      size: number | null;
      profit: number | null;
      riskReward: number;
      breakeven: number;
      stop: number;
    };

export function PipCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("pip");
  const [symbol, setSymbol] = useState("EURUSD");
  const instrument = INSTRUMENTS.find((item) => item.symbol === symbol) ?? INSTRUMENTS[0];
  const [lots, setLots] = useState<number | null>(instrument.defaultLotSize);
  const [move, setMove] = useState(20);
  const [balance, setBalance] = useState("1000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [stopMove, setStopMove] = useState<number | null>(20);
  const [targetMove, setTargetMove] = useState<number | null>(60);
  const [accountCurrency, setAccountCurrency] = useState<(typeof ACCOUNT_CURRENCIES)[number]>(
    ACCOUNT_CURRENCIES[0],
  );
  const [rates, setRates] = useState<FxReferenceRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [result, setResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    setLots(instrument.defaultLotSize);
    setMove(Math.max(20, instrument.minMove));
    setResult(null);
  }, [instrument]);

  useEffect(() => {
    let active = true;
    void loadFxReferenceRates().then((value) => {
      if (!active) return;
      setRates(value);
      setRatesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const toAccount = (quoteAmount: number) =>
    convertReferenceCurrency(
      quoteAmount,
      instrument.quoteCurrency,
      accountCurrency.code,
      rates?.unitsPerEur ?? {},
    );
  const requiresConversion = instrument.quoteCurrency !== accountCurrency.code;
  const unitLabel =
    instrument.calculationType === "pip"
      ? "Pips"
      : instrument.calculationType === "tick"
        ? "Ticks"
        : "Points";
  const valueLabel =
    instrument.calculationType === "pip"
      ? "Estimated pip value"
      : instrument.calculationType === "tick"
        ? "Estimated tick value"
        : "Estimated point value";
  const money = (value: number | null) =>
    value === null ? "—" : `${accountCurrency.symbol}${formatMoney(value)}`;

  function calculate() {
    if (mode === "pip") {
      if (lots === null) return;
      setResult({
        mode: "pip",
        value: toAccount(calculateEstimatedValue(instrument, lots, move)),
        perUnit: toAccount(calculateEstimatedValue(instrument, lots, 1)),
        lots,
        move,
      });
      return;
    }
    const balanceValue = Number(balance);
    const riskValue = Number(riskPercent);
    if (!(balanceValue > 0) || !(riskValue > 0) || !stopMove || !targetMove) return;
    const riskAmount = (balanceValue * riskValue) / 100;
    const perLotPerUnit = toAccount(calculateEstimatedValue(instrument, 1, 1));
    const rawSize = perLotPerUnit ? riskAmount / (stopMove * perLotPerUnit) : null;
    const size =
      rawSize === null
        ? null
        : Math.floor(rawSize / instrument.lotStep + 1e-9) * instrument.lotStep;
    const riskReward = targetMove / stopMove;
    setResult({
      mode: "risk",
      riskAmount,
      size,
      profit: size !== null && perLotPerUnit ? size * targetMove * perLotPerUnit : null,
      riskReward,
      breakeven: 100 / (1 + riskReward),
      stop: stopMove,
    });
  }

  const pipResult = result?.mode === "pip" ? result : null;
  const riskResult = result?.mode === "risk" ? result : null;

  return (
    <section className="card calc spot rise">
      <div className="between" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <p className="kicker row" style={{ gap: 8 }}>
            <Calculator style={{ width: 16, height: 16 }} aria-hidden="true" />
            {mode === "pip" ? "Pip value calculator" : "Risk calculator"}
          </p>
          <h1 className="h2" style={{ fontSize: "clamp(24px, 3vw, 32px)", marginTop: 10 }}>
            {mode === "pip" ? "Estimate your move value" : "Size your position from your risk"}
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            Use configured estimates for planning. Your broker&apos;s contract specifications can
            vary.
          </p>
        </div>
        <div className="seg" role="tablist" aria-label="Calculator">
          {(
            [
              ["pip", "Pip Value"],
              ["risk", "Risk Calculator"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={`seg-btn ${mode === id ? "on" : ""}`}
              onClick={() => {
                setMode(id);
                setResult(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="cgrid">
        <div className="field">
          <span className="label">Instrument</span>
          <InstrumentSelect value={symbol} onValueChange={setSymbol} />
        </div>
        <label className="field">
          <span className="label">Account / result currency</span>
          <select
            className="input"
            value={accountCurrency.code}
            onChange={(event) => {
              setAccountCurrency(
                ACCOUNT_CURRENCIES.find((currency) => currency.code === event.target.value) ??
                  ACCOUNT_CURRENCIES[0],
              );
              setResult(null);
            }}
          >
            {ACCOUNT_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </label>
      </div>
      {requiresConversion && (
        <p className="small" style={{ fontSize: 12 }} aria-live="polite">
          {ratesLoading
            ? "Loading ECB reference rates…"
            : rates
              ? `FX conversion based on ECB reference rates · ${formatReferenceDate(rates.referenceDate)}`
              : "ECB reference rate unavailable. No conversion has been estimated."}
        </p>
      )}

      {mode === "pip" ? (
        <>
          <div className="cgrid" style={{ alignItems: "stretch" }}>
            <div className="grid-2" style={{ gap: 16 }}>
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
                label={unitLabel}
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
            </div>
            <div className="basis">
              <span className="small" style={{ fontSize: 12 }}>
                Contract basis
              </span>
              <span className="h4">
                {instrument.contractBasis ??
                  `${instrument.contractSize.toLocaleString()} units / lot`}
              </span>
              <span className="small" style={{ fontSize: 12 }}>
                {instrument.contractBasis
                  ? instrument.supportingText
                  : `${instrument.quoteCurrency} quote currency`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-gold btn-lg btn-block"
            onClick={calculate}
            disabled={lots === null}
          >
            Calculate
          </button>
          {pipResult ? (
            <div className="result rise" style={{ animationDuration: ".6s" }} aria-live="polite">
              <p className="micro">{valueLabel}</p>
              <p className={`v ${pipResult.value === null ? "" : "gold-text"}`}>
                {money(pipResult.value)}
              </p>
              <p className="small" style={{ marginTop: 8 }}>
                Estimated value for {pipResult.move} {unitLabel.toLowerCase()} at {pipResult.lots}{" "}
                lot
                {pipResult.lots === 1 ? "" : "s"} · {money(pipResult.perUnit)} per{" "}
                {unitLabel.toLowerCase().replace(/s$/, "")}
              </p>
            </div>
          ) : (
            <div className="result is-empty">
              <p className="micro">{valueLabel}</p>
              <p className="v">—</p>
              <p className="small" style={{ marginTop: 8 }}>
                Enter your lot size and {unitLabel.toLowerCase()}, then press Calculate.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid-4 keep-2" style={{ gap: 14 }}>
            <label className="field">
              <span className="label">Account balance ({accountCurrency.code})</span>
              <input
                className="input mono"
                inputMode="decimal"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Risk %</span>
              <input
                className="input mono"
                inputMode="decimal"
                value={riskPercent}
                onChange={(event) => setRiskPercent(event.target.value)}
              />
            </label>
            <NumberStepper
              label={`Stop loss ${unitLabel.toLowerCase()}`}
              value={stopMove}
              onValueChange={setStopMove}
              min={instrument.minMove}
              max={100_000}
              step={instrument.moveStep}
              defaultValue={Math.max(20, instrument.minMove)}
              resetKey={`${instrument.symbol}-sl`}
            />
            <NumberStepper
              label={`Take profit ${unitLabel.toLowerCase()}`}
              value={targetMove}
              onValueChange={setTargetMove}
              min={instrument.minMove}
              max={100_000}
              step={instrument.moveStep}
              defaultValue={Math.max(60, instrument.minMove)}
              resetKey={`${instrument.symbol}-tp`}
            />
          </div>
          <button type="button" className="btn btn-gold btn-lg btn-block" onClick={calculate}>
            Calculate
          </button>
          {riskResult ? (
            <div
              className="stack rise"
              style={{ gap: 14, animationDuration: ".6s" }}
              aria-live="polite"
            >
              <div className="result">
                <p className="micro">Recommended position size</p>
                <p className="v gold-text">
                  {riskResult.size === null ? "—" : `${riskResult.size.toFixed(2)} lots`}
                </p>
                <p className="small" style={{ marginTop: 8 }}>
                  Risking {money(riskResult.riskAmount)} on {riskResult.stop}{" "}
                  {unitLabel.toLowerCase()} · {formatInstrumentSymbol(instrument.symbol)}
                </p>
              </div>
              <div className="grid-4 keep-2" style={{ gap: 12 }}>
                <div className="mini">
                  <span className="micro">Risk amount</span>
                  <b className="bear">{money(riskResult.riskAmount)}</b>
                </div>
                <div className="mini">
                  <span className="micro">Potential profit</span>
                  <b className="bull">{money(riskResult.profit)}</b>
                </div>
                <div className="mini">
                  <span className="micro">Risk / reward</span>
                  <b>1 : {riskResult.riskReward.toFixed(1)}</b>
                </div>
                <div className="mini">
                  <span className="micro">Breakeven win rate</span>
                  <b>{riskResult.breakeven.toFixed(1)}%</b>
                </div>
              </div>
              <div className="rr" aria-hidden="true">
                <i style={{ width: `${riskResult.breakeven}%`, background: "var(--bear)" }} />
                <i style={{ width: `${100 - riskResult.breakeven}%`, background: "var(--bull)" }} />
              </div>
            </div>
          ) : (
            <div className="result is-empty">
              <p className="micro">Recommended position size</p>
              <p className="v">—</p>
              <p className="small" style={{ marginTop: 8 }}>
                Enter your balance, risk and stop loss, then press Calculate.
              </p>
            </div>
          )}
        </>
      )}

      <div className="between" style={{ flexWrap: "wrap" }}>
        <p className="small" style={{ fontSize: 12, maxWidth: 520 }}>
          {instrument.disclaimer ??
            "This uses ECB reference conversion data with the configured instrument value. Verify tick size and contract size with your broker before trading."}
        </p>
        <Link to="/tools/trading-journal" className="btn btn-gold">
          Add to Journal
        </Link>
      </div>
    </section>
  );
}

function formatReferenceDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
    <div ref={rootRef} className="relative">
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
        className="input inst-trigger"
      >
        <span className="min-w-0 font-semibold text-card-foreground">
          {formatInstrumentSymbol(selected.symbol)}
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
                          <span className="font-medium">
                            {formatInstrumentSymbol(instrument.symbol)}
                          </span>
                          {isSelected ? (
                            <Check
                              className="h-4 w-4 text-foreground dark:text-gold"
                              aria-label="Selected"
                            />
                          ) : null}
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
    <label className="field">
      <span className="label">{label}</span>
      <span className="stepper">
        <button
          type="button"
          onClick={() => updateFromButton(-1)}
          disabled={isAtMinimum}
          aria-label={`Decrease ${label}`}
          className="step-btn"
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
          className="step-input"
        />
        <button
          type="button"
          onClick={() => updateFromButton(1)}
          disabled={value !== null && value >= max}
          aria-label={`Increase ${label}`}
          className="step-btn"
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

export function MarketSessions() {
  return <MarketSessionsWorkspace />;
}
