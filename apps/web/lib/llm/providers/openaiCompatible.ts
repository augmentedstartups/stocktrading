import { createOpenAI } from "@ai-sdk/openai";
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
    const client = createOpenAI({ apiKey, baseURL });
    const { text } = await generateText({
      model: client(model),
      system,
      prompt: user,
      temperature: 0.2,
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
