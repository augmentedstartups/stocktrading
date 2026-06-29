import {
  councilSystemPrompt,
  councilUserPrompt,
  type CouncilHeadline,
} from "./prompts";
import { askAnthropic, askAnthropicSonnet } from "./providers/anthropic";
import { askGemini, askGemini35Flash } from "./providers/gemini";
import { askGLM } from "./providers/glm";
import { askKimi } from "./providers/kimi";
import { askLocal } from "./providers/local";
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
    id: `local/${process.env.LOCAL_COUNCIL_MODEL ?? "google/gemma-4-12b"}`,
    provider: "local",
    label: "Local Gemma 4 12B",
    run: (s, u) => askLocal(s, u),
  },
  {
    id: "local/gemma-4-e4b-it-mlx",
    provider: "local",
    label: "LM Studio Gemma 4 E4B",
    run: (s, u) => askLocal(s, u, "gemma-4-e4b-it-mlx"),
  },
  {
    id: `anthropic/${process.env.ANTHROPIC_COUNCIL_MODEL ?? "claude-opus-4-8"}`,
    provider: "anthropic",
    label: "Claude Opus 4.8",
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
    id: `google/${process.env.GEMINI_FLASH_MODEL ?? "gemini-3.5-flash"}`,
    provider: "google",
    label: "Gemini 3.5 Flash",
    run: (s, u) => askGemini35Flash(s, u),
  },
  {
    id: `moonshot/${process.env.MOONSHOT_MODEL ?? "kimi-k2.7-code"}`,
    provider: "moonshot",
    label: "Kimi K2.7 Code",
    run: (s, u) => askKimi(s, u),
  },
  {
    id: `zai/${process.env.ZAI_MODEL ?? "glm-5.2"}`,
    provider: "zai",
    label: "GLM 5.2",
    run: (s, u) => askGLM(s, u),
  },
  {
    id: `minimax/${process.env.MINIMAX_MODEL ?? "MiniMax-M3"}`,
    provider: "minimax",
    label: "MiniMax M3",
    run: (s, u) => askMiniMax(s, u),
  },
];

export const DEFAULT_COUNCIL_PROVIDER_ID = COUNCIL_MODELS[0].id;

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
  headlines?: CouncilHeadline[];
  rl?: { action: string; confidence: number; reason?: string };
  userHorizon?: string;
  activeProviders?: string[];
}): Promise<ProviderResult[]> {
  const system = councilSystemPrompt();
  const user = councilUserPrompt(ctx);

  const hasExplicitSelection = Array.isArray(ctx.activeProviders);
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
