"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PanelSkeleton } from "./PanelSkeleton";

export type NewsWireItem = {
  title: string;
  url: string;
  source: string;
  finbertScore: number;
  publishedAt?: number;
};

function formatNewsDate(ts: number): string {
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewsList({
  items,
  onRefresh,
  loading = false,
  refreshing = false,
}: {
  items: NewsWireItem[];
  onRefresh?: () => void;
  loading?: boolean;
  refreshing?: boolean;
}) {
  const busy = loading || refreshing;

  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface shadow-diffuse dark:border-zinc-800/80">
      <div className="flex items-center gap-2 border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-800/80">
        <p className="font-display text-lg tracking-tight text-ink">News wire</p>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            aria-label="Refresh news wire"
            title="Refresh news wire"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/70 text-zinc-500 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50 dark:border-zinc-700/80 dark:text-zinc-400 dark:hover:text-emerald-400",
              busy && "pointer-events-none",
            )}
          >
            <ArrowClockwise size={18} className={cn(busy && "animate-spin")} />
          </button>
        ) : null}
      </div>
      {busy ? (
        <PanelSkeleton rows={5} message="Fetching headlines & FinBERT scores…" />
      ) : (
        <ul className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
        {items.slice(0, 8).map((n, i) => (
          <motion.li
            key={n.url}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: Math.min(i * 0.035, 0.28),
            }}
            className="px-6 py-4"
          >
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-ink hover:text-accent-ink"
            >
              {n.title}
            </a>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-steel">
                {n.source}
              </span>
              {n.publishedAt ? (
                <span className="font-mono text-[11px] uppercase tracking-widest text-steel">
                  {formatNewsDate(n.publishedAt)}
                </span>
              ) : null}
              <span className="number text-xs text-zinc-500">
                FinBERT {n.finbertScore.toFixed(2)}
              </span>
            </div>
          </motion.li>
        ))}
        {items.length === 0 ? (
          <li className="px-6 py-8 text-sm text-steel">No headlines loaded yet.</li>
        ) : null}
        </ul>
      )}
    </div>
  );
}
