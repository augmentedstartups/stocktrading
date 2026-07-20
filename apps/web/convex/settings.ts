import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_INDICATORS = ["MA50", "MA200", "RSI", "Volume", "News"];

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const ensure = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("settings", {
      userId,
      markets: ["US", "INDEX"],
      categories: ["Tech"],
      frequency: "eod",
      risk: "balanced",
      horizon: "years",
      activeProviders: [
        "local/google/gemma-4-12b",
        "local/gemma-4-e4b-it-mlx",
        "anthropic/claude-opus-4-8",
        "anthropic/claude-sonnet-4-6",
        "google/gemini-3.1-pro-preview",
        "google/gemini-3.5-flash",
        "moonshot/kimi-k3",
        "zai/glm-5.2",
        "minimax/MiniMax-M3",
      ],
      indicators: DEFAULT_INDICATORS,
      theme: "system",
    });
  },
});

export const setIndicators = mutation({
  args: { userId: v.id("users"), indicators: v.array(v.string()) },
  handler: async (ctx, { userId, indicators }) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!s) throw new Error("settings missing");
    await ctx.db.patch(s._id, { indicators });
  },
});

export const setActiveProviders = mutation({
  args: { userId: v.id("users"), activeProviders: v.array(v.string()) },
  handler: async (ctx, { userId, activeProviders }) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!s) throw new Error("settings missing");
    await ctx.db.patch(s._id, { activeProviders });
  },
});

export const setHorizon = mutation({
  args: {
    userId: v.id("users"),
    horizon: v.union(
      v.literal("days"),
      v.literal("weeks"),
      v.literal("months"),
      v.literal("years"),
    ),
  },
  handler: async (ctx, { userId, horizon }) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!s) throw new Error("settings missing");
    await ctx.db.patch(s._id, { horizon });
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    markets: v.optional(v.array(v.union(v.literal("US"), v.literal("JSE"), v.literal("INDEX")))),
    categories: v.optional(v.array(v.string())),
    frequency: v.optional(v.union(v.literal("eod"), v.literal("15min"), v.literal("realtime"))),
    risk: v.optional(v.union(v.literal("conservative"), v.literal("balanced"), v.literal("aggressive"))),
    horizon: v.optional(v.union(v.literal("days"), v.literal("weeks"), v.literal("months"), v.literal("years"))),
    activeProviders: v.optional(v.array(v.string())),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  },
  handler: async (ctx, { userId, ...patch }) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!s) throw new Error("settings missing");
    await ctx.db.patch(s._id, patch);
  },
});
