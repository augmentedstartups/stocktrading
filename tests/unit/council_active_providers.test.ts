import { describe, expect, it } from "vitest";
import { migrateActiveProviders } from "@/lib/llm/activeProviders";
import { COUNCIL_MODELS } from "@/lib/llm/council";

describe("council activeProviders reconciliation", () => {
  const registry = COUNCIL_MODELS.map((m) => m.id);

  it("registry contains the expected provider ids", () => {
    expect(registry).toContain("local/google/gemma-4-12b");
    expect(registry).toContain("local/gemma-4-e4b-it-mlx");
    expect(registry).toContain("anthropic/claude-opus-4-8");
    expect(registry).toContain("anthropic/claude-sonnet-4-6");
    expect(registry).toContain("google/gemini-3.1-pro-preview");
    expect(registry).toContain("google/gemini-3.5-flash");
    expect(registry).toContain("moonshot/kimi-k3");
    expect(registry).toContain("zai/glm-5.2");
    expect(registry).toContain("minimax/MiniMax-M3");
    expect(registry).not.toContain("openai/gpt-5.5");
    expect(registry).not.toContain("anthropic/claude-opus-4-7");
    expect(registry).not.toContain("google/gemini-3.1-flash-lite-preview");
    expect(registry).not.toContain("minimax/MiniMax-M2.7");
    expect(registry).not.toContain("deepseek/deepseek-v4-pro");
    expect(registry).not.toContain("deepseek/deepseek-chat");
  });

  it("migrates legacy ids and prunes stale ones", () => {
    const stored = [
      "openai/gpt-5.5",
      "anthropic/claude-opus-4-7",
      "google/gemini-3.1-pro-preview",
      "deepseek/deepseek-chat",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3-flash-preview",
      "moonshot/kimi-k2.7",
      "minimax/MiniMax-M2.7",
    ];
    expect(migrateActiveProviders(stored, registry)).toEqual([
      "anthropic/claude-opus-4-8",
      "google/gemini-3.1-pro-preview",
      "local/google/gemma-4-12b",
      "google/gemini-3.5-flash",
      "moonshot/kimi-k3",
      "minimax/MiniMax-M3",
    ]);
  });

  it("returns empty array when only unmappable stale ids are stored", () => {
    const stored = ["openai/gpt-5.5", "openai/gpt-4o"];
    expect(migrateActiveProviders(stored, registry)).toEqual([]);
  });

  it("is a no-op when every stored id is valid", () => {
    const stored = ["anthropic/claude-opus-4-8", "google/gemini-3.1-pro-preview"];
    expect(migrateActiveProviders(stored, registry)).toEqual(stored);
  });
});
