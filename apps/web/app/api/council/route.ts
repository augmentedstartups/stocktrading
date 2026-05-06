import { aggregateCouncil } from "@/lib/llm/aggregator";
import { runCouncil } from "@/lib/llm/council";
import type { Action } from "@/lib/llm/schema";
import { mergeSentiment } from "@/lib/llm/sentiment";
import { getActiveProviders, insertDecision } from "@/lib/convexServer";
import { mlGet } from "@/lib/ml";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  symbol: z.string(),
  userHorizon: z.string().optional(),
  userId: z.string().optional(),
  persist: z.boolean().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbol, userHorizon, userId, persist } = parsed.data;

  const ind = await mlGet<{ snapshot: Record<string, unknown> }>(
    `/indicators?symbol=${encodeURIComponent(symbol)}`,
  ).catch(() => ({ snapshot: {} }));

  let fundamentals: Record<string, unknown> | undefined;
  try {
    const f = await mlGet<{ info: Record<string, unknown> }>(
      `/fundamentals?symbol=${encodeURIComponent(symbol)}`,
    );
    fundamentals = f.info;
  } catch {
    fundamentals = undefined;
  }

  const sentMl = await mlGet<{
    aggregate: { score: number; pos: number; neu: number; neg: number; n_articles: number };
    articles: Array<{ title: string; url: string }>;
  }>(`/sentiment?symbol=${encodeURIComponent(symbol)}`).catch(() => null);

  let sentiment = null;
  if (sentMl) {
    sentiment = mergeSentiment(symbol, {
      score: sentMl.aggregate.score,
      pos: sentMl.aggregate.pos,
      neu: sentMl.aggregate.neu,
      neg: sentMl.aggregate.neg,
      n_articles: sentMl.aggregate.n_articles,
    }, null);
  }

  const rlRaw = await mlGet<{ action: string; confidence: number }>(
    `/rl/predict?symbol=${encodeURIComponent(symbol)}`,
  ).catch(() => null);

  const rl =
    rlRaw && ["buy", "hold", "sell"].includes(rlRaw.action)
      ? { action: rlRaw.action as Action, confidence: rlRaw.confidence }
      : undefined;

  const activeProviders = await getActiveProviders(userId);

  const results = await runCouncil({
    symbol,
    indicators: ind.snapshot ?? {},
    fundamentals,
    sentiment,
    rl,
    userHorizon,
    activeProviders,
  });

  const decision = aggregateCouncil({ symbol, results, rl });

  if (persist !== false) {
    await insertDecision({
      symbol: decision.symbol,
      action: decision.action,
      confidence: decision.confidence,
      horizon: decision.horizon,
      reasons: decision.reasons,
      perModel: decision.perModel,
      rlInput: decision.rlInput,
      snapshot: JSON.stringify({ indicators: ind.snapshot, sentiment }),
      userId,
    });
  }

  return Response.json({ decision, results });
}
