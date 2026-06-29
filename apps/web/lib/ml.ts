const base = () =>
  process.env.ML_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_ML_URL ??
  "http://localhost:58123";

export async function mlGet<T>(path: string): Promise<T> {
  const r = await fetch(`${base()}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function mlPost<T>(path: string): Promise<T> {
  const r = await fetch(`${base()}${path}`, { method: "POST", cache: "no-store" });
  if (!r.ok) throw new Error(`${path} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type SentimentWireArticle = {
  title: string;
  url: string;
  source: string;
  finbertScore: number;
  publishedAt?: number;
};

export type SentimentWireResponse = {
  articles: SentimentWireArticle[];
  aggregate: { score: number; n_articles: number };
};

export async function fetchSentimentWire(symbol: string, refresh = false): Promise<SentimentWireResponse> {
  return mlGet(`/sentiment?symbol=${encodeURIComponent(symbol)}&refresh=${refresh}`);
}

export function applySentimentWire(sj: SentimentWireResponse) {
  return {
    articles: sj.articles ?? [],
    sentiment: {
      finbert: {
        score: sj.aggregate?.score ?? 0,
        n_articles: sj.aggregate?.n_articles ?? 0,
      },
      consensus: sj.aggregate?.score ?? 0,
      llmBlended: false as const,
    },
  };
}

export type FundamentalsInfo = {
  shortName?: string;
  longName?: string;
  forwardPE?: number | null;
  priceToSalesTrailing12Months?: number | null;
  enterpriseToEbitda?: number | null;
  operatingMargins?: number | null;
  trailingEps?: number | null;
};

export type FundamentalsResponse = {
  symbol: string;
  info: FundamentalsInfo & Record<string, unknown>;
  benchmarks?: Record<string, FundamentalsInfo & { shortName?: string }>;
};

const FUNDAMENTALS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function fundamentalsCacheKey(symbol: string) {
  return `st:fundamentals:${symbol.toUpperCase()}`;
}

export function getCachedFundamentals(symbol: string): FundamentalsResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(fundamentalsCacheKey(symbol));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: FundamentalsResponse };
    if (Date.now() - parsed.at > FUNDAMENTALS_CACHE_TTL_MS) {
      localStorage.removeItem(fundamentalsCacheKey(symbol));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedFundamentals(symbol: string, data: FundamentalsResponse) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      fundamentalsCacheKey(symbol),
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    /* quota */
  }
}

export async function fetchFundamentals(symbol: string, refresh = false): Promise<FundamentalsResponse> {
  const data = await mlGet<FundamentalsResponse>(
    `/fundamentals?symbol=${encodeURIComponent(symbol)}&refresh=${refresh}`,
  );
  setCachedFundamentals(symbol, data);
  return data;
}
