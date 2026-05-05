import type { Action, Decision, Horizon } from "./schema";
import type { ProviderResult } from "./providers/types";

function voteToScore(action: Action): number {
  if (action === "buy") return 1;
  if (action === "sell") return -1;
  return 0;
}

function scoreToAction(s: number): Action {
  if (s > 0.22) return "buy";
  if (s < -0.22) return "sell";
  return "hold";
}

export function aggregateCouncil(opts: {
  symbol: string;
  results: ProviderResult[];
  rl?: { action: Action; confidence: number };
  modelWeights?: Record<string, number>;
}): Decision {
  const { symbol, results, rl, modelWeights } = opts;
  let num = 0;
  let den = 0;
  const perModel: Decision["perModel"] = [];

  if (rl) {
    const w = 1.15 * rl.confidence;
    num += voteToScore(rl.action) * w;
    den += w;
  }

  for (const r of results) {
    const key = `${r.provider}/${r.model}`;
    const baseW = modelWeights?.[key] ?? 1;
    if (!r.ok || !r.verdict) {
      perModel.push({
        provider: r.provider,
        model: r.model,
        action: "hold",
        confidence: 0,
        reason: "",
        latencyMs: r.latencyMs,
        ok: false,
        error: r.error,
      });
      continue;
    }
    const v = r.verdict;
    const w = baseW * v.confidence;
    num += voteToScore(v.action) * w;
    den += w;
    perModel.push({
      provider: r.provider,
      model: r.model,
      action: v.action,
      confidence: v.confidence,
      reason: v.reasons[0] ?? "",
      latencyMs: r.latencyMs,
      ok: true,
    });
  }

  const raw = den > 0 ? num / den : 0;
  const action = scoreToAction(raw);
  const confidence = Math.min(0.97, Math.abs(raw) * 0.85 + (den > 0 ? 0.08 : 0));

  const reasons: string[] = [];
  const horizonVotes: Horizon[] = [];
  for (const r of results) {
    if (r.ok && r.verdict) {
      horizonVotes.push(r.verdict.horizon);
      if (r.verdict.reasons[0]) reasons.push(`${r.provider}: ${r.verdict.reasons[0]}`);
    }
  }
  if (reasons.length === 0) reasons.push("Insufficient convergent model output; defaulting to conservative synthesis.");

  const horizon = pickHorizon(horizonVotes);

  return {
    symbol,
    action,
    confidence,
    horizon,
    reasons: reasons.slice(0, 6),
    perModel,
    rlInput: rl,
  };
}

function pickHorizon(votes: Horizon[]): Horizon {
  if (votes.length === 0) return "months";
  const counts: Record<Horizon, number> = {
    days: 0,
    weeks: 0,
    months: 0,
    years: 0,
  };
  for (const v of votes) counts[v] += 1;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Horizon;
}
