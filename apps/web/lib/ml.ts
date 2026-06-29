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

const NEWS_WIRE_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const FUNDAMENTALS_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type CacheEnvelope<T> = { at: number; data: T };

function readLocalCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - parsed.at > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeLocalCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data } satisfies CacheEnvelope<T>));
  } catch {
    /* quota */
  }
}

function newsWireCacheKey(symbol: string) {
  return `st:news-wire:${symbol.toUpperCase()}`;
}

function fundamentalsCacheKey(symbol: string) {
  return `st:fundamentals:${symbol.toUpperCase()}`;
}

export function getCachedSentimentWire(symbol: string): SentimentWireResponse | null {
  return readLocalCache(newsWireCacheKey(symbol), NEWS_WIRE_CACHE_TTL_MS);
}

function setCachedSentimentWire(symbol: string, data: SentimentWireResponse) {
  writeLocalCache(newsWireCacheKey(symbol), data);
}

export function hydrateSentimentWire(symbol: string) {
  const cached = getCachedSentimentWire(symbol);
  return cached ? applySentimentWire(cached) : null;
}

export async function fetchSentimentWire(symbol: string, refresh = false): Promise<SentimentWireResponse> {
  if (!refresh) {
    const cached = getCachedSentimentWire(symbol);
    if (cached) return cached;
  }
  const data = await mlGet<SentimentWireResponse>(
    `/sentiment?symbol=${encodeURIComponent(symbol)}&refresh=${refresh}`,
  );
  setCachedSentimentWire(symbol, data);
  return data;
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

export function getCachedFundamentals(symbol: string): FundamentalsResponse | null {
  return readLocalCache(fundamentalsCacheKey(symbol), FUNDAMENTALS_CACHE_TTL_MS);
}

function setCachedFundamentals(symbol: string, data: FundamentalsResponse) {
  writeLocalCache(fundamentalsCacheKey(symbol), data);
}

export async function fetchFundamentals(symbol: string, refresh = false): Promise<FundamentalsResponse> {
  if (!refresh) {
    const cached = getCachedFundamentals(symbol);
    if (cached) return cached;
  }
  const data = await mlGet<FundamentalsResponse>(
    `/fundamentals?symbol=${encodeURIComponent(symbol)}&refresh=${refresh}`,
  );
  setCachedFundamentals(symbol, data);
  return data;
}
