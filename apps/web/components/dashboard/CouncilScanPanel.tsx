"use client";

import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

export type ScanRow = {
  symbol: string;
  action: Action;
  confidence: number;
  horizon: "days" | "weeks" | "months" | "years";
  reasons: string[];
};

export type ScanResult = {
  counts: { total: number; buy: number; hold: number; sell: number; failed: number };
  buys: ScanRow[];
  sells: ScanRow[];
  holds: ScanRow[];
  errors: Array<{ symbol: string; error: string }>;
};

function actionTone(a: Action) {
  if (a === "buy") return "text-emerald-600";
  if (a === "sell") return "text-rose-600";
  return "text-amber-600";
}

function Section({ title, rows, onSelect }: { title: string; rows: ScanRow[]; onSelect?: (s: string) => void }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-steel">
        {title} · {rows.length}
      </p>
      <ul className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
        {rows.map((r) => (
          <li key={r.symbol}>
            <button
              type="button"
              onClick={() => onSelect?.(r.symbol)}
              className="flex w-full items-start gap-3 py-3 text-left hover:bg-muted/40"
            >
              <span className="font-mono text-sm text-ink w-20 shrink-0">{r.symbol}</span>
              <span className={cn("font-mono text-xs uppercase w-12 shrink-0", actionTone(r.action))}>
                {r.action}
              </span>
              <span className="number text-xs text-steel w-14 shrink-0">
                {Math.round(r.confidence * 100)}%
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {r.reasons[0] ?? ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CouncilScanPanel({
  loading,
  progress,
  result,
  onSelect,
}: {
  loading: boolean;
  progress?: { done: number; total: number } | null;
  result: ScanResult | null;
  onSelect?: (s: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-steel">
          Running council across watchlist…
          {progress ? ` (${progress.done}/${progress.total})` : ""}
        </p>
        <p className="text-xs text-zinc-500">
          Each ticker fans out to multiple LLMs and is aggregated. This may take a minute.
        </p>
      </div>
    );
  }
  if (!result) {
    return (
      <p className="text-sm text-steel">
        No scan yet. Trigger “Scan watchlist” to fan the council across every symbol.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Buy" value={result.counts.buy} tone="text-emerald-600" />
        <Stat label="Hold" value={result.counts.hold} tone="text-amber-600" />
        <Stat label="Sell" value={result.counts.sell} tone="text-rose-600" />
        <Stat label="Failed" value={result.counts.failed} tone="text-zinc-500" />
      </div>
      <Section title="Buy" rows={result.buys} onSelect={onSelect} />
      <Section title="Sell" rows={result.sells} onSelect={onSelect} />
      <Section title="Hold" rows={result.holds} onSelect={onSelect} />
      {result.errors.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-steel">
            Errors · {result.errors.length}
          </p>
          <ul className="space-y-1 text-xs text-rose-600">
            {result.errors.map((e) => (
              <li key={e.symbol}>
                <span className="font-mono">{e.symbol}</span> · {e.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface px-3 py-2 dark:border-zinc-800/80">
      <p className="text-[10px] uppercase tracking-[0.2em] text-steel">{label}</p>
      <p className={cn("number font-display text-2xl", tone)}>{value}</p>
    </div>
  );
}
