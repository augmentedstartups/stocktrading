#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  control,
  post,
  patch,
  q,
  textResult,
  resolveActiveProviders,
  watchlistDecisions,
} from "./client.mjs";
import { formatCouncilDecision, formatHeatmap } from "./summarize.mjs";

const server = new McpServer({
  name: "stockanalysis",
  version: "1.0.0",
});

server.tool(
  "health_check",
  "Check Stock Analysis control API and upstream service status",
  {},
  async () => textResult(await control("/health"))
);

server.tool(
  "list_council_models",
  "List available LLM council models for stock verdicts",
  {},
  async () => textResult(await control("/council/models"))
);

server.tool(
  "get_prices",
  "Get OHLCV price candles for a symbol",
  {
    symbol: z.string().describe("Ticker symbol, e.g. AAPL"),
    period: z.string().optional().describe("History period, default 10y"),
    limit: z.number().int().optional().describe("Max candles to return"),
  },
  async ({ symbol, period, limit }) =>
    textResult(await control(`/prices${q({ symbol, period, limit })}`))
);

server.tool(
  "get_indicators",
  "Get technical indicators (MA, RSI, MACD, BB, ATR, OBV, VWAP) for a symbol",
  {
    symbol: z.string().describe("Ticker symbol"),
    period: z.string().optional().describe("History period, default 10y"),
  },
  async ({ symbol, period }) =>
    textResult(await control(`/indicators${q({ symbol, period })}`))
);

server.tool(
  "get_fundamentals",
  "Get fundamental data (sector, PE, market cap, beta, etc.)",
  { symbol: z.string().describe("Ticker symbol") },
  async ({ symbol }) =>
    textResult(await control(`/fundamentals${q({ symbol })}`))
);

server.tool(
  "get_sentiment",
  "Get FinBERT news sentiment aggregate and articles for a symbol",
  {
    symbol: z.string().describe("Ticker symbol"),
    name: z.string().optional().describe("Company name hint"),
    limit: z.number().int().optional().describe("Max articles, default 25"),
  },
  async ({ symbol, name, limit }) =>
    textResult(await control(`/sentiment${q({ symbol, name, limit })}`))
);

server.tool(
  "deep_sentiment",
  "LLM-enhanced news sentiment beyond FinBERT",
  {
    symbol: z.string().describe("Ticker symbol"),
    name: z.string().optional().describe("Company name hint"),
  },
  async ({ symbol, name }) =>
    textResult(await post("/sentiment/deep", { symbol, name }))
);

server.tool(
  "rl_predict",
  "Get reinforcement-learning buy/hold/sell prediction for a symbol",
  { symbol: z.string().describe("Ticker symbol") },
  async ({ symbol }) =>
    textResult(await control(`/rl/predict${q({ symbol })}`))
);

server.tool(
  "run_council",
  "Run multi-LLM council for one symbol. If activeProviders omitted, uses saved dashboard council models from settings. Decisions persist by default.",
  {
    symbol: z.string().describe("Ticker symbol, e.g. NVDA"),
    userHorizon: z
      .string()
      .optional()
      .describe("Investment horizon, e.g. weeks"),
    userId: z.string().optional().describe("Convex user id for settings"),
    persist: z
      .boolean()
      .optional()
      .describe("Save decision to Convex; default true"),
    activeProviders: z
      .array(z.string())
      .optional()
      .describe(
        "Council model ids to use; omit to use last saved models from settings"
      ),
    summarize: z
      .boolean()
      .optional()
      .describe("Return human-readable per-model summary instead of raw JSON"),
  },
  async ({ summarize, activeProviders, ...args }) => {
    const providers = await resolveActiveProviders(args.userId, activeProviders);
    const payload = { ...args, activeProviders: providers };
    const raw = await post("/council", payload);
    if (!summarize) {
      return textResult({ ...raw, modelsUsed: providers });
    }
    const text = [
      `Models used: ${providers.join(", ")}`,
      "",
      formatCouncilDecision(raw.decision),
    ].join("\n");
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "run_council_batch",
  "Scan symbols with concurrent council verdicts. If activeProviders omitted, uses saved dashboard models. Returns buys, sells, holds sorted by confidence.",
  {
    symbols: z.array(z.string()).min(1).max(40).describe("Ticker symbols"),
    userHorizon: z.string().optional(),
    userId: z.string().optional(),
    persist: z.boolean().optional(),
    concurrency: z.number().int().min(1).max(6).optional().describe("Parallel runs, default 2"),
    activeProviders: z
      .array(z.string())
      .optional()
      .describe("Council model ids; omit to use saved settings"),
  },
  async ({ activeProviders, ...args }) => {
    const providers = await resolveActiveProviders(args.userId, activeProviders);
    const raw = await post("/council/batch", { ...args, activeProviders: providers });
    return textResult({ ...raw, modelsUsed: providers });
  }
);

server.tool(
  "deep_research",
  "Autonomous equity research with web search tools",
  {
    query: z.string().describe("Research question"),
    symbol: z.string().optional().describe("Primary ticker context"),
  },
  async ({ query, symbol }) =>
    textResult(await post("/research", { query, symbol }))
);

server.tool(
  "bootstrap_dashboard",
  "Seed default user, settings, tickers, and watchlist in Convex",
  {},
  async () => textResult(await post("/dashboard/bootstrap", {}))
);

server.tool(
  "get_watchlist",
  "Get the user's watchlist",
  { userId: z.string().optional().describe("Convex user id") },
  async ({ userId }) =>
    textResult(await control(`/dashboard/watchlist${q({ userId })}`))
);

server.tool(
  "add_to_watchlist",
  "Add a symbol to the watchlist",
  {
    symbol: z.string().describe("Ticker symbol"),
    userId: z.string().optional(),
  },
  async ({ symbol, userId }) =>
    textResult(await post("/dashboard/watchlist", { symbol, userId }))
);

server.tool(
  "remove_from_watchlist",
  "Remove a symbol from the watchlist",
  {
    symbol: z.string().describe("Ticker symbol"),
    userId: z.string().optional(),
  },
  async ({ symbol, userId }) =>
    textResult(
      await control("/dashboard/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, userId }),
      })
    )
);

