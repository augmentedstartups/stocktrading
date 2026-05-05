import type { ProviderResult } from "./types";
import { askOpenAICompatible } from "./openaiCompatible";

export async function askDeepSeek(
  system: string,
  user: string,
  model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
): Promise<ProviderResult> {
  const baseURL =
    process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
  return askOpenAICompatible({
    provider: "deepseek",
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL,
    model,
    system,
    user,
  });
}
