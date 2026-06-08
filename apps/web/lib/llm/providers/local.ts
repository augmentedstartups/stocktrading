import { parseVerdictJson } from "../parse";
import type { ProviderResult } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function extractLocalResponseText(value: unknown): string | null {
  if (typeof value === "string") return value;
  const root = asRecord(value);
  if (!root) return null;

  const outputItems = Array.isArray(root.output) ? root.output.map(asRecord) : [];
  const outputMessage = outputItems.find((item) => item?.type === "message");
  const outputItem = outputMessage ?? outputItems[0] ?? null;
  const message = asRecord(root.message);
  const choice = Array.isArray(root.choices) ? asRecord(root.choices[0]) : null;
  const choiceMessage = choice ? asRecord(choice.message) : null;

  return firstString(
    root.output,
    outputItem?.content,
    root.text,
    root.content,
    root.response,
    message?.content,
    choiceMessage?.content,
    choice?.text,
  );
}

export async function askLocal(
  system: string,
  user: string,
  model = process.env.LOCAL_COUNCIL_MODEL ?? "google/gemma-4-12b",
): Promise<ProviderResult> {
  const t0 = Date.now();
  const url = process.env.LOCAL_COUNCIL_URL ?? "http://localhost:1234/api/v1/chat";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, system_prompt: system, input: user }),
    });

    if (!response.ok) {
      return {
        provider: "local",
        model,
        verdict: null,
        latencyMs: Date.now() - t0,
        ok: false,
        error: `local model request failed (${response.status})`,
      };
    }

    const payload = await response.json() as unknown;
    const text = extractLocalResponseText(payload);
    if (!text) throw new Error("local model returned no text");

    return {
      provider: "local",
      model,
      verdict: parseVerdictJson(text),
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    return {
      provider: "local",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
