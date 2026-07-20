import { aggregateCouncil } from "@/lib/llm/aggregator";
import { COUNCIL_MODELS, DEFAULT_COUNCIL_PROVIDER_ID, runCouncil } from "@/lib/llm/council";
import { headlinesFromArticles } from "@/lib/llm/prompts";
import type { Action } from "@/lib/llm/schema";
import { mergeSentiment } from "@/lib/llm/sentiment";
import { getActiveProviders, getUserHorizon, insertDecision } from "@/lib/convexServer";
import { mlGet } from "@/lib/ml";
import { parseHorizon } from "@/lib/llm/schema";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  symbol: z.string(),
  userHorizon: z.string().optional(),
  userId: z.string().optional(),
  persist: z.boolean().optional(),
  activeProviders: z.array(z.string()).optional(),
});

function evidenceEntries(source: Record<string, unknown> | undefined, limit = 8) {
  return Object.entries(source ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      value: typeof value === "number" ? Number(value.toFixed(4)).toString() : String(value),
    }));
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbol, userHorizon, userId, persist, activeProviders: bodyProviders } = parsed.data;

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
    articles: Array<{
      title: string;
      url: string;
      finbertScore?: number;
      finbertLabel?: string;
    }>;
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

  const rlRaw = await mlGet<{
    action: string;
    confidence: number;
    trained?: boolean;
    reason?: string;
  }>(`/rl/predict?symbol=${encodeURIComponent(symbol)}`).catch(() => null);

  const rl =
    rlRaw && rlRaw.trained === true && ["buy", "hold", "sell"].includes(rlRaw.action)
      ? { action: rlRaw.action as Action, confidence: rlRaw.confidence }
      : undefined;

  const rawActiveProviders =
    Array.isArray(bodyProviders)
      ? bodyProviders
      : await getActiveProviders(userId);
  const validIds = new Set(COUNCIL_MODELS.map((m) => m.id));
  const activeProviders = Array.isArray(rawActiveProviders)
    ? rawActiveProviders.filter((id) => validIds.has(id))
    : rawActiveProviders;
  const providers =
    Array.isArray(activeProviders) && activeProviders.length === 0
      ? [DEFAULT_COUNCIL_PROVIDER_ID]
      : activeProviders;

  const horizon =
    parseHorizon(userHorizon) ?? (await getUserHorizon(userId));

  const reasonCtx = {
    indicators: ind.snapshot ?? {},
    fundamentals,
    sentiment,
    headlines: sentMl ? headlinesFromArticles(sentMl.articles) : undefined,
    rl,
  };

  const results = await runCouncil({
    symbol,
    ...reasonCtx,
    userHorizon: horizon,
    activeProviders: providers,
  });

  const decision = aggregateCouncil({ symbol, results, rl, userHorizon: horizon });
  const inputsUsed = {
    technical: Object.keys(ind.snapshot ?? {}).length > 0,
    fundamentals: Boolean(fundamentals && Object.keys(fundamentals).length > 0),
    sentiment: Boolean(sentiment),
    rl: Boolean(rl),
    evidence: {
      technical: evidenceEntries(ind.snapshot),
      fundamentals: evidenceEntries(fundamentals),
      sentiment: sentMl
        ? {
            consensus: sentiment?.consensus,
            finbertScore: sentMl.aggregate.score,
            articles: sentMl.aggregate.n_articles,
            headlines: sentMl.articles.slice(0, 5).map((article) => ({
              title: article.title,
              url: article.url,
            })),
          }
        : undefined,
      rl,
    },
  };

  if (persist !== false) {
    await insertDecision({
      symbol: decision.symbol,
      action: decision.action,
      confidence: decision.confidence,
      horizon: decision.horizon,
      reasons: decision.reasons,
      perModel: decision.perModel.map((m) => ({
        provider: m.provider,
        model: m.model,
        action: m.action,
        confidence: m.confidence,
        reason: m.reason,
        reasons: m.reasons,
        latencyMs: m.latencyMs,
        timestamp: m.timestamp,
        ok: m.ok,
        error: m.error,
      })),
      rlInput: decision.rlInput,
      snapshot: JSON.stringify({
        indicators: ind.snapshot,
        fundamentals,
        sentiment,
        articles: sentMl?.articles.slice(0, 5) ?? [],
        rl,
        inputsUsed,
      }),
      userId,
    });
  }

  return Response.json({ decision, results, inputsUsed });
}
