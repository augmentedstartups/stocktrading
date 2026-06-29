import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { syncDefaultWatchlist } from "./tickerPresets";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    symbol: v.string(),
    name: v.optional(v.string()),
    market: v.optional(
      v.union(v.literal("US"), v.literal("JSE"), v.literal("INDEX"), v.literal("GLOBAL")),
    ),
    currency: v.optional(v.string()),
  },
  returns: v.id("watchlist"),
  handler: async (ctx, { userId, symbol, name, market, currency }) => {
    const normalizedSymbol = symbol.toUpperCase();
    const ticker = await ctx.db
      .query("tickers")
      .withIndex("by_symbol", (q) => q.eq("symbol", normalizedSymbol))
      .first();
    if (!ticker) {
      await ctx.db.insert("tickers", {
        symbol: normalizedSymbol,
        name: name ?? normalizedSymbol,
        market: market ?? "GLOBAL",
        currency: currency ?? "USD",
      });
    }

    const ex = await ctx.db
      .query("watchlist")
      .withIndex("by_user_symbol", (q) => q.eq("userId", userId).eq("symbol", normalizedSymbol))
      .first();
    if (ex) return ex._id;
    return await ctx.db.insert("watchlist", {
      userId,
      symbol: normalizedSymbol,
      favorite: false,
      addedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), symbol: v.string() },
  handler: async (ctx, { userId, symbol }) => {
    const ex = await ctx.db
      .query("watchlist")
      .withIndex("by_user_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .first();
    if (ex) await ctx.db.delete(ex._id);
  },
});

export const toggleFavorite = mutation({
  args: { userId: v.id("users"), symbol: v.string() },
  handler: async (ctx, { userId, symbol }) => {
    const ex = await ctx.db
      .query("watchlist")
      .withIndex("by_user_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .first();
    if (!ex) return;
    await ctx.db.patch(ex._id, { favorite: !ex.favorite });
  },
});

export const seedDefault = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await syncDefaultWatchlist(ctx, userId);
  },
});
