import { afterEach, describe, expect, it, vi } from "vitest";
import { askLocal, extractLocalResponseText } from "@/lib/llm/providers/local";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("local council provider", () => {
  it("extracts text from supported local response shapes", () => {
    expect(extractLocalResponseText({ output: "one" })).toBe("one");
    expect(extractLocalResponseText({ output: [{ type: "message", content: "two" }] })).toBe("two");
    expect(extractLocalResponseText({
      output: [
        { type: "reasoning", content: "ignore me" },
        { type: "message", content: "final answer" },
      ],
    })).toBe("final answer");
    expect(extractLocalResponseText({ message: { content: "three" } })).toBe("three");
    expect(extractLocalResponseText({ choices: [{ message: { content: "four" } }] })).toBe("four");
  });

  it("posts the council prompt to the local endpoint and parses the verdict", async () => {
    vi.stubEnv("LOCAL_COUNCIL_URL", "http://localhost:1234/api/v1/chat");
    vi.stubEnv("LOCAL_COUNCIL_MODEL", "google/gemma-4-12b");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: JSON.stringify({
            action: "buy",
            confidence: 0.72,
            horizon: "months",
            reasons: ["Technical trend is supportive", "Sentiment is constructive"],
          }),
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    const result = await askLocal("system", "user");

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("local");
    expect(result.model).toBe("google/gemma-4-12b");
    expect(result.verdict?.action).toBe("buy");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:1234/api/v1/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "google/gemma-4-12b",
          system_prompt: "system",
          input: "user",
        }),
      }),
    );
  });
});
