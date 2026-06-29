import { describe, expect, it } from "vitest";
import { formatCouncilDecision, formatHeatmap } from "../../services/mcp/summarize.mjs";

describe("mcp council summarize", () => {
  it("formats per-model pillar reasons like the dashboard", () => {
    const text = formatCouncilDecision({
      symbol: "SPCE",
      action: "hold",
      confidence: 0.62,
      horizon: "months",
      reasons: ["Council consensus: hold"],
      perModel: [
        {
          model: "claude-sonnet-4-6",
          provider: "anthropic",
          action: "hold",
          confidence: 0.7,
          ok: true,
          reasons: [
            "[Fundamentals] Extreme valuation multiples.",
            "[News] Post-IPO volatility dominates.",
            "[RL] Agree with neutral hold.",
          ],
        },
        {
          model: "gemini-3.5-flash",
          provider: "google",
          action: "hold",
          confidence: 0.65,
          ok: true,
          reasons: ["[Fundamentals] Stretched P/S above 100x."],
        },
      ],
    });

    expect(text).toContain("SPCE — HOLD (62%");
    expect(text).toContain("claude-sonnet-4-6");
    expect(text).toContain("[Fundamentals]");
    expect(text).toContain("Extreme valuation multiples.");
    expect(text).toContain("gemini-3.5-flash");
  });

  it("groups watchlist verdicts into buy sell hold", () => {
    const text = formatHeatmap(
      [{ symbol: "AAPL" }, { symbol: "TSLA" }, { symbol: "NVDA" }],
      {
        AAPL: { action: "buy", confidence: 0.8, horizon: "weeks" },
        TSLA: { action: "sell", confidence: 0.7, horizon: "weeks" },
        NVDA: null,
      }
    );

    expect(text).toContain("BUY (1)");
    expect(text).toContain("AAPL — 80%");
    expect(text).toContain("SELL (1)");
    expect(text).toContain("NO DECISION YET (1)");
    expect(text).toContain("NVDA");
  });
});
