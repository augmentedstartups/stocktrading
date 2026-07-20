import { describe, expect, it } from "vitest";
import { councilUserPrompt } from "@/lib/llm/prompts";

describe("councilUserPrompt RL gating", () => {
  it("omits [RL] when no RL hint is provided (untrained model)", () => {
    const p = councilUserPrompt({ symbol: "TEST", indicators: { rsi: 50 } });
    expect(p).not.toContain("[RL]");
    expect(p).not.toContain("RL policy hint");
  });

  it("includes [RL] when an RL hint is provided (trained model)", () => {
    const p = councilUserPrompt({
      symbol: "TEST",
      indicators: { rsi: 50 },
      rl: { action: "buy", confidence: 0.7 },
    });
    expect(p).toContain("[RL]");
    expect(p).toContain("RL policy hint");
  });
});
