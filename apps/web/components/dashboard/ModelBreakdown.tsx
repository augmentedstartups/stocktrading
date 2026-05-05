"use client";

import { motion } from "framer-motion";
import type { Action } from "@/lib/llm/schema";
import { cn } from "@/lib/utils";

export function ModelBreakdown({
  rows,
}: {
  rows: Array<{
    provider: string;
    model: string;
    action: Action;
    confidence: number;
    reason: string;
    latencyMs: number;
    ok: boolean;
    error?: string;
  }>;
}) {
  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface shadow-diffuse dark:border-zinc-800/80">
      <div className="border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-800/80">
        <p className="font-display text-lg tracking-tight text-ink">Council breakdown</p>
      </div>
      <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
        {rows.map((r, i) => (
          <motion.div
            key={`${r.provider}-${r.model}-${i}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: Math.min(i * 0.04, 0.36),
            }}
            className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[160px_minmax(0,1fr)_100px_90px]"
          >
            <div>
              <p className="font-mono text-xs text-ink">
                {r.provider}/{r.model}
              </p>
              <p className="number mt-1 text-[11px] text-steel">{r.latencyMs} ms</p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {r.ok ? r.reason : r.error ?? "failed"}
            </p>
            <div className="flex items-center md:justify-end">
              <span
                className={cn(
                  "font-mono text-xs uppercase tracking-wide",
                  r.action === "buy" && "text-emerald-600",
                  r.action === "sell" && "text-rose-600",
                  r.action === "hold" && "text-amber-600",
                )}
              >
                {r.ok ? r.action : "fail"}
              </span>
            </div>
            <div className="flex items-center md:justify-end">
              <span className="number text-xs text-steel">
                {r.ok ? `${Math.round(r.confidence * 100)}%` : "—"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
