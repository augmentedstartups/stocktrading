import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tickers").collect();
  },
});

export const get = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    return await ctx.db
      .query("tickers")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();
  },
});

export const upsert = mutation({
  args: {
    symbol: v.string(),
    name: v.string(),
    market: v.union(v.literal("US"), v.literal("JSE"), v.literal("INDEX")),
    sector: v.optional(v.string()),
    currency: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tickers")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("tickers", args);
  },
});

export const seedPresets = mutation({
  args: {},
  handler: async (ctx) => {
    const presets: Array<{
      symbol: string;
      name: string;
      market: "US" | "JSE" | "INDEX";
      currency: string;
      sector?: string;
      logoUrl?: string;
    }> = [
      { symbol: "AAPL", name: "Apple Inc.", market: "US", currency: "USD", sector: "Technology", logoUrl: "https://logo.clearbit.com/apple.com" },
      { symbol: "MSFT", name: "Microsoft Corp.", market: "US", currency: "USD", sector: "Technology", logoUrl: "https://logo.clearbit.com/microsoft.com" },
      { symbol: "GOOGL", name: "Alphabet Inc.", market: "US", currency: "USD", sector: "Technology", logoUrl: "https://logo.clearbit.com/abc.xyz" },
      { symbol: "META", name: "Meta Platforms", market: "US", currency: "USD", sector: "Technology", logoUrl: "https://logo.clearbit.com/meta.com" },
      { symbol: "AMZN", name: "Amazon.com", market: "US", currency: "USD", sector: "Consumer Discretionary", logoUrl: "https://logo.clearbit.com/amazon.com" },
      { symbol: "NVDA", name: "NVIDIA Corp.", market: "US", currency: "USD", sector: "Semiconductors", logoUrl: "https://logo.clearbit.com/nvidia.com" },
      { symbol: "INTC", name: "Intel Corp.", market: "US", currency: "USD", sector: "Semiconductors", logoUrl: "https://logo.clearbit.com/intel.com" },
      { symbol: "TSLA", name: "Tesla Inc.", market: "US", currency: "USD", sector: "Consumer Discretionary", logoUrl: "https://logo.clearbit.com/tesla.com" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF", market: "INDEX", currency: "USD" },
      { symbol: "QQQ", name: "Invesco QQQ Trust", market: "INDEX", currency: "USD" },
      { symbol: "NPN.JO", name: "Naspers Ltd", market: "JSE", currency: "ZAR", sector: "Communication Services" },
      { symbol: "FSR.JO", name: "FirstRand Ltd", market: "JSE", currency: "ZAR", sector: "Financials" },
      { symbol: "SBK.JO", name: "Standard Bank Group", market: "JSE", currency: "ZAR", sector: "Financials" },
      { symbol: "SHP.JO", name: "Shoprite Holdings", market: "JSE", currency: "ZAR", sector: "Consumer Staples" },
    ];
    for (const p of presets) {
      const ex = await ctx.db
        .query("tickers")
        .withIndex("by_symbol", (q) => q.eq("symbol", p.symbol))
        .first();
      if (!ex) await ctx.db.insert("tickers", p);
    }
  },
});
