"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

type CouncilMode = {
  provider: string;
  model: string;
  action: Action;
  confidence: number;
  reason: string;
  ok: boolean;
  error?: string;
};

export function DecisionCard({
  symbol,
  action,
  confidence,
  reasons,
  perModel,
}: {
  symbol: string;
  action: Action;
  confidence: number;
  reasons: string[];
  perModel?: CouncilMode[];
}) {
  const reduce = useReducedMotion();
  const ring = Math.round(confidence * 100);
  const color =
    action === "buy"
      ? "text-emerald-700 dark:text-emerald-300"
      : action === "sell"
        ? "text-rose-700 dark:text-rose-300"
        : "text-amber-700 dark:text-amber-300";
  const rows: CouncilMode[] =
    perModel && perModel.length > 0
      ? perModel.slice(0, 6)
      : reasons.slice(0, 6).map((reason) => {
          const [provider, ...rest] = reason.split(": ");
          return {
            provider: rest.length ? provider : "council",
            model: "summary",
            action,
            confidence,
            reason: rest.length ? rest.join(": ") : reason,
            ok: true,
          };
        });

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
      <div className="mt-8 flex flex-col gap-5 border-t border-zinc-200/60 pt-6 dark:border-zinc-800/80">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-steel">
            Modes used
          </p>
          <div className="flex flex-wrap gap-2">
            {rows.map((r, i) => (
              <span
                key={`${r.provider}-${r.model}-${i}-mode`}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide",
                  r.ok
                    ? "border-zinc-200/80 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300",
                )}
              >
                {r.provider}/{r.model}
              </span>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <li
              key={`${r.provider}-${r.model}-${i}`}
              className={cn(
                "rounded-2xl border bg-zinc-50/60 p-4 dark:bg-zinc-950/30",
                r.ok && r.action === "buy" && "border-emerald-200/80 dark:border-emerald-900/60",
                r.ok && r.action === "sell" && "border-rose-200/80 dark:border-rose-900/60",
                r.ok && r.action === "hold" && "border-amber-200/80 dark:border-amber-900/60",
                !r.ok && "border-rose-200/80 dark:border-rose-900/60",
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wide text-ink">
                    {r.provider}
                  </span>
                  <span className="number text-[11px] text-steel">{r.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-xs uppercase tracking-wide",
                      r.ok && r.action === "buy" && "text-emerald-600 dark:text-emerald-300",
                      r.ok && r.action === "sell" && "text-rose-600 dark:text-rose-300",
                      r.ok && r.action === "hold" && "text-amber-600 dark:text-amber-300",
                      !r.ok && "text-rose-600 dark:text-rose-300",
                    )}
                  >
                    {r.ok ? r.action : "fail"}
                  </span>
                  <span className="number text-xs text-steel">
                    {r.ok ? `${Math.round(r.confidence * 100)}%` : "—"}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {r.ok ? r.reason : r.error ?? "Model did not return a verdict."}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
