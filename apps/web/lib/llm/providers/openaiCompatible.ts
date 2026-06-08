import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { parseVerdictJson } from "../parse";
import type { ProviderResult } from "./types";

export async function askOpenAICompatible(opts: {
  provider: string;
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  system: string;
  user: string;
}): Promise<ProviderResult> {
  const t0 = Date.now();
  const { provider, apiKey, baseURL, model, system, user } = opts;
  if (!apiKey) {
    return {
      provider,
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: `missing API key for ${provider}`,
    };
  }
  try {
    const client = createOpenAICompatible({ apiKey, baseURL, name: provider });
    const { text } = await generateText({
      model: client.chatModel(model),
      system,
      prompt: user,
      temperature: provider === "moonshot" ? 1 : 0.2,
    });
    const verdict = parseVerdictJson(text);
    return {
      provider,
      model,
      verdict,
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      provider,
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: msg,
    };
  }
}
