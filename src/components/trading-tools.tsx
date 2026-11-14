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
      riskReward: number | null;
      breakeven: number | null;
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
  // Risk calculator mirrors the BLACKPIPS app: direction plus entry / stop / target prices.
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [riskError, setRiskError] = useState<string | null>(null);
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
      ? "Pip value"
      : instrument.calculationType === "tick"
        ? "Tick value"
        : "Point value";
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
    const entry = Number(entryPrice);
    const stop = Number(stopPrice);
    const target = targetPrice.trim() ? Number(targetPrice) : null;
    setRiskError(null);
    if (!(balanceValue > 0) || !(riskValue > 0) || riskValue > 100 || !(entry > 0) || !(stop > 0)) {
      setResult(null);
      setRiskError("Enter your balance, risk %, entry and stop loss prices.");
      return;
    }
    const riskDistance = direction === "buy" ? entry - stop : stop - entry;
    const rewardDistance =
      target === null ? null : direction === "buy" ? target - entry : entry - target;
    if (riskDistance <= 0 || (rewardDistance !== null && !(rewardDistance > 0))) {
      setResult(null);
      setRiskError(
        direction === "buy"
          ? "For a Buy, Stop Loss must be below Entry and Take Profit, when provided, must be above Entry."
          : "For a Sell, Stop Loss must be above Entry and Take Profit, when provided, must be below Entry.",
      );
      return;
    }
    const stopUnits = riskDistance / instrument.pipSize;
    const targetUnits = rewardDistance === null ? null : rewardDistance / instrument.pipSize;
    const riskAmount = (balanceValue * riskValue) / 100;
    const perLotPerUnit = toAccount(calculateEstimatedValue(instrument, 1, 1));
    if (!perLotPerUnit) {
      setResult(null);
      setRiskError("A reference rate is required for this currency conversion.");
      return;
    }
    const rawSize = riskAmount / (stopUnits * perLotPerUnit);
    const size = Math.floor(rawSize / instrument.lotStep + 1e-9) * instrument.lotStep;
    const riskReward = targetUnits === null ? null : targetUnits / stopUnits;
    setResult({
      mode: "risk",
      riskAmount,
      size,
      profit: targetUnits === null ? null : size * targetUnits * perLotPerUnit,
      riskReward,
      breakeven: riskReward === null ? null : 100 / (1 + riskReward),
      stop: Math.round(stopUnits * 10) / 10,
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
        <div className="field" style={{ position: "relative", zIndex: 30 }}>
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
          <div className="lot-presets" role="group" aria-label="Lot size presets">
            {[0.01, 0.1, 0.5, 1]
              .filter((value) => value >= instrument.minLotSize)
              .map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={lots === value}
                  className={lots === value ? "on" : ""}
                  onClick={() => setLots(value)}
                >
                  {value} lot
                </button>
              ))}
          </div>
          <button
            type="button"
            className="btn btn-gold btn-lg btn-block calc-btn"
            onClick={calculate}
            disabled={lots === null}
          >
            Calculate
          </button>
          {pipResult ? (
            <div
              className="result pip-hero rise"
              style={{ animationDuration: ".6s" }}
              aria-live="polite"
            >
              <p className="micro">{valueLabel}</p>
              <p className={`v ${pipResult.value === null ? "" : "gold-text"}`}>
                {money(pipResult.value)}
              </p>

              <p className="small" style={{ marginTop: 8 }}>
                Value for {pipResult.move} {unitLabel.toLowerCase()} at {pipResult.lots} lot
                {pipResult.lots === 1 ? "" : "s"} · {money(pipResult.perUnit)} per{" "}
                {unitLabel.toLowerCase().replace(/s$/, "")}
              </p>
            </div>
          ) : (
            <div className="result pip-hero is-empty">
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
          <div className="dir-toggle" role="group" aria-label="Trade direction">
            {(["buy", "sell"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={direction === value}
                className={`${value} ${direction === value ? "on" : ""}`}
                onClick={() => {
                  setDirection(value);
                  setResult(null);
                  setRiskError(null);
                }}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
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
            <PriceField label="Entry price" value={entryPrice} onChange={setEntryPrice} />
            <PriceField
              label="Stop loss price"
              value={stopPrice}
              onChange={setStopPrice}
              hint={distanceHint(entryPrice, stopPrice, instrument.pipSize, unitLabel)}
            />
            <PriceField
              label="Take profit (optional)"
              value={targetPrice}
              onChange={setTargetPrice}
              hint={distanceHint(entryPrice, targetPrice, instrument.pipSize, unitLabel)}
            />
          </div>
          <button
            type="button"
            className="btn btn-gold btn-lg btn-block calc-btn"
            onClick={calculate}
          >
            Calculate
          </button>
          {riskResult ? (
            <div
              className="stack rise result-wrap"
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
                  <b>
                    {riskResult.riskReward === null
                      ? "—"
                      : `1 : ${riskResult.riskReward.toFixed(1)}`}
                  </b>
                </div>
                <div className="mini">
                  <span className="micro">Breakeven win rate</span>
                  <b>
                    {riskResult.breakeven === null ? "—" : `${riskResult.breakeven.toFixed(1)}%`}
                  </b>
                </div>
              </div>
              {riskResult.breakeven !== null && (
                <div className="rr" aria-hidden="true">
                  <i style={{ width: `${riskResult.breakeven}%`, background: "var(--bear)" }} />
                  <i
                    style={{ width: `${100 - riskResult.breakeven}%`, background: "var(--bull)" }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="result is-empty">
              <p className="micro">Recommended position size</p>
              <p className="v">—</p>
              <p className="small" style={{ marginTop: 8 }}>
                {riskError ??
                  "Enter your balance, risk, entry and stop loss, then press Calculate."}
              </p>
            </div>
          )}
        </>
      )}

      <div className="between calc-foot" style={{ flexWrap: "wrap" }}>
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

function distanceHint(entry: string, price: string, pipSize: number, unitLabel: string) {
  const a = Number(entry);
  const b = Number(price);
  if (!(a > 0) || !(b > 0)) return undefined;
  return `${(Math.abs(a - b) / pipSize).toFixed(1)} ${unitLabel.toLowerCase()}`;
}

function PriceField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="between">
        <span className="label">{label}</span>
        {hint && (
          <span className="small mono" style={{ fontSize: 11 }}>
            {hint}
          </span>
        )}
      </span>
      <input
        className="input mono"
        inputMode="decimal"
        value={value}
        placeholder="0.00000"
        onChange={(event) => onChange(event.target.value.replace(",", "."))}
      />
    </label>
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
            className="instrument-pop absolute z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-gold/45 bg-popover p-2 text-popover-foreground shadow-[0_20px_50px_rgb(31_27_17_/_0.18)] dark:shadow-[0_20px_50px_rgb(0_0_0_/_0.55)]"
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
