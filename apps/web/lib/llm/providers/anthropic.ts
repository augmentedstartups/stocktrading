import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { parseVerdictJson } from "../parse";
import type { ProviderResult } from "./types";

export async function askAnthropic(
  system: string,
  user: string,
  model = process.env.ANTHROPIC_COUNCIL_MODEL ?? "claude-opus-4-8",
): Promise<ProviderResult> {
  const t0 = Date.now();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      provider: "anthropic",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: "missing ANTHROPIC_API_KEY",
    };
  }
  try {
    const anthropic = createAnthropic({ apiKey: key });
    const { text } = await generateText({
      model: anthropic(model),
      system,
      prompt: user,
      temperature: 0.2,
    });
    const verdict = parseVerdictJson(text);
    return {
      provider: "anthropic",
      model,
      verdict,
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      provider: "anthropic",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: msg,
    };
  }
}

export async function askAnthropicSonnet(
  system: string,
  user: string,
): Promise<ProviderResult> {
  const model = process.env.ANTHROPIC_SONNET_MODEL ?? "claude-sonnet-4-6";
  return askAnthropic(system, user, model);
}
