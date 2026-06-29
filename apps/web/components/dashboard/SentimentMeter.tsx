"use client";

import { Info } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

function scoreColor(score: number): string {
  const s = Math.max(-1, Math.min(1, score));
  if (Math.abs(s) < 0.1) return "#a1a1aa";
  if (s > 0) {
    const t = s;
    return `color-mix(in oklab, #a1a1aa ${Math.round((1 - t) * 100)}%, #34d399)`;
  }
  const t = Math.abs(s);
  return `color-mix(in oklab, #a1a1aa ${Math.round((1 - t) * 100)}%, #f87171)`;
}

function scoreTone(score: number): string {
  if (score > 0.15) return "Bullish";
  if (score < -0.15) return "Bearish";
  return "Neutral";
}

function MetricLabel({
  title,
  tooltip,
}: {
  title: string;
  tooltip: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-steel">{title}</p>
      <Tooltip label={tooltip} className="max-w-[16rem]">
        <button
          type="button"
          className="rounded text-steel hover:text-ink"
          aria-label={`About ${title}`}
        >
          <Info size={13} weight="duotone" />
        </button>
      </Tooltip>
    </div>
  );
}

export function SentimentMeter({
  finbertScore,
  consensus,
  articles,
  llmBlended = false,
}: {
  finbertScore: number;
  consensus: number;
  articles: number;
  llmBlended?: boolean;
}) {
  const reduce = useReducedMotion();
  const pct = Math.round(((consensus + 1) / 2) * 100);
  const barColor = scoreColor(consensus);

  return (
    <TooltipProvider>
      <div className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
        <p className="font-display text-lg tracking-tight text-ink">Sentiment stack</p>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          News headline mood from FinBERT, with an optional LLM deep-read blend.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/80">
            <MetricLabel
              title="FinBERT"
              tooltip={
                <>
                  FinBERT scores each headline from −1 (bearish) to +1 (bullish). This is the
                  average across the bundle. News headlines only—not price, fundamentals, or
                  council votes.
                </>
              }
            />
            <p className="number mt-2 text-2xl" style={{ color: scoreColor(finbertScore) }}>
              {finbertScore.toFixed(3)}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-steel">
              {scoreTone(finbertScore)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/80">
            <MetricLabel
              title="Consensus"
              tooltip={
                <>
                  {llmBlended ? (
                    <>
                      Blended news mood: 45% FinBERT headline average plus 55% LLM deep-read of
                      the same headlines (run via Deep sentiment). Still news only—no technicals,
                      fundamentals, or council inputs.
                    </>
                  ) : (
                    <>
                      Matches FinBERT until you run Deep sentiment. That step adds an LLM read of
                      the same headlines and blends it in (45% FinBERT, 55% LLM). News only—not
                      price, fundamentals, or council.
                    </>
                  )}
                </>
              }
            />
            <p className="number mt-2 text-2xl" style={{ color: scoreColor(consensus) }}>
              {consensus.toFixed(3)}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-steel">
              {llmBlended ? "Blended" : "FinBERT only"} · {scoreTone(consensus)}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-steel">
            <span>Bearish</span>
            <span>Bullish</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={
                reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }
              }
            />
          </div>
          <p className="mt-3 font-mono text-[11px] text-steel">{articles} articles in bundle</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
