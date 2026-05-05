import type { Verdict } from "../schema";

export type ProviderResult = {
  provider: string;
  model: string;
  verdict: Verdict | null;
  latencyMs: number;
  ok: boolean;
  error?: string;
};
