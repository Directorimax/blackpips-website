export type InstrumentCategory =
  | "Forex majors"
  | "Forex minors"
  | "Metals"
  | "Indices / futures-style instruments"
  | "Energy"
  | "Crypto";

export type CalculationType = "pip" | "tick" | "point";

export type InstrumentConfig = {
  symbol: string;
  displayName: string;
  category: InstrumentCategory;
  pipSize: number;
  contractSize: number;
  quoteCurrency: string;
  decimalPrecision: number;
  defaultLotSize: number;
  minLotSize: number;
  lotStep: number;
  calculationType: CalculationType;
  /** Value of one configured pip/tick/point per lot in quoteCurrency. */
  valuePerUnitPerLot: number;
  minMove: number;
  moveStep: number;
  contractBasis?: string;
  supportingText?: string;
  disclaimer?: string;
};

const createForexInstrument = (
  symbol: string,
  displayName: string,
  category: Extract<InstrumentCategory, "Forex majors" | "Forex minors">,
  quoteCurrency: string,
  pipSize: number,
): InstrumentConfig => ({
  symbol,
  displayName,
  category,
  pipSize,
  contractSize: 100_000,
  quoteCurrency,
  decimalPrecision: pipSize === 0.01 ? 3 : 5,
  defaultLotSize: 1,
  minLotSize: 0.01,
  lotStep: 0.01,
  calculationType: "pip",
  valuePerUnitPerLot: pipSize * 100_000,
  minMove: 1,
  moveStep: 1,
});

const FOREX_MAJORS: InstrumentConfig[] = [
  ["EURUSD", "Euro / US Dollar", "USD", 0.0001],
  ["GBPUSD", "British Pound / US Dollar", "USD", 0.0001],
  ["USDJPY", "US Dollar / Japanese Yen", "JPY", 0.01],
  ["USDCHF", "US Dollar / Swiss Franc", "CHF", 0.0001],
  ["USDCAD", "US Dollar / Canadian Dollar", "CAD", 0.0001],
  ["AUDUSD", "Australian Dollar / US Dollar", "USD", 0.0001],
  ["NZDUSD", "New Zealand Dollar / US Dollar", "USD", 0.0001],
].map(([symbol, displayName, quoteCurrency, pipSize]) =>
  createForexInstrument(
    symbol as string,
    displayName as string,
    "Forex majors",
    quoteCurrency as string,
    pipSize as number,
  ),
);

const FOREX_MINORS: InstrumentConfig[] = [
  ["EURGBP", "GBP"],
  ["EURJPY", "JPY"],
  ["EURAUD", "AUD"],
  ["EURCAD", "CAD"],
  ["EURCHF", "CHF"],
  ["EURNZD", "NZD"],
  ["GBPJPY", "JPY"],
  ["GBPAUD", "AUD"],
  ["GBPCAD", "CAD"],
  ["GBPCHF", "CHF"],
  ["GBPNZD", "NZD"],
  ["AUDJPY", "JPY"],
  ["AUDCAD", "CAD"],
  ["AUDCHF", "CHF"],
  ["AUDNZD", "NZD"],
  ["CADJPY", "JPY"],
  ["CADCHF", "CHF"],
  ["CHFJPY", "JPY"],
  ["NZDJPY", "JPY"],
  ["NZDCAD", "CAD"],
  ["NZDCHF", "CHF"],
].map(([symbol, quoteCurrency]) =>
  createForexInstrument(
    symbol as string,
    symbol as string,
    "Forex minors",
    quoteCurrency as string,
    quoteCurrency === "JPY" ? 0.01 : 0.0001,
  ),
);

