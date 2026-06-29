export const LOCAL_GEMMA_PROVIDER_ID = "local/google/gemma-4-12b";

export const LEGACY_PROVIDER_MAP: Record<string, string> = {
  "anthropic/claude-opus-4-7": "anthropic/claude-opus-4-8",
  "moonshot/kimi-k2.7": "moonshot/kimi-k2.7-code",
  "google/gemini-3.1-flash-lite-preview": "google/gemini-3.5-flash",
  "google/gemini-3-flash-preview": "google/gemini-3.5-flash",
  "minimax/MiniMax-M2.7": "minimax/MiniMax-M3",
  "deepseek/deepseek-v4-pro": LOCAL_GEMMA_PROVIDER_ID,
  "deepseek/deepseek-chat": LOCAL_GEMMA_PROVIDER_ID,
};

export function migrateActiveProviders(stored: string[], validIds: string[]): string[] {
  const valid = new Set(validIds);
  return [...new Set(
    stored
      .map((id) => LEGACY_PROVIDER_MAP[id] ?? id)
      .filter((id) => valid.has(id)),
  )];
}
