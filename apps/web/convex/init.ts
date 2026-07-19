import { mutation } from "./_generated/server";
import { syncDefaultWatchlist, syncTickerPresets } from "./tickerPresets";

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
          "local/google/gemma-4-12b",
          "local/gemma-4-e4b-it-mlx",
          "anthropic/claude-opus-4-8",
          "anthropic/claude-sonnet-4-6",
          "google/gemini-3.1-pro-preview",
          "google/gemini-3.5-flash",
          "moonshot/kimi-k2.7-code",
          "moonshot/kimi-k3",
          "zai/glm-5.2",
          "minimax/MiniMax-M3",
        ],
        indicators: ["MA50", "MA200", "RSI", "Volume", "News"],
        theme: "system",
      });
    }

    await syncTickerPresets(ctx);
    await syncDefaultWatchlist(ctx, uid);

    return { userId: uid };
  },
});