const createNonForexInstrument = (
  symbol: string,
  displayName: string,
  category: Exclude<InstrumentCategory, "Forex majors" | "Forex minors">,
  calculationType: Exclude<CalculationType, "pip">,
  tickOrPointSize: number,
  contractSize: number,
  quoteCurrency: string,
): InstrumentConfig => ({
  symbol,
  displayName,
  category,
  pipSize: tickOrPointSize,
  contractSize,
  quoteCurrency,
  decimalPrecision: 2,
  defaultLotSize: 1,
  minLotSize: 0.01,
  lotStep: 0.01,
  calculationType,
  valuePerUnitPerLot: tickOrPointSize * contractSize,
  minMove: calculationType === "tick" ? 0.1 : 1,
  moveStep: calculationType === "tick" ? 0.1 : 1,
});

const XAUUSD: InstrumentConfig = {
  symbol: "XAUUSD",
  displayName: "Gold / US Dollar",
  category: "Metals",
  pipSize: 0.1,
  contractSize: 100,
  quoteCurrency: "USD",
  decimalPrecision: 2,
  defaultLotSize: 0.01,
  minLotSize: 0.01,
  lotStep: 0.01,
  calculationType: "pip",
  valuePerUnitPerLot: 10,
  minMove: 1,
  moveStep: 1,
  contractBasis: "100 oz / lot",
  supportingText: "Based on the BlackPips XAUUSD pip convention.",
  disclaimer:
    "Gold pip conventions and contract specifications may vary by broker. Confirm the specification used by your broker.",
};

const NON_FOREX: InstrumentConfig[] = [
  XAUUSD,
  createNonForexInstrument("XAGUSD", "Silver / US Dollar", "Metals", "tick", 0.01, 5_000, "USD"),
  createNonForexInstrument(
    "US30",
    "US Wall Street 30",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "USD",
  ),
  createNonForexInstrument(
    "NAS100",
    "US Nasdaq 100",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "USD",
  ),
  createNonForexInstrument(
    "SPX500",
    "US S&P 500",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "USD",
  ),
  createNonForexInstrument(
    "GER40",
    "Germany 40",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "EUR",
  ),
  createNonForexInstrument(
    "UK100",
    "UK 100",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "GBP",
  ),
  createNonForexInstrument(
    "JP225",
    "Japan 225",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "JPY",
  ),
  createNonForexInstrument("USOIL", "US Oil", "Energy", "tick", 0.01, 1_000, "USD"),
  createNonForexInstrument("UKOIL", "UK Oil", "Energy", "tick", 0.01, 1_000, "USD"),
  createNonForexInstrument("BTCUSD", "Bitcoin / US Dollar", "Crypto", "point", 1, 1, "USD"),
  createNonForexInstrument("ETHUSD", "Ethereum / US Dollar", "Crypto", "point", 1, 1, "USD"),
];

export const INSTRUMENTS = [...FOREX_MAJORS, ...FOREX_MINORS, ...NON_FOREX];

export function calculateEstimatedValue(
  instrument: InstrumentConfig,
  lotSize: number,
  numberOfPipsOrUnits: number,
) {
  return instrument.valuePerUnitPerLot * lotSize * numberOfPipsOrUnits;
}

/** Rates are currency units per EUR, matching the ECB/Frankfurter representation. */
export function convertReferenceCurrency(
  amount: number,
  from: string,
  to: string,
  unitsPerEur: Readonly<Record<string, number>>,
) {
  if (from === to) return amount;
  const fromRate = from === "EUR" ? 1 : unitsPerEur[from];
  const toRate = to === "EUR" ? 1 : unitsPerEur[to];
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null;
  return (amount / fromRate) * toRate;
}

export function isValidLotSize(instrument: InstrumentConfig, lotSize: number) {
  const stepOffset = (lotSize - instrument.minLotSize) / instrument.lotStep;
  return (
    Number.isFinite(lotSize) &&
    lotSize >= instrument.minLotSize &&
    Math.abs(stepOffset - Math.round(stepOffset)) < 0.000001
  );
}

export const CATEGORY_ORDER: InstrumentCategory[] = [
  "Forex majors",
  "Forex minors",
  "Metals",
  "Indices / futures-style instruments",
  "Energy",
  "Crypto",
];
