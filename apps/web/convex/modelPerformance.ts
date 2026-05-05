import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const all = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("modelPerformance").collect(),
});

export const upsertOutcome = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    correct: v.boolean(),
  },
  handler: async (ctx, { provider, model, correct }) => {
    const ex = await ctx.db
      .query("modelPerformance")
      .withIndex("by_provider_model", (q) =>
        q.eq("provider", provider).eq("model", model),
      )
      .first();
    const samples = (ex?.samples ?? 0) + 1;
    const correctCount = (ex?.correct ?? 0) + (correct ? 1 : 0);
    const weight = samples < 5 ? 1.0 : Math.max(0.2, correctCount / samples);
    if (ex) {
      await ctx.db.patch(ex._id, {
        samples,
        correct: correctCount,
        weight,
        updatedAt: Date.now(),
      });
      return ex._id;
    }
    return await ctx.db.insert("modelPerformance", {
      provider,
      model,
      samples,
      correct: correctCount,
      weight,
      updatedAt: Date.now(),
    });
  },
});
