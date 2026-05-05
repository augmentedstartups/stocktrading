"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const triggerCouncil = internalAction({
  args: { symbol: v.string() },
  handler: async (_ctx, { symbol }) => {
    const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
    const r = await fetch(`${origin}/api/council`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, persist: true }),
    });
    if (!r.ok) {
      throw new Error(`council ${r.status}: ${await r.text()}`);
    }
    return await r.json();
  },
});
