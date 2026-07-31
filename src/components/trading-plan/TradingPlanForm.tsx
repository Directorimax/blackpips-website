import {
  BrainCircuit,
  CalendarDays,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TRADING_PLAN_MARKETS,
  TRADING_PLAN_SESSIONS,
  TRADING_PLAN_TIMEFRAMES,
  type TradingPlanTimeframe,
} from "@/lib/trading-plan";
import { getPlanCompletion, type PlanSectionName } from "./completion";
import { TradingPlanPreview } from "./TradingPlanPreview";
import { TradingPlanSaveBar } from "./TradingPlanSaveBar";
import { TradingPlanSection } from "./TradingPlanSection";
import type { SetTradingPlanDraft, TradingPlanDraft } from "./types";

const styles = ["Scalping", "Day Trading", "Swing Trading", "Position Trading"];

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>
        {label}{" "}
        <span className="text-gold" aria-hidden="true">
          *
        </span>
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-11">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.valueAsNumber;
    if (!Number.isNaN(next)) onChange(next);
  };
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>
        {label}{" "}
        <span className="text-gold" aria-hidden="true">
          *
        </span>
      </span>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="h-11"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  rows = 5,
}: {
  label: string;
  value: string | null | undefined;
  placeholder: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <Textarea
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="max-w-full resize-y leading-6"
      />
    </label>
  );
}

