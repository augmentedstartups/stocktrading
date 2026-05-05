"use client";

import { motion } from "framer-motion";

export function NewsList({
  items,
}: {
  items: Array<{ title: string; url: string; source: string; finbertScore: number }>;
}) {
  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface shadow-diffuse dark:border-zinc-800/80">
      <div className="border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-800/80">
        <p className="font-display text-lg tracking-tight text-ink">News wire</p>
      </div>
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
    </div>
  );
}
