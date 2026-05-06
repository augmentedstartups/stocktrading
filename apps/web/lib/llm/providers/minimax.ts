import type { ProviderResult } from "./types";
import { askOpenAICompatible } from "./openaiCompatible";

export async function askMiniMax(
  system: string,
  user: string,
  model = process.env.MINIMAX_MODEL ?? "MiniMax-M2.7",
): Promise<ProviderResult> {
  const baseURL =
    process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1";
  return askOpenAICompatible({
    provider: "minimax",
    apiKey: process.env.MINIMAX_API_KEY,
    baseURL,
    model,
    system,
    user,
  });
}
