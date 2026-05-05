import { z } from "zod";

export const finbertAggSchema = z.object({
  score: z.number(),
  pos: z.number(),
  neu: z.number(),
  neg: z.number(),
  n_articles: z.number(),
});

export const llmDeepSchema = z.object({
  sentiment: z.enum(["bullish", "neutral", "bearish"]),
  magnitude: z.number().min(0).max(1),
  horizon: z.enum(["days", "weeks", "months", "quarters"]),
  rationale: z.string(),
  keyPhrases: z.array(z.string()),
  citedHeadlines: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      impact: z.number(),
    }),
  ),
});

export const sentimentSnapshotSchema = z.object({
  ticker: z.string(),
  finbert: finbertAggSchema,
  llm: llmDeepSchema.nullable(),
  consensus: z.number().min(-1).max(1),
  updatedAt: z.number(),
});

export type SentimentSnapshot = z.infer<typeof sentimentSnapshotSchema>;

export function mergeSentiment(
  ticker: string,
  finbert: z.infer<typeof finbertAggSchema>,
  llm: z.infer<typeof llmDeepSchema> | null,
): SentimentSnapshot {
  let consensus = finbert.score;
  if (llm) {
    const dir =
      llm.sentiment === "bullish" ? 1 : llm.sentiment === "bearish" ? -1 : 0;
    const llmScore = dir * llm.magnitude;
    consensus = finbert.score * 0.45 + llmScore * 0.55;
    consensus = Math.max(-1, Math.min(1, consensus));
  }
  return {
    ticker,
    finbert,
    llm,
    consensus,
    updatedAt: Date.now(),
  };
}
