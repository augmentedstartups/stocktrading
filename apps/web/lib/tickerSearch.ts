export type TickerSearchOption = { symbol: string; name?: string; aliases?: string[] };

const FALLBACK_ALIASES: Record<string, string[]> = {
  SPCX: ["SpaceX", "Space X", "Space Exploration Technologies"],
  RKLB: ["Rocket Lab"],
  SPCE: ["Virgin Galactic"],
};

type RankedTicker = TickerSearchOption & { score: number };

function normalizeSearchText(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function levenshteinDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }

  return prev[b.length];
}

function fuzzyScore(query: string, candidate: string): number | null {
  if (!candidate) return null;
  const distance = levenshteinDistance(query, candidate);
  const ratio = distance / Math.max(query.length, candidate.length);
  return ratio <= 0.45 ? 60 + ratio * 100 : null;
}

function tickerAliases(ticker: TickerSearchOption): string[] {
  return ticker.aliases?.length ? ticker.aliases : (FALLBACK_ALIASES[ticker.symbol] ?? []);
}


function scoreTicker(query: string, ticker: TickerSearchOption): number | null {
  const symbol = normalizeSearchText(ticker.symbol);
  const name = normalizeSearchText(ticker.name ?? "");
  const words = (ticker.name ?? "").split(/\s+/).map(normalizeSearchText).filter(Boolean);
  const aliases = tickerAliases(ticker).map(normalizeSearchText).filter(Boolean);

  if (symbol === query) return 0;
  if (name === query) return 1;
  if (aliases.some((alias) => alias === query)) return 2;
  if (aliases.some((alias) => alias.startsWith(query) || query.startsWith(alias))) return 12;
  if (symbol.startsWith(query)) return 10 + symbol.length - query.length;
  if (words.some((word) => word.startsWith(query))) return 20;
  if (name.startsWith(query)) return 25 + name.length - query.length;
  if (symbol.includes(query)) return 30 + symbol.indexOf(query);
  if (name.includes(query)) return 40 + name.indexOf(query) / 10;

  const candidates = [symbol, name, ...words].filter(Boolean);
  const scores = candidates
    .map((candidate) => fuzzyScore(query, candidate))
    .filter((score): score is number => score != null);

  return scores.length ? Math.min(...scores) : null;
}

export function searchTickers(
  query: string,
  tickers: TickerSearchOption[],
  limit = 8,
): TickerSearchOption[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const seen = new Set<string>();
  const ranked: RankedTicker[] = [];

  for (const ticker of tickers) {
    const symbol = ticker.symbol.toUpperCase();
    if (seen.has(symbol)) continue;
    seen.add(symbol);

    const score = scoreTicker(normalizedQuery, ticker);
    if (score == null) continue;
    ranked.push({ ...ticker, symbol, score });
  }

  return ranked
    .sort((a, b) => a.score - b.score || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map(({ score: _score, ...ticker }) => ticker);
}
