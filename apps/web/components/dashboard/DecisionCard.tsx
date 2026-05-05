"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

export function DecisionCard({
  symbol,
  action,
  confidence,
  reasons,
}: {
  symbol: string;
  action: Action;
  confidence: number;
  reasons: string[];
}) {
  const reduce = useReducedMotion();
  const ring = Math.round(confidence * 100);
  const color =
    action === "buy"
      ? "text-emerald-700 dark:text-emerald-300"
      : action === "sell"
        ? "text-rose-700 dark:text-rose-300"
        : "text-amber-700 dark:text-amber-300";

  return (
    <motion.div
      layout
      className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80"
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-steel">
            Council verdict
          </p>
          <h2 className="font-display mt-2 text-3xl tracking-tight text-ink md:text-4xl">
            {symbol}
          </h2>
        </div>
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - confidence)}`}
              strokeLinecap="round"
              className={cn(
                action === "buy" && "text-emerald-500",
                action === "sell" && "text-rose-500",
                action === "hold" && "text-amber-500",
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-display text-lg tracking-tight", color)}>
              {action.toUpperCase()}
            </span>
            <span className="number text-xs text-steel">{ring}%</span>
          </div>
        </div>
      </div>
      <ul className="mt-8 space-y-3 border-t border-zinc-200/60 pt-6 dark:border-zinc-800/80">
        {reasons.slice(0, 5).map((r) => (
          <li
            key={r}
            className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
          >
            {r}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
