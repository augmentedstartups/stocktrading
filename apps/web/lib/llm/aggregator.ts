import type { Action, Decision, Horizon } from "./schema";
import type { ProviderResult } from "./providers/types";

export function aggregateCouncil(opts: {
  symbol: string;
  results: ProviderResult[];
  rl?: { action: Action; confidence: number };
  modelWeights?: Record<string, number>;
  userHorizon?: Horizon;
}): Decision {
  const { symbol, results, rl, modelWeights, userHorizon } = opts;
  let buyScore = 0;
  let sellScore = 0;
  let holdScore = 0;
  let modelBuyScore = 0;
  let modelSellScore = 0;
  let modelHoldScore = 0;
  const counts: Record<Action, number> = { buy: 0, sell: 0, hold: 0 };
  const perModel: Decision["perModel"] = [];

  if (rl) {
    const w = 1.15 * rl.confidence;
    if (rl.action === "buy") buyScore += w;
    else if (rl.action === "sell") sellScore += w;
    else holdScore += w;
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
        reasons: [],
        latencyMs: r.latencyMs,
        timestamp: new Date().toISOString(),
        ok: false,
        error: r.error,
      });
      continue;
    }
    const v = r.verdict;
    const w = baseW * v.confidence;
    counts[v.action] += 1;
    if (v.action === "buy") {
      buyScore += w;
      modelBuyScore += w;
    } else if (v.action === "sell") {
      sellScore += w;
      modelSellScore += w;
    } else {
      holdScore += w;
      modelHoldScore += w;
    }

    perModel.push({
      provider: r.provider,
      model: r.model,
      action: v.action,
      confidence: v.confidence,
      reason: v.reasons[0] ?? "",
      reasons: v.reasons,
      latencyMs: r.latencyMs,
      timestamp: new Date().toISOString(),
      ok: true,
    });
  }

  const totalScore = buyScore + sellScore + holdScore;
  const modelScoreTotal = modelBuyScore + modelSellScore + modelHoldScore;
  const successfulVotes = counts.buy + counts.sell + counts.hold;
  const modelMajority = pickModelMajority(counts);
  let action: Action = "hold";
  let confidence = 0.5;

  if (modelMajority && successfulVotes >= 2 && modelScoreTotal > 0) {
    action = modelMajority;
    confidence =
      modelMajority === "buy"
        ? modelBuyScore / modelScoreTotal
        : modelMajority === "sell"
          ? modelSellScore / modelScoreTotal
          : modelHoldScore / modelScoreTotal;
  } else if (totalScore > 0) {
    if (buyScore === sellScore && buyScore > holdScore) {
      action = "hold";
      confidence = buyScore / totalScore;
    } else if (buyScore > sellScore && buyScore >= holdScore) {
      action = "buy";
      confidence = buyScore / totalScore;
    } else if (sellScore > buyScore && sellScore >= holdScore) {
      action = "sell";
      confidence = sellScore / totalScore;
    } else {
      action = "hold";
      confidence = holdScore / totalScore;
    }
  }

  confidence = Math.min(0.97, Math.max(0.08, confidence));

  const reasons: string[] = [];
  const horizonVotes: Horizon[] = [];
  for (const r of results) {
    if (r.ok && r.verdict) {
      horizonVotes.push(r.verdict.horizon);
      for (const reason of r.verdict.reasons) {
        if (reason.trim()) reasons.push(`${r.model}: ${reason}`);
      }
    }
  }
  if (reasons.length === 0) reasons.push("Insufficient convergent model output; defaulting to conservative synthesis.");

  const horizon = userHorizon ?? pickHorizon(horizonVotes);

  return {
    symbol,
    action,
    confidence,
    horizon,
    reasons: reasons.slice(0, 12),
    perModel,
    rlInput: rl,
  };
}

function pickModelMajority(counts: Record<Action, number>): Action | null {
  const ranked = (Object.entries(counts) as Array<[Action, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  if (ranked[0][1] === 0 || ranked[0][1] === ranked[1][1]) return null;
  return ranked[0][0];
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
