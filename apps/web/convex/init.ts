import { mutation } from "./_generated/server";

export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    let u = await ctx.db.query("users").first();
    if (!u) {
      const id = await ctx.db.insert("users", {
        name: "Owner",
        createdAt: Date.now(),
      });
      u = (await ctx.db.get(id))!;
    }
    const uid = u._id;

    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .first();
    if (!existingSettings) {
      await ctx.db.insert("settings", {
        userId: uid,
        markets: ["US", "INDEX"],
        categories: ["Tech"],
        frequency: "eod",
        risk: "balanced",
        horizon: "years",
        activeProviders: [
          "anthropic/claude-opus-4-7",
          "anthropic/claude-sonnet-4-6",
          "google/gemini-3.1-pro-preview",
          "google/gemini-3.1-flash-lite-preview",
          "deepseek/deepseek-v4-pro",
          "moonshot/kimi-k2.6",
          "zai/glm-5.1",
          "minimax/MiniMax-M2.7",
        ],
        indicators: ["MA50", "MA200", "RSI", "Volume", "News"],
        theme: "system",
      });
    }

    const presets: Array<{
      symbol: string;
      name: string;
      market: "US" | "JSE" | "INDEX";
      currency: string;
      sector?: string;
      logoUrl?: string;
    }> = [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        market: "US",
        currency: "USD",
        sector: "Technology",
        logoUrl: "https://logo.clearbit.com/apple.com",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        market: "US",
        currency: "USD",
        sector: "Technology",
        logoUrl: "https://logo.clearbit.com/microsoft.com",
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        market: "US",
        currency: "USD",
        sector: "Technology",
        logoUrl: "https://logo.clearbit.com/abc.xyz",
      },
      {
        symbol: "META",
        name: "Meta Platforms",
        market: "US",
        currency: "USD",
        sector: "Technology",
        logoUrl: "https://logo.clearbit.com/meta.com",
      },
      {
        symbol: "AMZN",
        name: "Amazon.com",
        market: "US",
        currency: "USD",
        sector: "Consumer Discretionary",
        logoUrl: "https://logo.clearbit.com/amazon.com",
      },
      {
        symbol: "NVDA",
        name: "NVIDIA Corp.",
        market: "US",
        currency: "USD",
        sector: "Semiconductors",
        logoUrl: "https://logo.clearbit.com/nvidia.com",
      },
      {
        symbol: "TSLA",
        name: "Tesla Inc.",
        market: "US",
        currency: "USD",
        sector: "Consumer Discretionary",
        logoUrl: "https://logo.clearbit.com/tesla.com",
      },
      { symbol: "SPY", name: "SPDR S&P 500 ETF", market: "INDEX", currency: "USD" },
      { symbol: "QQQ", name: "Invesco QQQ Trust", market: "INDEX", currency: "USD" },
      {
        symbol: "NPN.JO",
        name: "Naspers Ltd",
        market: "JSE",
        currency: "ZAR",
        sector: "Communication Services",
      },
      {
        symbol: "FSR.JO",
        name: "FirstRand Ltd",
        market: "JSE",
        currency: "ZAR",
        sector: "Financials",
      },
      {
        symbol: "SBK.JO",
        name: "Standard Bank Group",
        market: "JSE",
        currency: "ZAR",
        sector: "Financials",
      },
      {
        symbol: "SHP.JO",
        name: "Shoprite Holdings",
        market: "JSE",
        currency: "ZAR",
        sector: "Consumer Staples",
      },
    ];
    for (const p of presets) {
      const ex = await ctx.db
        .query("tickers")
        .withIndex("by_symbol", (q) => q.eq("symbol", p.symbol))
        .first();
      if (!ex) await ctx.db.insert("tickers", p);
    }

    const defaults = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "SPY", "QQQ", "NPN.JO"];
    for (const symbol of defaults) {
      const ex = await ctx.db
        .query("watchlist")
        .withIndex("by_user_symbol", (q) => q.eq("userId", uid).eq("symbol", symbol))
        .first();
      if (!ex) {
        await ctx.db.insert("watchlist", {
          userId: uid,
          symbol,
          favorite: ["AAPL", "NVDA"].includes(symbol),
          addedAt: Date.now(),
        });
      }
    }

    return { userId: uid };
  },
});
