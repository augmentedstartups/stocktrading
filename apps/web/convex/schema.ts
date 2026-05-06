import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  settings: defineTable({
    userId: v.id("users"),
    markets: v.array(v.union(v.literal("US"), v.literal("JSE"), v.literal("INDEX"))),
    categories: v.array(v.string()),
    frequency: v.union(v.literal("eod"), v.literal("15min"), v.literal("realtime")),
    risk: v.union(v.literal("conservative"), v.literal("balanced"), v.literal("aggressive")),
    horizon: v.union(v.literal("days"), v.literal("weeks"), v.literal("months"), v.literal("years")),
    activeProviders: v.array(v.string()),
    indicators: v.array(v.string()),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  }).index("by_user", ["userId"]),

  tickers: defineTable({
    symbol: v.string(),
    name: v.string(),
    market: v.union(v.literal("US"), v.literal("JSE"), v.literal("INDEX")),
    sector: v.optional(v.string()),
    currency: v.string(),
    logoUrl: v.optional(v.string()),
  }).index("by_symbol", ["symbol"]),

  watchlist: defineTable({
    userId: v.id("users"),
    symbol: v.string(),
    favorite: v.boolean(),
    addedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_symbol", ["userId", "symbol"]),

  news: defineTable({
    symbol: v.string(),
    title: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    summary: v.optional(v.string()),
    finbertScore: v.number(),
    finbertLabel: v.union(v.literal("positive"), v.literal("neutral"), v.literal("negative")),
    finbertConfidence: v.number(),
  })
    .index("by_symbol_time", ["symbol", "publishedAt"])
    .index("by_url", ["url"]),

  signals: defineTable({
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
    rl: v.optional(
      v.object({
        action: v.union(v.literal("buy"), v.literal("hold"), v.literal("sell")),
        confidence: v.number(),
      }),
    ),
    sentiment: v.optional(
      v.object({
        finbertScore: v.number(),
        consensus: v.number(),
        articles: v.number(),
      }),
    ),
  }).index("by_symbol_time", ["symbol", "timestamp"]),

  decisions: defineTable({
    symbol: v.string(),
    userId: v.optional(v.id("users")),
    timestamp: v.number(),
    action: v.union(v.literal("buy"), v.literal("hold"), v.literal("sell")),
    confidence: v.number(),
    horizon: v.union(v.literal("days"), v.literal("weeks"), v.literal("months"), v.literal("years")),
    reasons: v.array(v.string()),
    perModel: v.array(
      v.object({
        provider: v.string(),
        model: v.string(),
        action: v.union(v.literal("buy"), v.literal("hold"), v.literal("sell")),
        confidence: v.number(),
        reason: v.string(),
        reasons: v.optional(v.array(v.string())),
        latencyMs: v.number(),
        timestamp: v.optional(v.string()),
        ok: v.boolean(),
        error: v.optional(v.string()),
      }),
    ),
    rlInput: v.optional(
      v.object({
        action: v.union(v.literal("buy"), v.literal("hold"), v.literal("sell")),
        confidence: v.number(),
      }),
    ),
    snapshot: v.optional(v.string()),
  })
    .index("by_symbol_time", ["symbol", "timestamp"])
    .index("by_user_time", ["userId", "timestamp"]),

  modelPerformance: defineTable({
    provider: v.string(),
    model: v.string(),
    samples: v.number(),
    correct: v.number(),
    weight: v.number(),
    updatedAt: v.number(),
  }).index("by_provider_model", ["provider", "model"]),

  backtests: defineTable({
    symbol: v.string(),
    strategy: v.union(v.literal("rl"), v.literal("technical"), v.literal("buyhold"), v.literal("council")),
    startDate: v.string(),
    endDate: v.string(),
    sharpe: v.number(),
    maxDrawdown: v.number(),
    totalReturn: v.number(),
    equityCurve: v.array(v.object({ t: v.number(), v: v.number() })),
    createdAt: v.number(),
  }).index("by_symbol_strategy", ["symbol", "strategy"]),
});
