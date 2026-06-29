import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { syncTickerPresets } from "./tickerPresets";

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
    market: v.union(v.literal("US"), v.literal("JSE"), v.literal("INDEX"), v.literal("GLOBAL")),
    sector: v.optional(v.string()),
    currency: v.string(),
    logoUrl: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
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
    await syncTickerPresets(ctx);
  },
});
