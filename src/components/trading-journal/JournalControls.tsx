import { CalendarDays, X } from "lucide-react";
import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { INSTRUMENTS } from "@/lib/pip-calculator";
import { humanizeJournalValue } from "@/lib/trading-journal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { value: string; label: string };

export function JournalSelect({
  ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  clearable = false,
  allOptionLabel,
  className,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | Option)[];
  placeholder: string;
  clearable?: boolean;
  allOptionLabel?: string;
  className?: string;
}) {
  const normalized = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string"
          ? { value: option, label: humanizeJournalValue(option) }
          : option,
      ),
    [options],
  );
  return (
    <div className={`relative ${className ?? ""}`}>
      <Select
        value={value || (allOptionLabel ? "__all__" : undefined)}
        onValueChange={(nextValue) => onChange(nextValue === "__all__" ? "" : nextValue)}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className="h-10 bg-background pr-3"
        >
          <SelectValue
            placeholder={placeholder}
            className="min-w-0 flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap"
          />
        </SelectTrigger>
        <SelectContent className="journal-scrollbar z-[70] max-h-64 rounded-xl bg-popover p-1 shadow-elegant">
          {allOptionLabel ? (
            <SelectItem value="__all__" className="rounded-lg py-2.5">
              {allOptionLabel}
            </SelectItem>
          ) : null}
          {normalized.map((option) => (
            <SelectItem key={option.value} value={option.value} className="rounded-lg py-2.5">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clearable && value ? (
        <button
          type="button"
          aria-label={`Clear ${ariaLabel}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange("");
          }}
          className="absolute right-10 top-1/2 z-10 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function parseDate(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function JournalDatePicker({
  value,
  onChange,
  label,
  clearable = true,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  clearable?: boolean;
  className?: string;
}) {
  const selected = parseDate(value);
  return (
    <Popover>
      <div className={`relative ${className ?? ""}`}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 pr-8 text-left text-sm text-foreground shadow-sm transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
            <span className={selected ? "" : "text-muted-foreground"}>
              {selected
                ? selected.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : label}
            </span>
          </button>
        </PopoverTrigger>
        {clearable && value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <PopoverContent
        align="start"
        className="journal-scrollbar z-[70] w-auto rounded-2xl bg-popover p-2 shadow-elegant"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(dateValue(date))}
          className="rounded-xl bg-popover"
        />
        {clearable ? (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange("")}>
            Clear date
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function JournalDateTimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [datePart = "", timePart = "12:00"] = value.split("T");
  const time = timePart.slice(0, 5);
  const selected = parseDate(datePart);
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    value: String(hour).padStart(2, "0"),
    label: String(hour).padStart(2, "0"),
  }));
  const minutes = Array.from({ length: 60 }, (_, minute) => ({
    value: String(minute).padStart(2, "0"),
    label: String(minute).padStart(2, "0"),
  }));
  const [hour = "12", minute = "00"] = time.split(":");
  const setDate = (date: Date) => onChange(`${dateValue(date)}T${hour}:${minute}`);
  const setTime = (nextHour: string, nextMinute: string) =>
    onChange(`${datePart || dateValue(new Date())}T${nextHour}:${nextMinute}`);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
          <span>
            {selected
              ? `${selected.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${time}`
              : label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="journal-scrollbar z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-popover p-2 shadow-elegant"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && setDate(date)}
          className="mx-auto rounded-xl bg-popover"
        />
        <div className="grid grid-cols-2 gap-2 border-t border-border p-2">
          <JournalSelect
            ariaLabel="Hour"
            value={hour}
            onChange={(next) => setTime(next, minute)}
            options={hours}
            placeholder="Hour"
          />
          <JournalSelect
            ariaLabel="Minute"
            value={minute}
            onChange={(next) => setTime(hour, next)}
            options={minutes}
            placeholder="Minute"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function JournalInstrumentSelect({
  value,
  onChange,
  label = "Pair / instrument",
  clearable = false,
  className,
}: {
  value: string;
  onChange: (pair: string, market: string) => void;
  label?: string;
  clearable?: boolean;
  className?: string;
}) {
  const options = INSTRUMENTS.map((instrument) => ({
    value: instrument.symbol,
    label: `${instrument.symbol} — ${instrument.displayName}`,
  })).map(({ value }) => ({ value, label: value }));
  return (
    <JournalSelect
      ariaLabel={label}
      value={value}
      placeholder="Select an instrument"
      options={options}
      clearable={clearable}
      allOptionLabel={clearable ? "All Instruments" : undefined}
      className={className}
      onChange={(pair) => {
        if (!pair) {
          onChange("", "");
          return;
        }
        const instrument = INSTRUMENTS.find((item) => item.symbol === pair);
        if (!instrument) return;
        const category = instrument.category.toLowerCase();
        onChange(
          pair,
          category.startsWith("forex")
            ? "forex"
            : category.startsWith("indices")
              ? "indices"
              : category.startsWith("metals")
                ? "metals"
                : category.startsWith("energy")
                  ? "energy"
                  : category.startsWith("crypto")
                    ? "crypto"
                    : "other",
        );
      }}
    />
  );
}
