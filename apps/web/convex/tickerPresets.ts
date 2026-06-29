import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export type TickerPreset = {
  symbol: string;
  name: string;
  market: "US" | "JSE" | "INDEX";
  currency: string;
  sector?: string;
  logoUrl?: string;
  aliases?: string[];
};

export const TICKER_PRESETS: TickerPreset[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    market: "US",
    currency: "USD",
    sector: "Technology",
    logoUrl: "https://logo.clearbit.com/apple.com",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    market: "US",
    currency: "USD",
    sector: "Technology",
    logoUrl: "https://logo.clearbit.com/microsoft.com",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    market: "US",
    currency: "USD",
    sector: "Technology",
    logoUrl: "https://logo.clearbit.com/abc.xyz",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    market: "US",
    currency: "USD",
    sector: "Technology",
    logoUrl: "https://logo.clearbit.com/meta.com",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com",
    market: "US",
    currency: "USD",
    sector: "Consumer Discretionary",
    logoUrl: "https://logo.clearbit.com/amazon.com",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    market: "US",
    currency: "USD",
    sector: "Semiconductors",
    logoUrl: "https://logo.clearbit.com/nvidia.com",
  },
  {
    symbol: "INTC",
    name: "Intel Corp.",
    market: "US",
    currency: "USD",
    sector: "Semiconductors",
    logoUrl: "https://logo.clearbit.com/intel.com",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    market: "US",
    currency: "USD",
    sector: "Consumer Discretionary",
    logoUrl: "https://logo.clearbit.com/tesla.com",
  },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", market: "INDEX", currency: "USD" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", market: "INDEX", currency: "USD" },
  {
    symbol: "SPCX",
    name: "Space Exploration Technologies Corp.",
    market: "US",
    currency: "USD",
    sector: "Aerospace",
    logoUrl: "https://logo.clearbit.com/spacex.com",
    aliases: ["SpaceX", "Space X", "Space Exploration Technologies"],
  },
  {
    symbol: "RKLB",
    name: "Rocket Lab USA",
    market: "US",
    currency: "USD",
    sector: "Aerospace",
    aliases: ["Rocket Lab"],
  },
  {
    symbol: "SPCE",
    name: "Virgin Galactic Holdings",
    market: "US",
    currency: "USD",
    sector: "Aerospace",
    aliases: ["Virgin Galactic"],
  },
  {
    symbol: "NPN.JO",
    name: "Naspers Ltd",
    market: "JSE",
    currency: "ZAR",
    sector: "Communication Services",
  },
  {
    symbol: "FSR.JO",
    name: "FirstRand Ltd",
    market: "JSE",
    currency: "ZAR",
    sector: "Financials",
  },
  {
    symbol: "SBK.JO",
    name: "Standard Bank Group",
    market: "JSE",
    currency: "ZAR",
    sector: "Financials",
  },
  {
    symbol: "SHP.JO",
    name: "Shoprite Holdings",
    market: "JSE",
    currency: "ZAR",
    sector: "Consumer Staples",
  },
];

export const DEFAULT_WATCHLIST_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "META",
  "AMZN",
  "TSLA",
  "SPY",
  "QQQ",
  "NPN.JO",
  "SPCX",
] as const;

export async function syncDefaultWatchlist(ctx: MutationCtx, userId: Id<"users">) {
  for (const symbol of DEFAULT_WATCHLIST_SYMBOLS) {
    const ex = await ctx.db
      .query("watchlist")
      .withIndex("by_user_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .first();
    if (!ex) {
      await ctx.db.insert("watchlist", {
        userId,
        symbol,
        favorite: ["AAPL", "NVDA", "SPCX"].includes(symbol),
        addedAt: Date.now(),
      });
    }
  }
}

export async function syncTickerPresets(ctx: MutationCtx) {
  for (const preset of TICKER_PRESETS) {
    const existing = await ctx.db
      .query("tickers")
      .withIndex("by_symbol", (q) => q.eq("symbol", preset.symbol))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, preset);
      continue;
    }
    await ctx.db.insert("tickers", preset);
  }
}
