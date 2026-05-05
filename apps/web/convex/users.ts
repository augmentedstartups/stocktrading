import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const ensureDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").first();
    if (existing) return existing._id;
    const id = await ctx.db.insert("users", {
      name: "Owner",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const first = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").first();
  },
});
