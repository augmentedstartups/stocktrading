import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export function getConvexServer(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url || url.includes("placeholder")) return null;
  return new ConvexHttpClient(url);
}

export async function getActiveProviders(
  userId: string | undefined,
): Promise<string[] | undefined> {
  if (!userId) return undefined;
  const client = getConvexServer();
  if (!client) return undefined;
  try {
    const settings = (await client.query(api.settings.get, {
      userId: userId as never,
    })) as { activeProviders?: string[] } | null;
    if (Array.isArray(settings?.activeProviders)) {
      return settings.activeProviders;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

export async function bootstrapDashboard() {
  const client = getConvexServer();
  if (!client) return { offline: true as const };
  return client.mutation(api.init.bootstrap, {});
}

export async function getDefaultUserId() {
  const client = getConvexServer();
  if (!client) return null;
  const user = await client.query(api.users.first, {});
  return user?._id ?? null;
}

export async function listWatchlist(userId: string) {
  const client = getConvexServer();
  if (!client) return [];
  return client.query(api.watchlist.list, { userId: userId as never });
}

export async function addWatchlistSymbol(userId: string, symbol: string) {
  const client = getConvexServer();
  if (!client) return null;
  return client.mutation(api.watchlist.add, { userId: userId as never, symbol });
}

export async function removeWatchlistSymbol(userId: string, symbol: string) {
  const client = getConvexServer();
  if (!client) return null;
  return client.mutation(api.watchlist.remove, { userId: userId as never, symbol });
}

export async function getSettings(userId: string) {
  const client = getConvexServer();
  if (!client) return null;
  return client.query(api.settings.get, { userId: userId as never });
}

export async function updateSettings(
  userId: string,
  patch: {
    markets?: Array<"US" | "JSE" | "INDEX">;
    categories?: string[];
    frequency?: "eod" | "15min" | "realtime";
    risk?: "conservative" | "balanced" | "aggressive";
    horizon?: "days" | "weeks" | "months" | "years";
    activeProviders?: string[];
    theme?: "light" | "dark" | "system";
    indicators?: string[];
  },
) {
  const client = getConvexServer();
  if (!client) return null;
  if (patch.indicators) {
    await client.mutation(api.settings.setIndicators, {
      userId: userId as never,
      indicators: patch.indicators,
    });
    delete patch.indicators;
  }
  if (patch.activeProviders) {
    await client.mutation(api.settings.setActiveProviders, {
      userId: userId as never,
      activeProviders: patch.activeProviders,
    });
    delete patch.activeProviders;
  }
  if (Object.keys(patch).length > 0) {
    await client.mutation(api.settings.update, { userId: userId as never, ...patch });
  }
  return getSettings(userId);
}

export async function listDecisions(userId: string | undefined, symbol: string | undefined, limit: number) {
  const client = getConvexServer();
  if (!client) return [];
  if (symbol) {
    const one = await client.query(api.decisions.latestForSymbol, { symbol });
    return one ? [one] : [];
  }
  if (userId) {
    return client.query(api.decisions.recentForUser, { userId: userId as never, limit });
  }
  return [];
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
    reasons?: string[];
    latencyMs: number;
    timestamp?: string;
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
