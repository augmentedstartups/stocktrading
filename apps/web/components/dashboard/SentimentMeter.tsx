"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SentimentMeter({
  finbertScore,
  consensus,
  articles,
}: {
  finbertScore: number;
  consensus: number;
  articles: number;
}) {
  const reduce = useReducedMotion();
  const pct = Math.round(((consensus + 1) / 2) * 100);
  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
      <p className="font-display text-lg tracking-tight text-ink">Sentiment stack</p>
      <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        FinBERT bulk scores blended with optional LLM deep-read consensus.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/80">
          <p className="font-mono text-[11px] uppercase tracking-widest text-steel">
            FinBERT
          </p>
          <p className="number mt-2 text-2xl text-ink">{finbertScore.toFixed(3)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/80">
          <p className="font-mono text-[11px] uppercase tracking-widest text-steel">
            Consensus
          </p>
          <p className="number mt-2 text-2xl text-ink">{consensus.toFixed(3)}</p>
        </div>
      </div>
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-steel">
          <span>Bearish</span>
          <span>Bullish</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
          <motion.div
            className="h-full rounded-full bg-accent"
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
  );
}
