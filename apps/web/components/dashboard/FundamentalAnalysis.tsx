"use client";

import { ArrowClockwise, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  BENCHMARK_LABELS,
  METRIC_DEFS,
  metricValue,
  type FundamentalInfo,
  type MetricKey,
} from "@/lib/fundamentalMetrics";
import type { FundamentalsResponse } from "@/lib/ml";
import { MetricCardSkeleton } from "./PanelSkeleton";

function severityStyles(severity: "good" | "warn" | "bad" | "neutral") {
  if (severity === "good") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (severity === "warn") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  if (severity === "bad") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-zinc-300/60 bg-zinc-100/80 text-zinc-600 dark:border-zinc-700/80 dark:bg-zinc-800/60 dark:text-zinc-300";
}

function MetricCard({
  symbol,
  companyName,
  info,
  benchmarks,
  defIndex,
}: {
  symbol: string;
  companyName: string;
  info: FundamentalInfo;
  benchmarks: FundamentalsResponse["benchmarks"];
  defIndex: number;
}) {
  const def = METRIC_DEFS[defIndex];
  if (!def) return null;

  const value = metricValue(info, def.key);
  const pos = def.position(value);
  const severity = def.severity(value);
  const display = def.format(value);

  const benchOrder = ["AAPL", "NVDA", "SPY"] as const;

  return (
    <article className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
            {def.index} — {def.category}
          </p>
          <h3 className="mt-1 font-display text-lg tracking-tight text-ink">{def.title}</h3>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-mono text-sm",
            severityStyles(severity),
          )}
        >
          {(severity === "bad" || severity === "warn") && <Warning size={14} weight="fill" />}
          {display}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{def.analogy}</p>

      <div className="mt-5">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-steel">
          <span>{def.leftLabel}</span>
          <span>{def.rightLabel}</span>
        </div>
        <div
          className={cn(
            "relative mt-2 h-2.5 overflow-hidden rounded-full bg-gradient-to-r",
            def.gradient === "red-to-green"
              ? "from-rose-500 via-amber-400 to-emerald-500"
              : "from-emerald-500 via-amber-400 to-rose-500",
          )}
        >
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-900 shadow-md dark:border-zinc-200 dark:bg-white"
            style={{ left: `${pos}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {benchOrder.map((benchSym) => {
          const bench = benchmarks?.[benchSym];
          const benchVal = bench ? metricValue(bench, def.key) : null;
          const label = BENCHMARK_LABELS[benchSym] ?? benchSym;
          return (
            <span
              key={benchSym}
              className="rounded-lg border border-zinc-200/70 bg-surface px-2.5 py-1 font-mono text-[11px] text-zinc-600 dark:border-zinc-700/80 dark:text-zinc-400"
            >
              {label} ({benchSym}) {def.chipFormat(benchVal)}
            </span>
          );
        })}
        <span className="rounded-lg border border-zinc-300/80 bg-zinc-200/60 px-2.5 py-1 font-mono text-[11px] text-ink dark:border-zinc-600/80 dark:bg-zinc-800/80">
          {companyName} ({symbol}) {display}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {def.summary(companyName, value)}
      </p>
    </article>
  );
}

export function FundamentalAnalysis({
  data,
  loading = false,
  onRefresh,
}: {
  data: FundamentalsResponse | null;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const info = data?.info;
  const companyName =
    (info?.shortName as string | undefined) ??
    (info?.longName as string | undefined) ??
    data?.symbol ??
    "This company";

  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface shadow-diffuse dark:border-zinc-800/80">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200/60 px-6 py-4 dark:border-zinc-800/80">
        <div>
          <p className="font-display text-lg tracking-tight text-ink">Fundamental analysis</p>
          <p className="mt-1 max-w-[42ch] text-xs leading-relaxed text-steel">
            P/E, P/S, and EV/EBITDA move with the stock price daily. Margins and EPS update when
            earnings are reported (typically quarterly).
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh fundamentals"
            title="Refresh fundamentals"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/70 text-zinc-500 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50 dark:border-zinc-700/80 dark:text-zinc-400 dark:hover:text-emerald-400",
              loading && "pointer-events-none",
            )}
          >
            <ArrowClockwise size={18} className={cn(loading && "animate-spin")} />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {loading ? (
          <>
            <p className="animate-pulse px-2 font-mono text-[11px] uppercase tracking-widest text-steel">
              Pulling valuation & earnings data…
            </p>
            {Array.from({ length: 5 }, (_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </>
        ) : null}
        {!loading && !data ? (
          <p className="px-2 py-6 text-sm text-steel">Fundamentals unavailable.</p>
        ) : null}
        {!loading && info
          ? METRIC_DEFS.map((def, i) => (
              <MetricCard
                key={def.key as MetricKey}
                symbol={data!.symbol}
                companyName={companyName}
                info={info as FundamentalInfo}
                benchmarks={data?.benchmarks}
                defIndex={i}
              />
            ))
          : null}
      </div>
    </div>
  );
}
