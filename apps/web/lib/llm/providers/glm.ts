import type { ProviderResult } from "./types";
import { askOpenAICompatible } from "./openaiCompatible";

export async function askGLM(
  system: string,
  user: string,
  model = process.env.ZAI_MODEL ?? "glm-5.1",
): Promise<ProviderResult> {
  const baseURL =
    process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4";
  return askOpenAICompatible({
    provider: "zai",
    apiKey: process.env.ZAI_API_KEY,
    baseURL,
    model,
    system,
    user,
  });
}
