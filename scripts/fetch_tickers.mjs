import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../apps/web/lib/data/tickerUniverse.json");

const SOURCES = [
  {
    url: "https://www.sec.gov/files/company_tickers.json",
    parse: (raw) =>
      Object.values(raw).map((row) => ({
        symbol: String(row.ticker).toUpperCase(),
        name: String(row.title),
      })),
  },
];

async function main() {
  const seen = new Set();
  const tickers = [];

  for (const source of SOURCES) {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "stocktrading-app ticker-sync (contact@example.com)" },
    });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${source.url}`);
    for (const t of source.parse(await res.json())) {
      if (!t.symbol || seen.has(t.symbol)) continue;
      seen.add(t.symbol);
      tickers.push(t);
    }
  }

  tickers.sort((a, b) => a.symbol.localeCompare(b.symbol));
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(tickers));
  console.log(`Wrote ${tickers.length} tickers to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
