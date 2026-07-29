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
  /** Conservative USD configuration estimate; broker specifications can differ. */
  usdValuePerUnitPerLot: number;
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
  quoteToUsdEstimate: number,
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
  usdValuePerUnitPerLot: pipSize * 100_000 * quoteToUsdEstimate,
  minMove: 1,
  moveStep: 1,
});

const FOREX_MAJORS: InstrumentConfig[] = [
  ["EURUSD", "Euro / US Dollar", "USD", 0.0001, 1],
  ["GBPUSD", "British Pound / US Dollar", "USD", 0.0001, 1],
  ["USDJPY", "US Dollar / Japanese Yen", "JPY", 0.01, 0.0064],
  ["USDCHF", "US Dollar / Swiss Franc", "CHF", 0.0001, 1.12],
  ["USDCAD", "US Dollar / Canadian Dollar", "CAD", 0.0001, 0.73],
  ["AUDUSD", "Australian Dollar / US Dollar", "USD", 0.0001, 1],
  ["NZDUSD", "New Zealand Dollar / US Dollar", "USD", 0.0001, 1],
].map(([symbol, displayName, quoteCurrency, pipSize, quoteToUsdEstimate]) =>
  createForexInstrument(
    symbol as string,
    displayName as string,
    "Forex majors",
    quoteCurrency as string,
    pipSize as number,
    quoteToUsdEstimate as number,
  ),
);

const FOREX_MINORS: InstrumentConfig[] = [
  ["EURGBP", "GBP", 1.27],
  ["EURJPY", "JPY", 0.0064],
  ["EURAUD", "AUD", 0.65],
  ["EURCAD", "CAD", 0.73],
  ["EURCHF", "CHF", 1.12],
  ["EURNZD", "NZD", 0.61],
  ["GBPJPY", "JPY", 0.0064],
  ["GBPAUD", "AUD", 0.65],
  ["GBPCAD", "CAD", 0.73],
  ["GBPCHF", "CHF", 1.12],
  ["GBPNZD", "NZD", 0.61],
  ["AUDJPY", "JPY", 0.0064],
  ["AUDCAD", "CAD", 0.73],
  ["AUDCHF", "CHF", 1.12],
  ["AUDNZD", "NZD", 0.61],
  ["CADJPY", "JPY", 0.0064],
  ["CADCHF", "CHF", 1.12],
  ["CHFJPY", "JPY", 0.0064],
  ["NZDJPY", "JPY", 0.0064],
  ["NZDCAD", "CAD", 0.73],
  ["NZDCHF", "CHF", 1.12],
].map(([symbol, quoteCurrency, quoteToUsdEstimate]) =>
  createForexInstrument(
    symbol as string,
    symbol as string,
    "Forex minors",
    quoteCurrency as string,
    quoteCurrency === "JPY" ? 0.01 : 0.0001,
    quoteToUsdEstimate as number,
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
  conversion: number,
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
  usdValuePerUnitPerLot: tickOrPointSize * contractSize * conversion,
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
  usdValuePerUnitPerLot: 10,
  minMove: 1,
  moveStep: 1,
  contractBasis: "100 oz / lot",
  supportingText: "Based on the BlackPips XAUUSD pip convention.",
  disclaimer:
    "Gold pip conventions and contract specifications may vary by broker. Confirm the specification used by your broker.",
};

const NON_FOREX: InstrumentConfig[] = [
  XAUUSD,
  createNonForexInstrument("XAGUSD", "Silver / US Dollar", "Metals", "tick", 0.01, 5_000, "USD", 2),
  createNonForexInstrument(
    "US30",
    "US Wall Street 30",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "USD",
    1,
  ),
  createNonForexInstrument(
    "NAS100",
    "US Nasdaq 100",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "USD",
    1,
  ),
  createNonForexInstrument(
    "SPX500",
    "US S&P 500",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "USD",
    1,
  ),
  createNonForexInstrument(
    "GER40",
    "Germany 40",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "EUR",
    1.08,
  ),
  createNonForexInstrument(
    "UK100",
    "UK 100",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "GBP",
    1.27,
  ),
  createNonForexInstrument(
    "JP225",
    "Japan 225",
    "Indices / futures-style instruments",
    "point",
    1,
    1,
    "JPY",
    0.0064,
  ),
  createNonForexInstrument("USOIL", "US Oil", "Energy", "tick", 0.01, 1_000, "USD", 2),
  createNonForexInstrument("UKOIL", "UK Oil", "Energy", "tick", 0.01, 1_000, "USD", 2),
  createNonForexInstrument("BTCUSD", "Bitcoin / US Dollar", "Crypto", "point", 1, 1, "USD", 1),
  createNonForexInstrument("ETHUSD", "Ethereum / US Dollar", "Crypto", "point", 1, 1, "USD", 1),
];

export const INSTRUMENTS = [...FOREX_MAJORS, ...FOREX_MINORS, ...NON_FOREX];

export function calculateEstimatedValue(
  instrument: InstrumentConfig,
  lotSize: number,
  numberOfPipsOrUnits: number,
) {
  return instrument.usdValuePerUnitPerLot * lotSize * numberOfPipsOrUnits;
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
