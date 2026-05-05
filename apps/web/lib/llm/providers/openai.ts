import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { parseVerdictJson } from "../parse";
import type { ProviderResult } from "./types";

export async function askOpenAI(
  system: string,
  user: string,
  model = process.env.OPENAI_COUNCIL_MODEL ?? "gpt-5.5",
): Promise<ProviderResult> {
  const t0 = Date.now();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      provider: "openai",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: "missing OPENAI_API_KEY",
    };
  }
  try {
    const openai = createOpenAI({ apiKey: key });
    const { text } = await generateText({
      model: openai(model),
      system,
      prompt: user,
      temperature: 0.2,
    });
    const verdict = parseVerdictJson(text);
    return {
      provider: "openai",
      model,
      verdict,
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      provider: "openai",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: msg,
    };
  }
}
