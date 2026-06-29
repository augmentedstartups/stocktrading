import type { ProviderResult } from "./types";
import { askOpenAICompatible } from "./openaiCompatible";

export async function askKimi(
  system: string,
  user: string,
  model = process.env.MOONSHOT_MODEL ?? "kimi-k2.7-code",
): Promise<ProviderResult> {
  const baseURL =
    process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1";
  return askOpenAICompatible({
    provider: "moonshot",
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL,
    model,
    system,
    user,
  });
}
