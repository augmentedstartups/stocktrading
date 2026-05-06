import { councilSystemPrompt, councilUserPrompt } from "./prompts";
import { askAnthropic, askAnthropicSonnet } from "./providers/anthropic";
import { askDeepSeek } from "./providers/deepseek";
import { askGemini, askGeminiFlashLite } from "./providers/gemini";
import { askGLM } from "./providers/glm";
import { askKimi } from "./providers/kimi";
import { askMiniMax } from "./providers/minimax";
import type { ProviderResult } from "./providers/types";
import type { SentimentSnapshot } from "./sentiment";

export type CouncilModel = {
  id: string;
  provider: string;
  label: string;
  run: (system: string, user: string) => Promise<ProviderResult>;
};

export const COUNCIL_MODELS: CouncilModel[] = [
  {
    id: `anthropic/${process.env.ANTHROPIC_COUNCIL_MODEL ?? "claude-opus-4-7"}`,
    provider: "anthropic",
    label: "Claude Opus 4.7",
    run: (s, u) => askAnthropic(s, u),
  },
  {
    id: `anthropic/${process.env.ANTHROPIC_SONNET_MODEL ?? "claude-sonnet-4-6"}`,
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    run: (s, u) => askAnthropicSonnet(s, u),
  },
  {
    id: `google/${process.env.GEMINI_COUNCIL_MODEL ?? "gemini-3.1-pro-preview"}`,
    provider: "google",
    label: "Gemini 3.1 Pro",
    run: (s, u) => askGemini(s, u),
  },
  {
    id: `google/${process.env.GEMINI_FLASH_LITE_MODEL ?? "gemini-3.1-flash-lite-preview"}`,
    provider: "google",
    label: "Gemini 3.1 Flash Lite",
    run: (s, u) => askGeminiFlashLite(s, u),
  },
  {
    id: `deepseek/${process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro"}`,
    provider: "deepseek",
    label: "DeepSeek V4 Pro",
    run: (s, u) => askDeepSeek(s, u),
  },
  {
    id: `moonshot/${process.env.MOONSHOT_MODEL ?? "kimi-k2.6"}`,
    provider: "moonshot",
    label: "Kimi K2.6",
    run: (s, u) => askKimi(s, u),
  },
  {
    id: `zai/${process.env.ZAI_MODEL ?? "glm-5.1"}`,
    provider: "zai",
    label: "GLM 5.1",
    run: (s, u) => askGLM(s, u),
  },
  {
    id: `minimax/${process.env.MINIMAX_MODEL ?? "MiniMax-M2.7"}`,
    provider: "minimax",
    label: "MiniMax M2.7",
    run: (s, u) => askMiniMax(s, u),
  },
];

export function listCouncilModels(): Array<{
  id: string;
  provider: string;
  label: string;
}> {
  return COUNCIL_MODELS.map(({ id, provider, label }) => ({ id, provider, label }));
}

export async function runCouncil(ctx: {
  symbol: string;
  indicators: Record<string, unknown>;
  fundamentals?: Record<string, unknown>;
  sentiment?: SentimentSnapshot | null;
  rl?: { action: string; confidence: number; reason?: string };
  userHorizon?: string;
  activeProviders?: string[];
}): Promise<ProviderResult[]> {
  const system = councilSystemPrompt();
  const user = councilUserPrompt(ctx);

  const hasExplicitSelection =
    Array.isArray(ctx.activeProviders) && ctx.activeProviders.length > 0;
  const selected = hasExplicitSelection
    ? COUNCIL_MODELS.filter((m) => ctx.activeProviders!.includes(m.id))
    : COUNCIL_MODELS;

  const cap = Number(process.env.COUNCIL_MAX_MODELS ?? "0");
  const runners = !hasExplicitSelection && cap > 0 ? selected.slice(0, cap) : selected;

  const settled = await Promise.all(
    runners.map((m) =>
      m.run(system, user).catch(
        (e): ProviderResult => ({
          provider: m.provider,
          model: m.id.split("/")[1] ?? m.id,
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
