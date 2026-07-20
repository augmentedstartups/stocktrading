import { describe, expect, it } from "vitest";
import { aggregateCouncil } from "@/lib/llm/aggregator";
import type { ProviderResult } from "@/lib/llm/providers/types";

describe("aggregateCouncil", () => {
  it("blends buys into bullish bias", () => {
    const results: ProviderResult[] = [
      {
        provider: "a",
        model: "m1",
        ok: true,
        latencyMs: 10,
        verdict: {
          action: "buy",
          confidence: 0.8,
          horizon: "months",
          reasons: ["r1"],
        },
      },
      {
        provider: "b",
        model: "m2",
        ok: true,
        latencyMs: 12,
        verdict: {
          action: "buy",
          confidence: 0.7,
          horizon: "months",
          reasons: ["r2"],
        },
      },
    ];
    const d = aggregateCouncil({ symbol: "TEST", results });
    expect(d.action).toBe("buy");
    expect(d.confidence).toBeGreaterThan(0.4);
  });

  it("respects RL tilt", () => {
    const results: ProviderResult[] = [
      {
        provider: "a",
        model: "m1",
        ok: true,
        latencyMs: 10,
        verdict: {
          action: "hold",
          confidence: 0.5,
          horizon: "months",
          reasons: ["neutral"],
        },
      },
    ];
    const d = aggregateCouncil({
      symbol: "TEST",
      results,
      rl: { action: "sell", confidence: 0.9 },
    });
    expect(["sell", "hold"]).toContain(d.action);
  });

  it("excludes RL influence when untrained (rl omitted)", () => {
    const results: ProviderResult[] = [
      {
        provider: "a",
        model: "m1",
        ok: true,
        latencyMs: 10,
        verdict: {
          action: "hold",
          confidence: 0.5,
          horizon: "months",
          reasons: ["neutral"],
        },
      },
    ];
    const d = aggregateCouncil({ symbol: "TEST", results });
    expect(d.action).toBe("hold");
  });

  it("keeps a clear model majority over the RL hint", () => {
    const results: ProviderResult[] = ["a", "b", "c", "d"].map((provider, idx) => ({
      provider,
      model: `m${idx}`,
      ok: true,
      latencyMs: 10,
      verdict: {
        action: "hold",
        confidence: 0.55,
        horizon: "months",
        reasons: ["neutral"],
      },
    }));
    const d = aggregateCouncil({
      symbol: "TEST",
      results,
      rl: { action: "buy", confidence: 0.95 },
    });
    expect(d.action).toBe("hold");
    expect(d.confidence).toBeGreaterThan(0.9);
  });
});
