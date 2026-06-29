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

export async function fetchSentimentWire(symbol: string): Promise<SentimentWireResponse> {
  return mlGet(`/sentiment?symbol=${encodeURIComponent(symbol)}`);
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
