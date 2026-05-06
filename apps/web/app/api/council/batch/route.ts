import { aggregateCouncil } from "@/lib/llm/aggregator";
import { runCouncil } from "@/lib/llm/council";
import type { Action } from "@/lib/llm/schema";
import { mergeSentiment } from "@/lib/llm/sentiment";
import { getActiveProviders, insertDecision } from "@/lib/convexServer";
import { mlGet } from "@/lib/ml";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  symbols: z.array(z.string()).min(1).max(40),
  userHorizon: z.string().optional(),
  userId: z.string().optional(),
  persist: z.boolean().optional(),
  concurrency: z.number().int().min(1).max(6).optional(),
});

type Verdict = {
  symbol: string;
  action: Action;
  confidence: number;
  horizon: "days" | "weeks" | "months" | "years";
  reasons: string[];
  ok: true;
};

type Failed = { symbol: string; ok: false; error: string };

async function runOne(
  symbol: string,
  userHorizon: string | undefined,
  userId: string | undefined,
  persist: boolean,
  activeProviders: string[] | undefined,
): Promise<Verdict | Failed> {
  try {
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

    const sentiment = sentMl
      ? mergeSentiment(
          symbol,
          {
            score: sentMl.aggregate.score,
            pos: sentMl.aggregate.pos,
            neu: sentMl.aggregate.neu,
            neg: sentMl.aggregate.neg,
            n_articles: sentMl.aggregate.n_articles,
          },
          null,
        )
      : null;

    const rlRaw = await mlGet<{ action: string; confidence: number }>(
      `/rl/predict?symbol=${encodeURIComponent(symbol)}`,
    ).catch(() => null);

    const rl =
      rlRaw && ["buy", "hold", "sell"].includes(rlRaw.action)
        ? { action: rlRaw.action as Action, confidence: rlRaw.confidence }
        : undefined;

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

    if (persist) {
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

    return {
      symbol: decision.symbol,
      action: decision.action,
      confidence: decision.confidence,
      horizon: decision.horizon,
      reasons: decision.reasons,
      ok: true,
    };
  } catch (e) {
    return {
      symbol,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function withConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) break;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbols, userHorizon, userId, persist = true, concurrency = 2 } = parsed.data;

  const unique = Array.from(new Set(symbols.map((s) => s.trim()).filter(Boolean)));
  const activeProviders = await getActiveProviders(userId);
  const results = await withConcurrency(
    unique,
    (sym) => runOne(sym, userHorizon, userId, persist, activeProviders),
    concurrency,
  );

  const buys = results.filter((r): r is Verdict => r.ok && r.action === "buy");
  const sells = results.filter((r): r is Verdict => r.ok && r.action === "sell");
  const holds = results.filter((r): r is Verdict => r.ok && r.action === "hold");
  const errors = results.filter((r): r is Failed => !r.ok);

  return Response.json({
    counts: {
      total: results.length,
      buy: buys.length,
      hold: holds.length,
      sell: sells.length,
      failed: errors.length,
    },
    buys: buys.sort((a, b) => b.confidence - a.confidence),
    sells: sells.sort((a, b) => b.confidence - a.confidence),
    holds: holds.sort((a, b) => b.confidence - a.confidence),
    errors,
  });
}
