import { describe, expect, it } from "vitest";
import { buildCouncilReasons } from "../../apps/web/lib/llm/enrichReasons";

describe("buildCouncilReasons", () => {
  it("always includes technical, fundamentals, and news pillars", () => {
    const reasons = buildCouncilReasons(
      ["Technical indicators show bearish momentum (RSI below 50)."],
      {
        indicators: {
          close: 283.78,
          ma20: 298.29,
          ma50: 291.41,
          ma200: 269.08,
          rsi: 42,
          macdHist: -1.2,
        },
        fundamentals: {
          shortName: "Apple Inc.",
          sector: "Technology",
          trailingPE: 34.3,
          marketCap: 4_167_977_926_656,
        },
        sentiment: {
          ticker: "AAPL",
          finbert: { score: 0.12, pos: 0.4, neu: 0.5, neg: 0.1, n_articles: 8 },
          llm: null,
          consensus: 0.12,
          updatedAt: 1,
        },
        headlines: [{ title: "Apple beats estimates on services revenue" }],
      },
    );

    expect(reasons.some((r) => r.startsWith("[Technical]"))).toBe(true);
    expect(reasons.some((r) => r.startsWith("[Fundamentals]"))).toBe(true);
    expect(reasons.some((r) => r.startsWith("[News]"))).toBe(true);
    expect(reasons.find((r) => r.startsWith("[News]"))).toContain("Apple beats estimates");
    expect(reasons.find((r) => r.startsWith("[Fundamentals]"))).toContain("Apple Inc.");
  });
});