function MultiSelectField({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  };
  return (
    <fieldset className="min-w-0 rounded-xl border border-border/80 p-3">
      <legend className="px-1 text-sm font-medium">
        {label}{" "}
        <span className="text-gold" aria-hidden="true">
          *
        </span>
      </legend>
      <p className="text-xs text-muted-foreground">Select one or more options.</p>
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((option) => (
            <span
              key={option}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-gold/15 py-1 pl-2.5 pr-1 text-xs font-medium text-gold"
            >
              <span className="break-words [overflow-wrap:anywhere]">{option}</span>
              <button
                type="button"
                aria-label={`Remove ${option}`}
                onClick={() => toggle(option)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label={`Select ${label.toLowerCase()}`}
      >
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(option)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-gold/60 bg-gold/15 text-gold" : "border-border bg-background/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PsychologyRuleBuilder({
  rules,
  onChange,
}: {
  rules: string[];
  onChange: (rules: string[]) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const addRule = () => {
    const next = [...rules, ""];
    onChange(next);
    window.requestAnimationFrame(() => inputRefs.current[next.length - 1]?.focus());
  };
  const updateRule = (index: number, value: string) =>
    onChange(rules.map((rule, ruleIndex) => (ruleIndex === index ? value : rule)));
  const removeRule = (index: number) =>
    onChange(rules.filter((_, ruleIndex) => ruleIndex !== index));
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Psychology Rules</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One clear rule per line. Blank rules are not saved.
          </p>
        </div>
        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1.5 text-sm font-semibold text-gold transition hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add your first psychology rule to protect your process.
          </p>
        ) : (
          rules.map((rule, index) => (
            <div key={index} className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <Input
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                value={rule}
                onChange={(event) => updateRule(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addRule();
                  }
                }}
                placeholder="For example: Wait for confirmation"
                className="h-11 min-w-0 flex-1"
              />
              <button
                type="button"
                aria-label={`Remove rule ${index + 1}`}
                onClick={() => removeRule(index)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-destructive/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TradingPlanForm({
  draft,
  saving,
  saved,
  hasChanges,
  valid,
  lastSavedAt,
  setDraft,
  onSave,
}: {
  draft: TradingPlanDraft;
  saving: boolean;
  saved: boolean;
  hasChanges: boolean;
  valid: boolean;
  lastSavedAt: string | null;
  setDraft: SetTradingPlanDraft;
  onSave: () => void;
}) {
  const completion = getPlanCompletion(draft);
  const [expanded, setExpanded] = useState<PlanSectionName | null>("Trader Profile");
  const toggleSection = (section: PlanSectionName) => {
    setExpanded((current) => (current === section ? null : section));
  };
  const toggleTimeframe = (timeframe: TradingPlanTimeframe) =>
    setDraft(
      "preferred_timeframes",
      draft.preferred_timeframes.includes(timeframe)
        ? draft.preferred_timeframes.filter((item) => item !== timeframe)
        : [...draft.preferred_timeframes, timeframe],
    );

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <div className="grid gap-3">
        <TradingPlanSection
          title="Trader Profile"
          description="Define the market environment and style your plan is designed for."
          icon={<UserRound className="h-5 w-5" />}
          complete={completion.completed["Trader Profile"]}
          expanded={expanded === "Trader Profile"}
          onExpandedChange={() => toggleSection("Trader Profile")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              <span>
                Trader Name{" "}
                <span className="text-gold" aria-hidden="true">
                  *
                </span>
              </span>
              <Input
                value={draft.trader_name}
                onChange={(event) => setDraft("trader_name", event.target.value)}
                className="h-11"
                autoComplete="name"
              />
            </label>
            <SelectField
              label="Trading Style"
              value={draft.trading_style}
              options={styles}
              onChange={(value) => setDraft("trading_style", value)}
            />
            <MultiSelectField
              label="Preferred Markets"
              options={TRADING_PLAN_MARKETS}
              selected={draft.preferred_markets}
              onChange={(value) =>
                setDraft("preferred_markets", value as TradingPlanDraft["preferred_markets"])
              }
            />
            <MultiSelectField
              label="Preferred Sessions"
              options={TRADING_PLAN_SESSIONS}
              selected={draft.preferred_sessions}
              onChange={(value) =>
                setDraft("preferred_sessions", value as TradingPlanDraft["preferred_sessions"])
              }
            />
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium">
              Preferred Timeframes{" "}
              <span className="text-gold" aria-hidden="true">
                *
              </span>
            </legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Select every timeframe that supports your trading process.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRADING_PLAN_TIMEFRAMES.map((timeframe) => {
                const selected = draft.preferred_timeframes.includes(timeframe);
                return (
                  <button
                    key={timeframe}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTimeframe(timeframe)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-gold/60 bg-gold/15 text-gold" : "border-border bg-background/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"}`}
                  >
                    {timeframe}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </TradingPlanSection>
        <TradingPlanSection
          title="Risk Management"
          description="Set clear limits before you enter the market."
          icon={<ShieldCheck className="h-5 w-5" />}
          complete={completion.completed["Risk Management"]}
          expanded={expanded === "Risk Management"}
          onExpandedChange={() => toggleSection("Risk Management")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Max Risk Per Trade (%)"
              value={draft.max_risk_per_trade}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) => setDraft("max_risk_per_trade", value)}
            />
            <NumberField
              label="Max Daily Loss (%)"
              value={draft.max_daily_loss}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) => setDraft("max_daily_loss", value)}
            />
            <NumberField
              label="Max Weekly Loss (%)"
              value={draft.max_weekly_loss}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) => setDraft("max_weekly_loss", value)}
            />
            <NumberField
              label="Max Open Trades"
              value={draft.max_open_trades}
              min={1}
              max={100}
              onChange={(value) => setDraft("max_open_trades", value)}
            />
          </div>
        </TradingPlanSection>
        <TradingPlanSection
          title="Psychology Rules"
          description="Write the rules that protect you from emotional decisions."
          icon={<BrainCircuit className="h-5 w-5" />}
          complete={completion.completed["Psychology Rules"]}
          expanded={expanded === "Psychology Rules"}
          onExpandedChange={() => toggleSection("Psychology Rules")}
        >
          <PsychologyRuleBuilder
            rules={draft.psychology_rules_list}
            onChange={(rules) => setDraft("psychology_rules_list", rules)}
          />
        </TradingPlanSection>
        <TradingPlanSection
          title="Daily Routine"
          description="Make preparation, execution and review repeatable."
          icon={<CalendarDays className="h-5 w-5" />}
          complete={completion.completed["Daily Routine"]}
          expanded={expanded === "Daily Routine"}
          onExpandedChange={() => toggleSection("Daily Routine")}
        >
          <div className="grid gap-4">
            <TextField
              label="Before Trading"
              value={draft.daily_routine_before}
              onChange={(value) => setDraft("daily_routine_before", value)}
              placeholder="Review the calendar, mark key levels and define bias."
              rows={4}
            />
            <TextField
              label="During Trading"
              value={draft.daily_routine_during}
              onChange={(value) => setDraft("daily_routine_during", value)}
              placeholder="Wait for valid setups and respect risk limits."
              rows={4}
            />
            <TextField
              label="After Trading"
              value={draft.daily_routine_after}
              onChange={(value) => setDraft("daily_routine_after", value)}
              placeholder="Record trades, review execution and step away."
              rows={4}
            />
          </div>
        </TradingPlanSection>
        <TradingPlanSection
          title="Additional Notes"
          description="Keep personal reminders and context worth revisiting."
          icon={<Target className="h-5 w-5" />}
          complete={completion.completed["Additional Notes"]}
          expanded={expanded === "Additional Notes"}
          onExpandedChange={() => toggleSection("Additional Notes")}
        >
          <TextField
            label="Notes"
            value={draft.notes}
            onChange={(value) => setDraft("notes", value)}
            placeholder="Add context that helps you follow your plan consistently."
            rows={6}
          />
        </TradingPlanSection>
        <TradingPlanSaveBar
          saving={saving}
          saved={saved}
          hasChanges={hasChanges}
          valid={valid}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />
      </div>
      <div className="min-w-0 xl:sticky xl:top-24">
        <TradingPlanPreview draft={draft} />
      </div>
    </div>
  );
}
