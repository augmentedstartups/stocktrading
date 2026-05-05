"use client";

import { Star } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

type Row = {
  symbol: string;
  favorite: boolean;
};

export function WatchlistTable({
  items,
  decisions,
  symbol,
  onSelect,
  onToggleFavorite,
}: {
  items: Row[];
  decisions: Record<string, unknown>;
  symbol: string;
  onSelect: (s: string) => void;
  onToggleFavorite: (s: string) => void;
}) {
  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface shadow-diffuse dark:border-zinc-800/80">
      <div className="border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-800/80">
        <p className="font-display text-lg tracking-tight text-ink">Watchlist</p>
        <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Favorites surface first. Tap a row to load its chart and council context.
        </p>
      </div>
      <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
        {items.map((w, i) => {
          const d = decisions[w.symbol] as
            | { action: Action; confidence: number }
            | null
            | undefined;
          const sel = w.symbol === symbol;
          return (
            <motion.button
              key={w.symbol}
              type="button"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: Math.min(i * 0.04, 0.35),
              }}
              onClick={() => onSelect(w.symbol)}
              className={cn(
                "flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/50",
                sel && "bg-muted/40",
              )}
            >
              <span
                role="button"
                tabIndex={0}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200/70 dark:border-zinc-700/70"
                aria-label={w.favorite ? "Remove favorite" : "Mark favorite"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(w.symbol);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite(w.symbol);
                  }
                }}
              >
                <Star
                  size={22}
                  weight={w.favorite ? "fill" : "regular"}
                  className={cn(w.favorite ? "text-amber-500" : "text-zinc-400")}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-ink">{w.symbol}</p>
                <p className="number text-xs text-steel">
                  {d
                    ? `${d.action.toUpperCase()} · ${Math.round(d.confidence * 100)}% conf`
                    : "No verdict yet"}
                </p>
              </div>
              <span
                className={cn(
                  "font-mono text-xs uppercase tracking-wide",
                  d?.action === "buy" && "text-emerald-600",
                  d?.action === "sell" && "text-rose-600",
                  d?.action === "hold" && "text-amber-600",
                  !d && "text-zinc-400",
                )}
              >
                {d?.action ?? "—"}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
