"use client";

import { cn } from "@/lib/utils";

export function PanelSkeleton({
  rows = 4,
  message,
  className,
}: {
  rows?: number;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 px-6 py-4", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="h-4 w-full rounded-md bg-zinc-200/90 dark:bg-zinc-800/90" />
          <div className="h-3 w-2/3 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
        </div>
      ))}
      {message ? (
        <p className="animate-pulse pt-1 font-mono text-[11px] uppercase tracking-widest text-steel">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="flex justify-between gap-3">
        <div className="space-y-2">
          <div className="h-2 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-8 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="h-3 w-5/6 rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
      </div>
      <div className="mt-5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-6 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
