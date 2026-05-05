import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const labelV = v.union(v.literal("positive"), v.literal("neutral"), v.literal("negative"));

export const recent = query({
  args: { symbol: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { symbol, limit = 20 }) => {
    return await ctx.db
      .query("news")
      .withIndex("by_symbol_time", (q) => q.eq("symbol", symbol))
      .order("desc")
      .take(limit);
  },
});

export const upsert = mutation({
  args: {
    symbol: v.string(),
    title: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    summary: v.optional(v.string()),
    finbertScore: v.number(),
    finbertLabel: labelV,
    finbertConfidence: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("news")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("news", args);
  },
});
