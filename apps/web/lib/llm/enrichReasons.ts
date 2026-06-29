import type { CouncilHeadline } from "./prompts";
import type { ProviderResult } from "./providers/types";
import type { SentimentSnapshot } from "./sentiment";

export type CouncilReasonContext = {
  indicators: Record<string, unknown>;
  fundamentals?: Record<string, unknown>;
  sentiment?: SentimentSnapshot | null;
  headlines?: CouncilHeadline[];
  rl?: { action: string; confidence: number };
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function fmtMoney(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

function summarizeTechnical(ind: Record<string, unknown>): string {
  const close = num(ind.close);
  const ma20 = num(ind.ma20);
  const ma50 = num(ind.ma50);
  const ma200 = num(ind.ma200);
  const rsi = num(ind.rsi);
  const macdHist = num(ind.macdHist);
  const bits: string[] = [];
  if (close != null && ma20 != null) {
    bits.push(
      close >= ma20
        ? `price $${close.toFixed(2)} above MA20 ($${ma20.toFixed(2)})`
        : `price $${close.toFixed(2)} below MA20 ($${ma20.toFixed(2)})`,
    );
  }
  if (close != null && ma50 != null) {
    bits.push(
      close >= ma50
        ? `above MA50 ($${ma50.toFixed(2)})`
        : `below MA50 ($${ma50.toFixed(2)})`,
    );
  }
  if (close != null && ma200 != null) {
    bits.push(
      close >= ma200
        ? `above MA200 ($${ma200.toFixed(2)})`
        : `below MA200 ($${ma200.toFixed(2)})`,
    );
  }
  if (rsi != null) bits.push(`RSI ${rsi.toFixed(1)}`);
  if (macdHist != null) {
    bits.push(`MACD histogram ${macdHist >= 0 ? "positive" : "negative"}`);
  }
  return bits.join("; ") || "Technical indicators available.";
}

function summarizeFundamentals(f: Record<string, unknown>): string {
  const bits: string[] = [];
  const name = f.shortName ?? f.longName;
  if (typeof name === "string") bits.push(name);
  if (typeof f.sector === "string") {
    bits.push(
      typeof f.industry === "string" ? `${f.sector} / ${f.industry}` : f.sector,
    );
  }
  const pe = num(f.trailingPE);
  const fpe = num(f.forwardPE);
  if (pe != null) bits.push(`trailing P/E ${pe.toFixed(1)}`);
  if (fpe != null) bits.push(`forward P/E ${fpe.toFixed(1)}`);
  const rg = num(f.revenueGrowth);
  const eg = num(f.earningsGrowth);
  if (rg != null) bits.push(`revenue growth ${(rg * 100).toFixed(1)}%`);
  if (eg != null) bits.push(`earnings growth ${(eg * 100).toFixed(1)}%`);
  const mc = num(f.marketCap);
  if (mc != null) bits.push(`market cap ${fmtMoney(mc)}`);
  const dy = num(f.dividendYield);
  if (dy != null && dy > 0) {
    const pct = dy < 0.1 ? dy * 100 : dy;
    bits.push(`dividend yield ${pct.toFixed(2)}%`);
  }
  return bits.join("; ") || "Fundamental metrics available.";
}

function sentimentWord(score: number): string {
  if (score >= 0.25) return "bullish";
  if (score <= -0.25) return "bearish";
  return "neutral";
}

function trimTitle(title: string): string {
  return title.length > 90 ? `${title.slice(0, 87)}...` : title;
}

function summarizeNews(
  sentiment: SentimentSnapshot | null | undefined,
  headlines: CouncilHeadline[] | undefined,
): string {
  const bits: string[] = [];
  if (sentiment) {
    bits.push(
      `${sentimentWord(sentiment.consensus)} news mood (${sentiment.consensus.toFixed(2)} consensus)`,
    );
    if (sentiment.finbert.n_articles > 0) {
      bits.push(`${sentiment.finbert.n_articles} headlines scored`);
    }
  }
  const top = (headlines ?? []).slice(0, 2);
  if (top.length > 0) {
    bits.push(`recent: ${top.map((h) => `"${trimTitle(h.title)}"`).join("; ")}`);
  }
  return bits.join("; ") || "No recent headlines available.";
}

export function buildCouncilReasons(
  modelReasons: string[],
  ctx: CouncilReasonContext,
): string[] {
  const out: string[] = [];
  if (Object.keys(ctx.indicators).length > 0) {
    out.push(`[Technical] ${summarizeTechnical(ctx.indicators)}`);
  }
  if (ctx.fundamentals && Object.keys(ctx.fundamentals).length > 0) {
    out.push(`[Fundamentals] ${summarizeFundamentals(ctx.fundamentals)}`);
  }
  if (ctx.sentiment || (ctx.headlines && ctx.headlines.length > 0)) {
    out.push(`[News] ${summarizeNews(ctx.sentiment, ctx.headlines)}`);
  }
  if (ctx.rl) {
    out.push(
      `[RL] Learned policy favors ${ctx.rl.action} (${Math.round(ctx.rl.confidence * 100)}% confidence).`,
    );
  }

  const modelNote = modelReasons
    .map((r) => r.trim())
    .find(
      (r) =>
        r &&
        !/^\[Technical\]/i.test(r) &&
        !/^technical indicators show/i.test(r),
    );
  if (modelNote) {
    const cleaned = modelNote.replace(/^\[[^\]]+\]\s*/i, "");
    const key = cleaned.toLowerCase().slice(0, 40);
    if (key && !out.some((line) => line.toLowerCase().includes(key))) {
      out.push(`[Model] ${cleaned}`);
    }
  }

  return out.slice(0, 8);
}

export function enrichCouncilResults(
  results: ProviderResult[],
  ctx: CouncilReasonContext,
): ProviderResult[] {
  return results.map((r) => {
    if (!r.ok || !r.verdict) return r;
    const reasons = buildCouncilReasons(r.verdict.reasons, ctx);
    return {
      ...r,
      verdict: { ...r.verdict, reasons },
    };
  });
}
