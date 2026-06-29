import { describe, expect, it } from "vitest";
import {
  councilUserPrompt,
  formatCouncilHeadlines,
  headlinesFromArticles,
} from "../../apps/web/lib/llm/prompts";

describe("council prompts", () => {
  it("includes technical, fundamentals, sentiment, and headlines", () => {
    const prompt = councilUserPrompt({
      symbol: "AAPL",
      userHorizon: "months",
      indicators: { close: 283.78, rsi: 42 },
      fundamentals: { trailingPE: 28.1, revenueGrowth: 0.05 },
      sentiment: {
        ticker: "AAPL",
        finbert: { score: 0.12, pos: 0.4, neu: 0.5, neg: 0.1, n_articles: 8 },
        llm: null,
        consensus: 0.12,
        updatedAt: 1,
      },
      headlines: headlinesFromArticles([
        { title: "Apple beats estimates", finbertScore: 0.8, finbertLabel: "positive" },
      ]),
    });

    expect(prompt).toContain("Technical snapshot");
    expect(prompt).toContain("Company fundamentals");
    expect(prompt).toContain("News sentiment aggregate");
    expect(prompt).toContain("Recent news headlines");
    expect(prompt).toContain("Apple beats estimates");
  });

  it("formats headline finbert scores", () => {
    const text = formatCouncilHeadlines([
      { title: "Supply chain risk", finbertScore: -0.4, finbertLabel: "negative" },
    ]);
    expect(text).toContain("Supply chain risk");
    expect(text).toContain("finbert -0.40");
    expect(text).toContain("negative");
  });
});
