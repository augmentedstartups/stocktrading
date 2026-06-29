export type FundamentalInfo = {
  shortName?: string;
  longName?: string;
  forwardPE?: number | null;
  priceToSalesTrailing12Months?: number | null;
  enterpriseToEbitda?: number | null;
  operatingMargins?: number | null;
  trailingEps?: number | null;
};

export type BenchmarkInfo = FundamentalInfo & { symbol: string; label: string };

export type MetricKey =
  | "forwardPE"
  | "priceToSalesTrailing12Months"
  | "enterpriseToEbitda"
  | "operatingMargins"
  | "trailingEps";

type MetricDef = {
  key: MetricKey;
  index: number;
  category: string;
  title: string;
  analogy: string;
  leftLabel: string;
  rightLabel: string;
  gradient: "green-to-red" | "red-to-green";
  format: (v: number | null | undefined) => string;
  position: (v: number | null | undefined) => number;
  chipFormat: (v: number | null | undefined) => string;
  summary: (name: string, v: number | null | undefined) => string;
  severity: (v: number | null | undefined) => "good" | "warn" | "bad" | "neutral";
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function logPos(v: number, lo: number, hi: number) {
  if (v <= 0 || !Number.isFinite(v)) return 95;
  const a = Math.log(lo);
  const b = Math.log(hi);
  return clamp(((Math.log(v) - a) / (b - a)) * 100);
}

function linearPos(v: number, lo: number, hi: number) {
  return clamp(((v - lo) / (hi - lo)) * 100);
}

export const METRIC_DEFS: MetricDef[] = [
  {
    key: "forwardPE",
    index: 1,
    category: "PRICE VS EARNINGS",
    title: "Forward P/E ratio",
    analogy:
      "Imagine you buy a lemonade stand. The forward P/E tells you how many years of future profit you'd need to earn back your purchase price. Lower means cheaper relative to expected earnings.",
    leftLabel: "Cheap",
    rightLabel: "Expensive",
    gradient: "green-to-red",
    format: (v) => (v != null && v > 0 ? `${Math.round(v)}x` : "N/A"),
    chipFormat: (v) => (v != null && v > 0 ? `~${Math.round(v)}x` : "N/A"),
    position: (v) => (v == null || v <= 0 ? 95 : logPos(v, 8, 120)),
    severity: (v) => {
      if (v == null || v <= 0) return "bad";
      if (v < 20) return "good";
      if (v < 40) return "warn";
      return "bad";
    },
    summary: (name, v) => {
      if (v == null || v <= 0) return `${name} has no meaningful forward P/E — often a sign of losses or thin estimates.`;
      if (v > 80) return `${name} trades at ${Math.round(v)}x forward earnings — priced for explosive growth or a very long payoff.`;
      if (v > 40) return `${name} at ${Math.round(v)}x forward earnings is expensive versus typical large caps.`;
      if (v < 15) return `${name} at ${Math.round(v)}x forward earnings looks relatively cheap on this measure.`;
      return `${name} at ${Math.round(v)}x forward earnings sits in a normal range for a profitable company.`;
    },
  },
  {
    key: "priceToSalesTrailing12Months",
    index: 2,
    category: "PRICE VS REVENUE",
    title: "Price-to-Sales (P/S)",
    analogy:
      "How much you pay for every $1 of sales. A P/S of 10 means investors pay $10 for each dollar the company sells — common for high-growth firms, rare for mature ones.",
    leftLabel: "Cheap",
    rightLabel: "Expensive",
    gradient: "green-to-red",
    format: (v) => (v != null && v > 0 ? `${Math.round(v)}x` : "N/A"),
    chipFormat: (v) => (v != null && v > 0 ? `~${Math.round(v)}x` : "N/A"),
    position: (v) => (v == null || v <= 0 ? 95 : logPos(v, 1, 80)),
    severity: (v) => {
      if (v == null || v <= 0) return "neutral";
      if (v < 3) return "good";
      if (v < 10) return "warn";
      return "bad";
    },
    summary: (name, v) => {
      if (v == null || v <= 0) return `P/S is unavailable for ${name}.`;
      if (v > 30) return `${name}'s ${Math.round(v)}x P/S is sky-high — the market is paying a premium far beyond current revenue.`;
      if (v > 10) return `${name} at ${Math.round(v)}x sales is priced like a high-growth story, not a steady earner.`;
      return `${name} at ${Math.round(v)}x sales is closer to typical large-cap levels.`;
    },
  },
  {
    key: "enterpriseToEbitda",
    index: 3,
    category: "TOTAL PRICE TAG",
    title: "EV/EBITDA",
    analogy:
      "The real total price tag — stock price plus debt, minus cash — divided by operating cash flow (EBITDA). It's how buyout firms think about value.",
    leftLabel: "Cheap",
    rightLabel: "Expensive",
    gradient: "green-to-red",
    format: (v) => (v != null && v > 0 ? `${Math.round(v)}x` : "N/A"),
    chipFormat: (v) => (v != null && v > 0 ? `~${Math.round(v)}x` : "N/A"),
    position: (v) => (v == null || v <= 0 ? 95 : logPos(v, 5, 150)),
    severity: (v) => {
      if (v == null || v <= 0) return "bad";
      if (v < 12) return "good";
      if (v < 25) return "warn";
      return "bad";
    },
    summary: (name, v) => {
      if (v == null || v <= 0) return `${name} has no usable EV/EBITDA — often negative cash flow or heavy investment phase.`;
      if (v > 50) return `${name}'s ${Math.round(v)}x EV/EBITDA is in rare territory versus profitable peers.`;
      if (v > 25) return `${name} at ${Math.round(v)}x EV/EBITDA looks rich on a cash-flow basis.`;
      return `${name} at ${Math.round(v)}x EV/EBITDA is within a more conventional range.`;
    },
  },
  {
    key: "operatingMargins",
    index: 4,
    category: "PROFIT ENGINE",
    title: "Operating margin",
    analogy:
      "For every $100 in sales, how many dollars stay after running the business (before interest and taxes). Positive means the core business makes money; negative means it burns on operations.",
    leftLabel: "Losing",
    rightLabel: "Profitable",
    gradient: "red-to-green",
    format: (v) => (v != null ? `${Math.round(v * 100)}%` : "N/A"),
    chipFormat: (v) => (v != null ? `~${Math.round(v * 100)}%` : "N/A"),
    position: (v) => (v == null ? 50 : linearPos(v, -0.5, 0.35)),
    severity: (v) => {
      if (v == null) return "neutral";
      if (v < 0) return "bad";
      if (v < 0.1) return "warn";
      return "good";
    },
    summary: (name, v) => {
      if (v == null) return `Operating margin data is unavailable for ${name}.`;
      const pct = Math.round(v * 100);
      if (v < 0) return `${name} runs at ${pct}% operating margin — the core business is losing money on each sale.`;
      if (v < 0.1) return `${name}'s ${pct}% operating margin is thin; small cost shocks hurt.`;
      return `${name}'s ${pct}% operating margin shows a healthy profit engine.`;
    },
  },
  {
    key: "trailingEps",
    index: 5,
    category: "BOTTOM LINE",
    title: "Trailing EPS",
    analogy:
      "Profit per share over the last 12 months. This is the bottom line — what actually landed for shareholders after all expenses.",
    leftLabel: "Negative",
    rightLabel: "Positive",
    gradient: "red-to-green",
    format: (v) => {
      if (v == null) return "N/A";
      if (v < 0) return "Negative";
      return `$${v.toFixed(2)}`;
    },
    chipFormat: (v) => {
      if (v == null) return "N/A";
      if (v < 0) return "Negative";
      return `$${v.toFixed(2)}`;
    },
    position: (v) => {
      if (v == null) return 50;
      if (v < 0) return clamp(10 + v * 5, 2, 20);
      return clamp(50 + v * 15, 55, 95);
    },
    severity: (v) => {
      if (v == null) return "neutral";
      if (v < 0) return "bad";
      if (v < 1) return "warn";
      return "good";
    },
    summary: (name, v) => {
      if (v == null) return `Trailing EPS is unavailable for ${name}.`;
      if (v < 0) return `${name} reported negative trailing EPS — the company burned cash, not earned it, over the last year.`;
      return `${name} earned $${v.toFixed(2)} per share over the last 12 months.`;
    },
  },
];

export const BENCHMARK_LABELS: Record<string, string> = {
  AAPL: "Apple",
  NVDA: "Nvidia",
  SPY: "S&P 500",
};

export function metricValue(info: FundamentalInfo, key: MetricKey): number | null | undefined {
  return info[key];
}
