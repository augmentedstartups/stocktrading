import type { SentimentSnapshot } from "./sentiment";

export function councilSystemPrompt(): string {
  return `You are a disciplined senior quantitative analyst assisting a long-term equity investor (multi-month to multi-year horizon).
Respond ONLY with valid JSON matching this exact schema (no markdown, no prose outside JSON):
{"action":"buy"|"hold"|"sell","confidence":number between 0 and 1,"horizon":"days"|"weeks"|"months"|"years","reasons":array of 2 to 6 short bullet strings}
Rules:
- Never invent prices or earnings numbers not supplied in context.
- Each reason must be YOUR interpretation of one input pillar, not a copy or restatement of raw data.
- If technical data is provided, include one reason prefixed [Technical] with your opinion on the technical setup.
- If fundamentals data is provided, include one reason prefixed [Fundamentals] with your opinion on valuation, quality, growth, or risk.
- If news headlines are provided, include one reason prefixed [News] with your opinion on headline themes and market impact.
- If an RL policy hint is provided, include one reason prefixed [RL] saying whether you agree or disagree with it and why.
- You may add one [Model] reason for cross-pillar synthesis, disagreement, or your final thesis.
- Do not use identical boilerplate across pillars; explain what the evidence means for the stock.
- Confidence reflects conviction given incomplete information.
- Horizon must reflect the user's stated investment horizon when provided.
- When a user horizon is given, frame action/confidence for that timeframe (e.g. years = multi-year hold thesis, days = near-term tactical).`;
}

export type CouncilHeadline = {
  title: string;
  finbertScore?: number;
  finbertLabel?: string;
};

export function formatCouncilHeadlines(headlines: CouncilHeadline[]): string {
  return headlines
    .slice(0, 10)
    .map((h, i) => {
      const mood =
        h.finbertScore !== undefined
          ? ` (finbert ${h.finbertScore.toFixed(2)}${h.finbertLabel ? ` ${h.finbertLabel}` : ""})`
          : "";
      return `${i + 1}. ${h.title}${mood}`;
    })
    .join("\n");
}

export function headlinesFromArticles(
  articles: Array<{ title: string; finbertScore?: number; finbertLabel?: string }>,
): CouncilHeadline[] {
  return articles.slice(0, 10).map((article) => ({
    title: article.title,
    finbertScore: article.finbertScore,
    finbertLabel: article.finbertLabel,
  }));
}

export function councilUserPrompt(ctx: {
  symbol: string;
  indicators: Record<string, unknown>;
  fundamentals?: Record<string, unknown>;
  sentiment?: SentimentSnapshot | null;
  headlines?: CouncilHeadline[];
  rl?: { action: string; confidence: number; reason?: string };
  userHorizon?: string;
}): string {
  const lines = [
    `Symbol: ${ctx.symbol}`,
    ctx.userHorizon ? `User horizon preference: ${ctx.userHorizon}` : "",
    `Technical snapshot (latest bar): ${JSON.stringify(ctx.indicators)}`,
    ctx.fundamentals
      ? `Company fundamentals (reported metrics, valuation, growth): ${JSON.stringify(ctx.fundamentals)}`
      : "",
    ctx.sentiment
      ? `News sentiment aggregate: consensus=${ctx.sentiment.consensus.toFixed(3)} finbert=${JSON.stringify(ctx.sentiment.finbert)} llm=${ctx.sentiment.llm ? JSON.stringify({ sentiment: ctx.sentiment.llm.sentiment, magnitude: ctx.sentiment.llm.magnitude, rationale: ctx.sentiment.llm.rationale }) : "null"}`
      : "",
    ctx.headlines && ctx.headlines.length > 0
      ? `Recent news headlines:\n${formatCouncilHeadlines(ctx.headlines)}`
      : "",
    ctx.rl
      ? `RL policy hint: ${JSON.stringify(ctx.rl)}`
      : "",
    "Return distinct opinion bullets for the supplied pillars using [Technical], [Fundamentals], [News], [RL], and optionally [Model].",
  ].filter(Boolean);
  return lines.join("\n");
}
