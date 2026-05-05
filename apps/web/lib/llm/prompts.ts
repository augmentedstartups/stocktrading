import type { SentimentSnapshot } from "./sentiment";

export function councilSystemPrompt(): string {
  return `You are a disciplined senior quantitative analyst assisting a long-term equity investor (multi-month to multi-year horizon).
Respond ONLY with valid JSON matching this exact schema (no markdown, no prose outside JSON):
{"action":"buy"|"hold"|"sell","confidence":number between 0 and 1,"horizon":"days"|"weeks"|"months"|"years","reasons":array of 2 to 6 short bullet strings}
Rules:
- Never invent prices or earnings numbers not supplied in context.
- Weight fundamentals + macro sentiment + technical regime; prefer hold when evidence conflicts.
- Confidence reflects conviction given incomplete information.
- Horizon must reflect the user's stated investment horizon when provided.`;
}

export function councilUserPrompt(ctx: {
  symbol: string;
  indicators: Record<string, unknown>;
  fundamentals?: Record<string, unknown>;
  sentiment?: SentimentSnapshot | null;
  rl?: { action: string; confidence: number; reason?: string };
  userHorizon?: string;
}): string {
  const lines = [
    `Symbol: ${ctx.symbol}`,
    ctx.userHorizon ? `User horizon preference: ${ctx.userHorizon}` : "",
    `Technical snapshot (latest bar): ${JSON.stringify(ctx.indicators)}`,
    ctx.fundamentals
      ? `Fundamentals subset: ${JSON.stringify(ctx.fundamentals)}`
      : "",
    ctx.sentiment
      ? `Sentiment (hybrid): consensus=${ctx.sentiment.consensus.toFixed(3)} finbert=${JSON.stringify(ctx.sentiment.finbert)} llm=${ctx.sentiment.llm ? JSON.stringify({ sentiment: ctx.sentiment.llm.sentiment, magnitude: ctx.sentiment.llm.magnitude }) : "null"}`
      : "",
    ctx.rl
      ? `RL policy hint: ${JSON.stringify(ctx.rl)}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}
