import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const actionV = v.union(v.literal("buy"), v.literal("hold"), v.literal("sell"));
const horizonV = v.union(
  v.literal("days"),
  v.literal("weeks"),
  v.literal("months"),
  v.literal("years"),
);

export const latestForSymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    return await ctx.db
      .query("decisions")
      .withIndex("by_symbol_time", (q) => q.eq("symbol", symbol))
      .order("desc")
      .first();
  },
});

export const recentForUser = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 50 }) => {
    return await ctx.db
      .query("decisions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const latestPerWatchlist = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const wl = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out: Record<string, unknown> = {};
    for (const w of wl) {
      const d = await ctx.db
        .query("decisions")
        .withIndex("by_symbol_time", (q) => q.eq("symbol", w.symbol))
        .order("desc")
        .first();
      out[w.symbol] = d ?? null;
    }
    return out;
  },
});

export const insert = mutation({
  args: {
    symbol: v.string(),
    userId: v.optional(v.id("users")),
    action: actionV,
    confidence: v.number(),
    horizon: horizonV,
    reasons: v.array(v.string()),
    perModel: v.array(
      v.object({
        provider: v.string(),
        model: v.string(),
        action: actionV,
        confidence: v.number(),
        reason: v.string(),
        latencyMs: v.number(),
        ok: v.boolean(),
        error: v.optional(v.string()),
      }),
    ),
    rlInput: v.optional(v.object({ action: actionV, confidence: v.number() })),
    snapshot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("decisions", { ...args, timestamp: Date.now() });
  },
});
