export const journalColumns = [
  { key: "pair", heading: "Pair", width: "minmax(6rem, .9fr)" },
  { key: "trade_at", heading: "Trade date", width: "minmax(7rem, 1fr)" },
  { key: "direction", heading: "Trade type", width: "minmax(6.5rem, .85fr)" },
  { key: "session", heading: "Session", width: "minmax(7rem, .9fr)" },
  { key: "strategy", heading: "Strategy", width: "minmax(10rem, 1.3fr)" },
  { key: "entry_price", heading: "Entry", width: "minmax(7rem, .8fr)" },
  { key: "stop_loss", heading: "Stop loss", width: "minmax(7rem, .8fr)" },
  { key: "take_profit", heading: "Take profit", width: "minmax(7rem, .8fr)" },
  { key: "exit_price", heading: "Exit", width: "minmax(7rem, .8fr)" },
  { key: "result", heading: "Result", width: "minmax(6rem, .7fr)" },
  { key: "risk_reward_ratio", heading: "RR", width: "minmax(4.5rem, .55fr)" },
  { key: "profit_loss", heading: "P/L", width: "minmax(6rem, .8fr)" },
  { key: "screenshots", heading: "Shots", width: "minmax(4rem, .55fr)" },
  { key: "actions", heading: "Actions", width: "minmax(8rem, .8fr)" },
] as const;

export const journalGridTemplateColumns = journalColumns.map(({ width }) => width).join(" ");
