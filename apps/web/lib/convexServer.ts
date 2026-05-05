import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export function getConvexServer(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url || url.includes("placeholder")) return null;
  return new ConvexHttpClient(url);
}

export async function insertDecision(doc: {
  symbol: string;
  action: "buy" | "hold" | "sell";
  confidence: number;
  horizon: "days" | "weeks" | "months" | "years";
  reasons: string[];
  perModel: Array<{
    provider: string;
    model: string;
    action: "buy" | "hold" | "sell";
    confidence: number;
    reason: string;
    latencyMs: number;
    ok: boolean;
    error?: string;
  }>;
  rlInput?: { action: "buy" | "hold" | "sell"; confidence: number };
  snapshot?: string;
  userId?: string;
}) {
  const client = getConvexServer();
  if (!client) return null;
  const payload = {
    ...doc,
    userId: doc.userId as never,
  };
  return client.mutation(api.decisions.insert, payload as never);
}
