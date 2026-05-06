import { describe, expect, it } from "vitest";
import { COUNCIL_MODELS } from "@/lib/llm/council";

function pruneStale(stored: string[], registry: string[]): string[] {
  const valid = new Set(registry);
  return stored.filter((id) => valid.has(id));
}

describe("council activeProviders reconciliation", () => {
  const registry = COUNCIL_MODELS.map((m) => m.id);

  it("registry contains the expected provider ids", () => {
    expect(registry).toContain("anthropic/claude-opus-4-7");
    expect(registry).toContain("anthropic/claude-sonnet-4-6");
    expect(registry).toContain("google/gemini-3.1-pro-preview");
    expect(registry).toContain("google/gemini-3.1-flash-lite-preview");
    expect(registry).toContain("deepseek/deepseek-v4-pro");
    expect(registry).toContain("moonshot/kimi-k2.6");
    expect(registry).toContain("zai/glm-5.1");
    expect(registry).toContain("minimax/MiniMax-M2.7");
    expect(registry).not.toContain("openai/gpt-5.5");
    expect(registry).not.toContain("deepseek/deepseek-chat");
  });

  it("prunes stale ids from a stored selection that mixes valid + stale", () => {
    const stored = [
      "openai/gpt-5.5",
      "anthropic/claude-opus-4-7",
      "google/gemini-3.1-pro-preview",
      "deepseek/deepseek-chat",
      "google/gemini-3.1-flash-lite-preview",
    ];
    expect(pruneStale(stored, registry)).toEqual([
      "anthropic/claude-opus-4-7",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-flash-lite-preview",
    ]);
  });

  it("returns empty array when only stale ids are stored (the '2 models' bug)", () => {
    const stored = ["openai/gpt-5.5", "deepseek/deepseek-chat"];
    expect(pruneStale(stored, registry)).toEqual([]);
  });

  it("is a no-op when every stored id is valid", () => {
    const stored = ["anthropic/claude-opus-4-7", "google/gemini-3.1-pro-preview"];
    expect(pruneStale(stored, registry)).toEqual(stored);
  });
});
