import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { parseVerdictJson } from "../parse";
import type { ProviderResult } from "./types";

export async function askGemini(
  system: string,
  user: string,
  model = process.env.GEMINI_COUNCIL_MODEL ?? "gemini-3.1-pro-preview",
): Promise<ProviderResult> {
  const t0 = Date.now();
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    "";
  if (!key) {
    return {
      provider: "google",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: "missing GOOGLE_GENERATIVE_AI_API_KEY",
    };
  }
  try {
    const google = createGoogleGenerativeAI({ apiKey: key });
    const { text } = await generateText({
      model: google(model),
      system,
      prompt: user,
      temperature: 0.2,
    });
    const verdict = parseVerdictJson(text);
    return {
      provider: "google",
      model,
      verdict,
      latencyMs: Date.now() - t0,
      ok: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      provider: "google",
      model,
      verdict: null,
      latencyMs: Date.now() - t0,
      ok: false,
      error: msg,
    };
  }
}

export async function askGemini35Flash(
  system: string,
  user: string,
): Promise<ProviderResult> {
  const model = process.env.GEMINI_FLASH_MODEL ?? "gemini-3.5-flash";
  return askGemini(system, user, model);
}
