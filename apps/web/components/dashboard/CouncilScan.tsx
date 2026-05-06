"use client";

import { CaretDown, CircleNotch, MagnifyingGlass, Play, Plus, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

type WatchRow = { _id: Id<"watchlist">; symbol: string; favorite: boolean };
type TickerRow = { symbol: string; name: string; market?: string; sector?: string };
type DecisionDoc = {
  symbol: string;
  action: Action;
  confidence: number;
  horizon: "days" | "weeks" | "months" | "years";
  reasons: string[];
  perModel: Array<{
    provider: string;
    model: string;
    action: Action;
    confidence: number;
    reason: string;
    latencyMs: number;
    ok: boolean;
    error?: string;
  }>;
  timestamp: number;
};

type ScanResponse = {
  counts: { total: number; buy: number; hold: number; sell: number; failed: number };
  buys: Array<{ symbol: string }>;
  sells: Array<{ symbol: string }>;
  holds: Array<{ symbol: string }>;
  errors: Array<{ symbol: string; error: string }>;
};

function actionTone(a?: Action) {
  if (a === "buy") return "text-emerald-600";
  if (a === "sell") return "text-rose-600";
  if (a === "hold") return "text-amber-600";
  return "text-zinc-400";
}

function confidenceBadge(action: Action | undefined, confidence: number | undefined) {
  if (!action || confidence == null) {
    return "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/60";
  }
  const pct = Math.round(confidence * 100);
  if (action === "hold") {
    return "bg-amber-100/80 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  }
  const strong = pct >= 70;
  const medium = pct >= 50;
  if (action === "buy") {
    if (strong) return "bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-emerald-300";
    if (medium) return "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
    return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400";
  }
  if (strong) return "bg-rose-500/20 text-rose-700 ring-1 ring-rose-500/40 dark:text-rose-300";
  if (medium) return "bg-rose-100/80 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400";
}

export function CouncilScan() {
  const u = useQuery(api.users.first);
  const uid = u?._id ?? null;
  const settings = useQuery(
    api.settings.get,
    uid ? { userId: uid as Id<"users"> } : "skip",
  );
  const wl = useQuery(
    api.watchlist.list,
    uid ? { userId: uid as Id<"users"> } : "skip",
  );
  const decisions = useQuery(
    api.decisions.latestPerWatchlist,
    uid ? { userId: uid as Id<"users"> } : "skip",
  );
  const tickers = useQuery(api.tickers.list);
  const activeProviders = (settings?.activeProviders ?? []) as string[];
  const addToWatch = useMutation(api.watchlist.add);
  const removeFromWatch = useMutation(api.watchlist.remove);

  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [runningSymbols, setRunningSymbols] = useState<Set<string>>(new Set());

  const watchlist = (wl ?? []) as WatchRow[];
  const tickerMap = useMemo(() => {
    const map = new Map<string, TickerRow>();
    for (const t of (tickers ?? []) as TickerRow[]) {
      map.set(t.symbol.toUpperCase(), t);
    }
    return map;
  }, [tickers]);

  const watchSymbols = useMemo(
    () => new Set(watchlist.map((w) => w.symbol.toUpperCase())),
    [watchlist],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [] as TickerRow[];
    const list = (tickers ?? []) as TickerRow[];
    const exact: TickerRow[] = [];
    const partial: TickerRow[] = [];
    for (const t of list) {
      const sym = t.symbol.toUpperCase();
      const name = (t.name ?? "").toUpperCase();
      if (sym === q) exact.push(t);
      else if (sym.startsWith(q) || name.includes(q)) partial.push(t);
    }
    const out = [...exact, ...partial].slice(0, 8);
    if (out.length === 0 && /^[A-Z0-9.\-]+$/.test(q)) {
      out.push({ symbol: q, name: q });
    }
    return out;
  }, [query, tickers]);

  const decisionMap = (decisions ?? {}) as Record<string, DecisionDoc | null>;

  const counts = useMemo(() => {
    let buy = 0;
    let hold = 0;
    let sell = 0;
    let none = 0;
    for (const w of watchlist) {
      const d = decisionMap[w.symbol];
      if (!d) {
        none += 1;
        continue;
      }
      if (d.action === "buy") buy += 1;
      else if (d.action === "sell") sell += 1;
      else hold += 1;
    }
    return { buy, hold, sell, none, total: watchlist.length };
  }, [watchlist, decisionMap]);

  const runScan = async () => {
    if (watchlist.length === 0) return;
    setScanning(true);
    setScanError(null);
    try {
      const r = await fetch("/api/council/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: watchlist.map((w) => w.symbol),
          persist: true,
          userId: uid ?? undefined,
        }),
      });
      if (!r.ok) {
        setScanError(`Scan failed (${r.status})`);
        return;
      }
      (await r.json()) as ScanResponse;
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const toggleExpand = (sym: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  const addSymbol = async (sym: string) => {
    if (!uid) return;
    await addToWatch({ userId: uid as Id<"users">, symbol: sym.toUpperCase() });
    setQuery("");
  };

  const removeSymbol = async (sym: string) => {
    if (!uid) return;
    await removeFromWatch({ userId: uid as Id<"users">, symbol: sym });
  };

  const runSingle = async (sym: string) => {
    setRunningSymbols((prev) => {
      const next = new Set(prev);
      next.add(sym);
      return next;
    });
    try {
      await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          persist: true,
          userId: uid ?? undefined,
        }),
      });
    } catch (e) {
      setScanError(
        `Run failed for ${sym}: ${e instanceof Error ? e.message : "unknown"}`,
      );
    } finally {
      setRunningSymbols((prev) => {
        const next = new Set(prev);
        next.delete(sym);
        return next;
      });
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
            Council scan
          </h1>
          <p className="mt-1 text-sm text-steel">
            Run the multi-model council across every watchlist ticker and view
            buy / hold / sell verdicts in one place.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void runScan()}
          disabled={scanning || watchlist.length === 0 || activeProviders.length === 0}
        >
          {scanning ? "Scanning council…" : `Run council on ${watchlist.length} tickers`}
        </Button>
        {activeProviders.length === 0 && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Select models in Settings to enable the council.
          </p>
        )}
      </header>

      {scanError ? (
        <div className="rounded-bento border border-rose-500/40 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          {scanError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Tracking" value={counts.total} tone="text-ink" />
        <Stat label="Buy" value={counts.buy} tone="text-emerald-600" />
        <Stat label="Hold" value={counts.hold} tone="text-amber-600" />
        <Stat label="Sell" value={counts.sell} tone="text-rose-600" />
        <Stat label="No verdict" value={counts.none} tone="text-zinc-500" />
      </div>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-steel">
          Add a stock to watchlist
        </p>
        <div className="relative max-w-xl">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker or company (e.g. NVDA, Naspers, BRK.B)"
            className="h-11 w-full rounded-xl border border-zinc-200/80 bg-surface pl-10 pr-3 text-sm uppercase tracking-wide outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700/80"
          />
          {query && searchResults.length > 0 ? (
            <div className="absolute left-0 right-0 top-12 z-30 max-h-72 overflow-auto rounded-xl border border-zinc-200/80 bg-surface p-1 shadow-diffuse dark:border-zinc-700/80">
              {searchResults.map((t) => {
                const owned = watchSymbols.has(t.symbol.toUpperCase());
                return (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => void addSymbol(t.symbol)}
                    disabled={owned || !uid}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800"
                  >
                    <span className="flex flex-col">
                      <span className="font-mono text-sm">{t.symbol}</span>
                      <span className="text-xs text-steel">{t.name}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      {owned ? (
                        "In watchlist"
                      ) : (
                        <>
                          <Plus size={14} /> Add
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-bento border border-zinc-200/70 bg-surface shadow-diffuse dark:border-zinc-800/80">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200/70 bg-muted/40 text-left text-xs uppercase tracking-wider text-steel dark:border-zinc-800/80">
              <tr>
                <th className="w-10 py-3 pl-4" aria-label="Expand" />
                <th className="py-3">Ticker</th>
                <th className="py-3">Name</th>
                <th className="py-3">Verdict</th>
                <th className="py-3">Confidence</th>
                <th className="py-3">Horizon</th>
                <th className="py-3">Updated</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
              {watchlist.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-steel">
                    Watchlist is empty. Search above and add tickers to begin.
                  </td>
                </tr>
              ) : null}
              {watchlist.map((w) => {
                const symU = w.symbol.toUpperCase();
                const meta = tickerMap.get(symU);
                const d = decisionMap[w.symbol];
                const isOpen = expanded.has(w.symbol);
                return (
                  <FragmentRow
                    key={w.symbol}
                    symbol={w.symbol}
                    name={meta?.name ?? w.symbol}
                    decision={d ?? null}
                    isOpen={isOpen}
                    running={runningSymbols.has(w.symbol)}
                    runDisabled={activeProviders.length === 0}
                    onToggle={() => toggleExpand(w.symbol)}
                    onRemove={() => void removeSymbol(w.symbol)}
                    onRun={() => void runSingle(w.symbol)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface px-4 py-3 dark:border-zinc-800/80">
      <p className="text-[10px] uppercase tracking-[0.2em] text-steel">{label}</p>
      <p className={cn("number font-display text-2xl", tone)}>{value}</p>
    </div>
  );
}

function FragmentRow({
  symbol,
  name,
  decision,
  isOpen,
  running,
  runDisabled,
  onToggle,
  onRemove,
  onRun,
}: {
  symbol: string;
  name: string;
  decision: DecisionDoc | null;
  isOpen: boolean;
  running: boolean;
  runDisabled?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRun: () => void;
}) {
  const confPct = decision ? Math.round(decision.confidence * 100) : null;
  const badgeClasses = confidenceBadge(decision?.action, decision?.confidence);
  return (
    <>
      <tr
        className={cn("transition-colors hover:bg-muted/40", isOpen && "bg-muted/30")}
      >
        <td className="py-3 pl-4">
          <button
            type="button"
            onClick={onToggle}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/70 transition-colors hover:bg-zinc-100 dark:border-zinc-700/70 dark:hover:bg-zinc-800"
          >
            <CaretDown
              size={16}
              className={cn("transition-transform", isOpen && "rotate-180")}
            />
          </button>
        </td>
        <td className="py-3 font-mono text-sm">{symbol}</td>
        <td className="py-3 text-sm text-zinc-600 dark:text-zinc-400">{name}</td>
        <td className="py-3">
          <span
            className={cn(
              "inline-flex min-w-[3.5rem] items-center justify-center rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
              actionTone(decision?.action),
            )}
          >
            {decision?.action ?? "—"}
          </span>
        </td>
        <td className="py-3">
          <span
            className={cn(
              "inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-0.5 font-mono text-xs",
              badgeClasses,
            )}
          >
            {confPct != null ? `${confPct}%` : "—"}
          </span>
        </td>
        <td className="py-3 text-xs text-steel">{decision?.horizon ?? "—"}</td>
        <td className="py-3 text-xs text-steel">
          {decision ? new Date(decision.timestamp).toLocaleDateString() : "—"}
        </td>
        <td className="py-3 pr-4">
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRun}
              disabled={running || runDisabled}
              aria-label={
                decision ? `Re-run council on ${symbol}` : `Run council on ${symbol}`
              }
              title={
                decision ? `Re-run council on ${symbol}` : `Run council on ${symbol}`
              }
            >
              {running ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : (
                <Play size={16} weight="fill" />
              )}
            </Button>
            <Button asChild type="button" variant="ghost" size="sm">
              <Link href={`/ticker/${encodeURIComponent(symbol)}`}>Open</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              aria-label="Remove from watchlist"
            >
              <Trash size={16} />
            </Button>
          </div>
        </td>
      </tr>
      {isOpen ? (
        <tr className="bg-muted/20">
          <td colSpan={8} className="px-4 py-4">
            <DeepDive decision={decision} symbol={symbol} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DeepDive({ decision, symbol }: { decision: DecisionDoc | null; symbol: string }) {
  if (!decision) {
    return (
      <p className="text-sm text-steel">
        No council decision yet for {symbol}. Click “Run council on …” above to generate one.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-steel">
          Reasons
        </p>
        <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {decision.reasons.map((r, i) => (
            <li key={i} className="leading-relaxed">
              · {r}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-steel">
          Per-model votes
        </p>
        <div className="overflow-hidden rounded-lg border border-zinc-200/70 dark:border-zinc-800/80">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-steel">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Vote</th>
                <th className="px-3 py-2">Conf</th>
                <th className="px-3 py-2">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
              {decision.perModel.map((m, i) => (
                <tr key={`${m.provider}/${m.model}/${i}`}>
                  <td className="px-3 py-2 font-mono">{m.provider}</td>
                  <td className="px-3 py-2 font-mono text-zinc-500">{m.model}</td>
                  <td className={cn("px-3 py-2 uppercase", actionTone(m.action))}>
                    {m.ok ? m.action : "—"}
                  </td>
                  <td className="px-3 py-2 number">{Math.round(m.confidence * 100)}%</td>
                  <td className="px-3 py-2 text-zinc-500">{m.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