server.tool(
  "get_settings",
  "Get dashboard settings (markets, risk, horizon, council models, theme)",
  { userId: z.string().optional() },
  async ({ userId }) =>
    textResult(await control(`/dashboard/settings${q({ userId })}`))
);

server.tool(
  "update_settings",
  "Update dashboard settings",
  {
    userId: z.string().optional(),
    markets: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    frequency: z.enum(["eod", "15min", "realtime"]).optional(),
    risk: z.enum(["conservative", "balanced", "aggressive"]).optional(),
    horizon: z.enum(["days", "weeks", "months", "years"]).optional(),
    activeProviders: z.array(z.string()).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    indicators: z.array(z.string()).optional(),
  },
  async (args) => textResult(await patch("/dashboard/settings", args))
);

server.tool(
  "list_decisions",
  "List persisted council decisions (raw JSON)",
  {
    userId: z.string().optional(),
    symbol: z.string().optional().describe("Filter to latest for symbol"),
    limit: z.number().int().optional().describe("Max rows, default 50"),
  },
  async ({ userId, symbol, limit }) =>
    textResult(await control(`/dashboard/decisions${q({ userId, symbol, limit })}`))
);

server.tool(
  "get_last_council",
  "Read the most recent persisted council decision for a symbol, formatted with per-model [Technical]/[Fundamentals]/[News]/[RL]/[Model] breakdown",
  {
    symbol: z.string().describe("Ticker symbol"),
    userId: z.string().optional(),
  },
  async ({ symbol, userId }) => {
    const out = await control(
      `/dashboard/decisions${q({ userId, symbol, limit: 1 })}`
    );
    const decision = out?.decisions?.[0];
    if (!decision) {
      return {
        content: [
          {
            type: "text",
            text: `No saved council decision for ${symbol}. Run run_council with persist true first.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: formatCouncilDecision(decision, out.meta ?? {}),
        },
      ],
    };
  }
);

server.tool(
  "get_watchlist_heatmap",
  "Show watchlist tickers grouped as BUY (hot), SELL, HOLD from last saved council decisions. Optionally refresh by re-running council on all symbols.",
  {
    userId: z.string().optional(),
    refresh: z
      .boolean()
      .optional()
      .describe("Re-run council on entire watchlist before summarizing"),
    concurrency: z.number().int().min(1).max(6).optional(),
    activeProviders: z
      .array(z.string())
      .optional()
      .describe("Council models for refresh; omit to use saved settings"),
  },
  async ({ userId, refresh, concurrency, activeProviders }) => {
    const wl = await control(`/dashboard/watchlist${q({ userId })}`);
    const symbols = (wl?.watchlist ?? []).map((w) => w.symbol);
    if (symbols.length === 0) {
      return {
        content: [{ type: "text", text: "Watchlist is empty." }],
      };
    }

    if (refresh) {
      const providers = await resolveActiveProviders(userId, activeProviders);
      await post("/council/batch", {
        symbols,
        userId,
        persist: true,
        concurrency: concurrency ?? 2,
        activeProviders: providers,
      });
    }

    const { watchlist, decisions } = await watchlistDecisions(userId);
    const text = formatHeatmap(watchlist, decisions);
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "scan_watchlist",
  "Run fresh council on every watchlist symbol and return BUY/SELL/HOLD heatmap with confidence scores",
  {
    userId: z.string().optional(),
    concurrency: z.number().int().min(1).max(6).optional(),
    activeProviders: z
      .array(z.string())
      .optional()
      .describe("Council models; omit to use saved settings"),
    persist: z.boolean().optional(),
  },
  async ({ userId, concurrency, activeProviders, persist }) => {
    const wl = await control(`/dashboard/watchlist${q({ userId })}`);
    const symbols = (wl?.watchlist ?? []).map((w) => w.symbol);
    if (symbols.length === 0) {
      return { content: [{ type: "text", text: "Watchlist is empty." }] };
    }
    const providers = await resolveActiveProviders(userId, activeProviders);
    const batch = await post("/council/batch", {
      symbols,
      userId,
      persist: persist ?? true,
      concurrency: concurrency ?? 2,
      activeProviders: providers,
    });
    const lines = [
      `Models used: ${providers.join(", ")}`,
      `Scanned ${batch.counts?.total ?? symbols.length} symbols`,
      "",
      `BUY (${batch.buys?.length ?? 0})`,
      ...(batch.buys ?? []).map(
        (r) => `- ${r.symbol} — ${Math.round(r.confidence * 100)}% (${r.horizon})`
      ),
      "",
      `SELL (${batch.sells?.length ?? 0})`,
      ...(batch.sells ?? []).map(
        (r) => `- ${r.symbol} — ${Math.round(r.confidence * 100)}% (${r.horizon})`
      ),
      "",
      `HOLD (${batch.holds?.length ?? 0})`,
      ...(batch.holds ?? []).map(
        (r) => `- ${r.symbol} — ${Math.round(r.confidence * 100)}% (${r.horizon})`
      ),
    ];
    if (batch.errors?.length) {
      lines.push("", `FAILED (${batch.errors.length})`);
      for (const e of batch.errors) lines.push(`- ${e.symbol}: ${e.error}`);
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
