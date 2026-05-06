import { councilSystemPrompt, councilUserPrompt } from "./prompts";
import { askAnthropic, askAnthropicSonnet } from "./providers/anthropic";
import { askDeepSeek } from "./providers/deepseek";
import { askGemini, askGeminiFlashLite } from "./providers/gemini";
import { askGLM } from "./providers/glm";
import { askKimi } from "./providers/kimi";
import { askMiniMax } from "./providers/minimax";
import type { ProviderResult } from "./providers/types";
import type { SentimentSnapshot } from "./sentiment";

export async function runCouncil(ctx: {
  symbol: string;
  indicators: Record<string, unknown>;
  fundamentals?: Record<string, unknown>;
  sentiment?: SentimentSnapshot | null;
  rl?: { action: string; confidence: number; reason?: string };
  userHorizon?: string;
}): Promise<ProviderResult[]> {
  const system = councilSystemPrompt();
  const user = councilUserPrompt(ctx);
  const max = Number(process.env.COUNCIL_MAX_MODELS ?? "5");
  const allRunners = [
    () => askAnthropic(system, user),
    () => askAnthropicSonnet(system, user),
    () => askGemini(system, user),
    () => askGeminiFlashLite(system, user),
    () => askDeepSeek(system, user),
    () => askKimi(system, user),
    () => askGLM(system, user),
    () => askMiniMax(system, user),
  ];
  const runners = allRunners.slice(0, Math.min(max, allRunners.length));

  const settled = await Promise.all(
    runners.map((fn) =>
      fn().catch(
        (e): ProviderResult => ({
          provider: "unknown",
          model: "unknown",
          verdict: null,
          latencyMs: 0,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        }),
      ),
    ),
  );
  return settled;
}
