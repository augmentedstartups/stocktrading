import universe from "@/lib/data/tickerUniverse.json";

type Ticker = { symbol: string; name: string };

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
};

const UNIVERSE = universe as Ticker[];
const SUPPORTED_QUOTE_TYPES = new Set(["EQUITY", "ETF", "INDEX"]);
const LIMIT = 50;

export const runtime = "nodejs";

function rankLocal(query: string): Ticker[] {
  const q = query.toUpperCase();
  const starts: Ticker[] = [];
  const nameStarts: Ticker[] = [];
  const contains: Ticker[] = [];

  for (const t of UNIVERSE) {
    const name = t.name.toUpperCase();
    if (t.symbol === q) {
      starts.unshift(t);
    } else if (t.symbol.startsWith(q)) {
      starts.push(t);
    } else if (name.startsWith(q)) {
      nameStarts.push(t);
    } else if (t.symbol.includes(q) || name.includes(q)) {
      contains.push(t);
    }
    if (starts.length >= LIMIT) break;
  }

  return [...starts, ...nameStarts, ...contains].slice(0, LIMIT);
}

async function fetchYahoo(query: string): Promise<Ticker[]> {
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "50");
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("enableFuzzyQuery", "false");

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { quotes?: YahooQuote[] };
    return (data.quotes ?? [])
      .filter((q) => q.symbol && SUPPORTED_QUOTE_TYPES.has(q.quoteType ?? ""))
      .map((q) => ({
        symbol: q.symbol!.toUpperCase(),
        name: q.shortname ?? q.longname ?? q.symbol!,
      }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ results: [] });

  const local = rankLocal(query);
  const remote = await fetchYahoo(query);

  const seen = new Set<string>();
  const results: Ticker[] = [];
  for (const t of [...local, ...remote]) {
    if (seen.has(t.symbol)) continue;
    seen.add(t.symbol);
    results.push(t);
  }

  return Response.json({ results: results.slice(0, LIMIT) });
}
