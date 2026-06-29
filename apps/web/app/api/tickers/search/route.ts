type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
};

type YahooSearchResponse = {
  quotes?: YahooQuote[];
};

const SUPPORTED_QUOTE_TYPES = new Set(["EQUITY", "ETF", "INDEX"]);

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) return Response.json({ results: [] });

  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "50");
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("enableFuzzyQuery", "false");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return Response.json({ results: [] }, { status: 502 });

    const data = (await response.json()) as YahooSearchResponse;
    const seen = new Set<string>();
    const results = (data.quotes ?? [])
      .filter((quote) => quote.symbol && SUPPORTED_QUOTE_TYPES.has(quote.quoteType ?? ""))
      .map((quote) => ({
        symbol: quote.symbol!.toUpperCase(),
        name: quote.shortname ?? quote.longname ?? quote.symbol!,
      }))
      .filter((quote) => {
        if (seen.has(quote.symbol)) return false;
        seen.add(quote.symbol);
        return true;
      });

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] }, { status: 502 });
  }
}
