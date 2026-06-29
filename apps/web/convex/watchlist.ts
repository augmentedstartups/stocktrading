import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  args: { userId: v.id("users"), symbol: v.string() },
  returns: v.id("watchlist"),
  handler: async (ctx, { userId, symbol }) => {
    const ticker = await ctx.db
      .query("tickers")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();
    if (!ticker) throw new Error(`Ticker ${symbol} not found`);

    const ex = await ctx.db
      .query("watchlist")
      .withIndex("by_user_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
      .first();
    if (ex) return ex._id;
    return await ctx.db.insert("watchlist", {
      userId,
      symbol,
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
    const defaults = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "SPY", "QQQ", "NPN.JO"];
    for (const symbol of defaults) {
      const ex = await ctx.db
        .query("watchlist")
        .withIndex("by_user_symbol", (q) => q.eq("userId", userId).eq("symbol", symbol))
        .first();
      if (!ex) {
        await ctx.db.insert("watchlist", {
          userId,
          symbol,
          favorite: ["AAPL", "NVDA"].includes(symbol),
          addedAt: Date.now(),
        });
      }
    }
  },
});
