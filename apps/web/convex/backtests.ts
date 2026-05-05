import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const strategyV = v.union(
  v.literal("rl"),
  v.literal("technical"),
  v.literal("buyhold"),
  v.literal("council"),
);

export const get = query({
  args: { symbol: v.string(), strategy: strategyV },
  handler: async (ctx, { symbol, strategy }) => {
    return await ctx.db
      .query("backtests")
      .withIndex("by_symbol_strategy", (q) => q.eq("symbol", symbol).eq("strategy", strategy))
      .order("desc")
      .first();
  },
});

export const insert = mutation({
  args: {
    symbol: v.string(),
    strategy: strategyV,
    startDate: v.string(),
    endDate: v.string(),
    sharpe: v.number(),
    maxDrawdown: v.number(),
    totalReturn: v.number(),
    equityCurve: v.array(v.object({ t: v.number(), v: v.number() })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("backtests", { ...args, createdAt: Date.now() });
  },
});
