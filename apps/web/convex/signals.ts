import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const actionV = v.union(v.literal("buy"), v.literal("hold"), v.literal("sell"));

export const latest = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    return await ctx.db
      .query("signals")
      .withIndex("by_symbol_time", (q) => q.eq("symbol", symbol))
      .order("desc")
      .first();
  },
});

export const insert = mutation({
  args: {
    symbol: v.string(),
    timestamp: v.number(),
    indicators: v.object({
      rsi: v.number(),
      macd: v.number(),
      macdSignal: v.number(),
      macdHist: v.number(),
      ma20: v.number(),
      ma50: v.number(),
      ma200: v.number(),
      bbUpper: v.number(),
      bbMiddle: v.number(),
      bbLower: v.number(),
      atr: v.number(),
      obv: v.number(),
      vwap: v.optional(v.number()),
    }),
    rl: v.optional(v.object({ action: actionV, confidence: v.number() })),
    sentiment: v.optional(
      v.object({ finbertScore: v.number(), consensus: v.number(), articles: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("signals", args);
  },
});
