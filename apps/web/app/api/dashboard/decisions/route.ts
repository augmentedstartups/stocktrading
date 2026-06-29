import { getDefaultUserId, listDecisions } from "@/lib/convexServer";

export const runtime = "nodejs";

type DecisionSnapshot = {
  indicators?: {
    close?: number;
    date?: string;
  };
};

type DecisionRow = {
  timestamp?: number;
  snapshot?: string;
};

function parseSnapshot(snapshot?: string): DecisionSnapshot | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot) as DecisionSnapshot;
  } catch {
    return null;
  }
}

function buildMeta(decisions: DecisionRow[]) {
  const latest = decisions[0];
  const snapshot = parseSnapshot(latest?.snapshot);
  const decisionDate = latest?.timestamp ? new Date(latest.timestamp) : null;

  return {
    cached: true,
    source: "convex_dashboard_decisions",
    decisionAt: decisionDate && !Number.isNaN(decisionDate.getTime()) ? decisionDate.toISOString() : null,
    priceAsOf: snapshot?.indicators?.date ?? null,
    priceClose: snapshot?.indicators?.close ?? null,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") ?? undefined;
  const userId = (url.searchParams.get("userId") ?? (await getDefaultUserId())) ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const decisions = await listDecisions(userId, symbol, Number.isFinite(limit) ? limit : 50);
  return Response.json({ userId, symbol, meta: buildMeta(decisions as DecisionRow[]), decisions });
}
