"use client";

import {
  ArrowSquareOut,
  CaretDown,
  CircleNotch,
  MagnifyingGlass,
  Play,
  Plus,
  SlidersHorizontal,
  Square,
  Trash,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CouncilModelPicker } from "./CouncilModelPicker";
import { HorizonPicker } from "./HorizonPicker";
import { cn } from "@/lib/utils";
import { LOCAL_GEMMA_PROVIDER_ID } from "@/lib/llm/activeProviders";
import type { Action, Horizon } from "@/lib/llm/schema";
import { searchTickers } from "@/lib/tickerSearch";

type PerModelEntry = {
  provider: string;
  model: string;
  action: Action;
  reasons?: string[];
  reason?: string;
  ok: boolean;
};

function pillColor(provider: string) {
  const map: Record<string, string> = {
    anthropic: "border-violet-500/35 bg-violet-500/10 text-violet-800 dark:text-violet-200",
    google: "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200",
    local: "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    moonshot: "border-cyan-500/35 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
    zai: "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    minimax: "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200",
  };
  return (
    map[provider] ??
    "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"
  );
}

const PILLAR_COLORS: Record<string, string> = {
  "[Technical]": "border-blue-400/40 bg-blue-50/80 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  "[Fundamentals]": "border-violet-400/40 bg-violet-50/80 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  "[News]": "border-amber-400/40 bg-amber-50/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  "[RL]": "border-emerald-400/40 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  "[Model]": "border-zinc-300/70 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
};

function parsePillar(text: string): { tag: string | null; body: string } {
  const match = text.match(/^(\[[\w]+\])\s*/);
  if (match) return { tag: match[1], body: text.slice(match[0].length) };
  return { tag: null, body: text };
}

function ReasonsDisplay({
  perModel,
  reasons,
}: {
  perModel?: PerModelEntry[];
  reasons: string[];
}) {
  type ReasonRow = { tag: string | null; body: string };
  type ModelSection = { model: string; provider: string; rows: ReasonRow[] };

  const sections: ModelSection[] = [];

  if (perModel && perModel.length > 0) {
    for (const m of perModel) {
      if (!m.ok) continue;
      const bullets =
        m.reasons && m.reasons.length > 0
          ? m.reasons
          : m.reason
            ? [m.reason]
            : [];

      const rows: ReasonRow[] = [];
      for (const text of bullets) {
        const { tag, body } = parsePillar(text.trim());
        if (!text.trim()) continue;
        rows.push({ tag, body: body || text });
      }

      if (rows.length > 0) sections.push({ model: m.model, provider: m.provider, rows });
    }
  }

  if (sections.length === 0 && reasons.length > 0) {
    const fallback = new Map<string, ModelSection>();
    for (const r of reasons) {
      const idx = r.indexOf(": ");
      const text = idx > 0 ? r.slice(idx + 2) : r;
      const model = idx > 0 ? r.slice(0, idx) : "council";
      const { tag, body } = parsePillar(text);
      const section = fallback.get(model) ?? { model, provider: "council", rows: [] };
      section.rows.push({ tag, body: body || text });
      fallback.set(model, section);
    }
    for (const section of fallback.values()) {
      if (section.rows.length > 0) {
        sections.push(section);
      }
    }
  }

  if (sections.length === 0) {
    return <p className="text-sm text-steel">No reasons recorded.</p>;
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={`${section.provider}/${section.model}`}>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-mono text-[10px] leading-none tracking-wide",
                pillColor(section.provider),
              )}
            >
              {section.model}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-steel">
              {section.provider}
            </span>
          </div>
          <ul className="ml-1 space-y-2.5 border-l border-zinc-200/60 pl-1 dark:border-zinc-800/60">
            {section.rows.map((row, i) => (
              <li key={i} className="flex items-start gap-3 pl-3">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] leading-none tracking-wide",
                    row.tag
                      ? (PILLAR_COLORS[row.tag] ?? PILLAR_COLORS["[Model]"])
                      : PILLAR_COLORS["[Model]"],
                  )}
                >
                  {row.tag ?? "[Model]"}
                </span>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {row.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const DEFAULT_LOCAL_PROVIDER_ID = LOCAL_GEMMA_PROVIDER_ID;
const EXPANDED_STORAGE_KEY = "council-watchlist-expanded";
const HORIZON_STORAGE_KEY = "council-watchlist-horizon";
const OPTIONS_OPEN_KEY = "council-watchlist-options-open";

function formatDecisionUpdatedAt(timestamp: number): { date: string; time: string } {
  const value = new Date(timestamp);
  return {
    date: value.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: value.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function loadHorizon(): Horizon {
  if (typeof window === "undefined") return "years";
  try {
    const v = localStorage.getItem(HORIZON_STORAGE_KEY);
    if (v === "days" || v === "weeks" || v === "months" || v === "years") return v;
  } catch {
    /* ignore */
  }
  return "years";
}

function loadOptionsOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OPTIONS_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function loadExpandedSymbols(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s): s is string => typeof s === "string"));
  } catch {
    return new Set();
  }
}

type WatchRow = { _id: Id<"watchlist">; symbol: string; favorite: boolean };
type TickerRow = {
  symbol: string;
  name: string;
  market?: string;
  sector?: string;
  aliases?: string[];
};
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
    reasons?: string[];
    latencyMs: number;
    ok: boolean;
    error?: string;
  }>;
  timestamp: number;
};

type ScanProgress = {
  current: string | null;
  done: number;
  total: number;
  failed: number;
};

function ScanProgressBar({
  progress,
  onStop,
}: {
  progress: ScanProgress;
  onStop: () => void;
}) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-2 rounded-bento border border-zinc-200/60 bg-surface/80 px-4 py-3 dark:border-zinc-800/70">
      <div className="flex items-center gap-2 text-xs text-steel">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <CircleNotch size={14} className="shrink-0 animate-spin text-emerald-600" />
          <span className="truncate">
            {progress.current
              ? `Analyzing ${progress.current}`
              : "Starting watchlist scan…"}
          </span>
        </span>
        <span className="number shrink-0 tabular-nums">
          {progress.done}/{progress.total}
          {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={onStop}
          aria-label="Stop scan"
          title="Stop scan"
        >
          <Square size={14} weight="fill" />
        </Button>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80"
        role="progressbar"
        aria-valuenow={progress.done}
        aria-valuemin={0}
        aria-valuemax={progress.total}
      >
        <div
          className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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

export function CouncilScan({
  title = "Council scan",
}: {
  title?: string;
  description?: string;
}) {
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
  const setProvidersMut = useMutation(api.settings.setActiveProviders);
  const setHorizonMut = useMutation(api.settings.setHorizon);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("years");
  const [horizonReady, setHorizonReady] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsReady, setOptionsReady] = useState(false);
  const scanCancelRef = useRef(false);

  useEffect(() => {
    setHorizon(loadHorizon());
    setHorizonReady(true);
    setOptionsOpen(loadOptionsOpen());
    setOptionsReady(true);
  }, []);

  useEffect(() => {
    if (!horizonReady || !settings?.horizon) return;
    setHorizon(settings.horizon);
    localStorage.setItem(HORIZON_STORAGE_KEY, settings.horizon);
  }, [settings?.horizon, horizonReady]);

  useEffect(() => {
    if (!optionsReady) return;
    localStorage.setItem(OPTIONS_OPEN_KEY, optionsOpen ? "1" : "0");
  }, [optionsOpen, optionsReady]);

  useEffect(() => {
    if (settings?.activeProviders?.length) {
      setActiveProviders(settings.activeProviders as string[]);
    } else {
      setActiveProviders([DEFAULT_LOCAL_PROVIDER_ID]);
    }
  }, [settings?.activeProviders]);

  const setActiveProvidersAndSave = (next: string[]) => {
    setActiveProviders(next);
    if (uid) void setProvidersMut({ userId: uid, activeProviders: next });
  };

  const setHorizonAndSave = (next: Horizon) => {
    setHorizon(next);
    localStorage.setItem(HORIZON_STORAGE_KEY, next);
    if (uid) void setHorizonMut({ userId: uid, horizon: next });
  };

  const toggleOptions = () => setOptionsOpen((v) => !v);

  const providersForRun =
    activeProviders.length > 0 ? activeProviders : [DEFAULT_LOCAL_PROVIDER_ID];
  const addToWatch = useMutation(api.watchlist.add);
  const removeFromWatch = useMutation(api.watchlist.remove);

  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedReady, setExpandedReady] = useState(false);
  const [runningSymbols, setRunningSymbols] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(loadExpandedSymbols());
    setExpandedReady(true);
  }, []);

  useEffect(() => {
    if (!expandedReady) return;
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...expanded]));
  }, [expanded, expandedReady]);

  const watchlist = (wl ?? []) as WatchRow[];

  useEffect(() => {
    if (!expandedReady || watchlist.length === 0) return;
    const valid = new Set(watchlist.map((w) => w.symbol));
    setExpanded((prev) => {
      const next = new Set([...prev].filter((s) => valid.has(s)));
      return next.size === prev.size ? prev : next;
    });
  }, [watchlist, expandedReady]);
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
    return searchTickers(query, (tickers ?? []) as TickerRow[]);
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

  const runCouncilRequest = async (sym: string) => {
    const r = await fetch("/api/council", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: sym,
        persist: true,
        userId: uid ?? undefined,
        activeProviders: providersForRun,
        userHorizon: horizon,
      }),
    });
    return r.ok;
  };

  const stopScan = () => {
    scanCancelRef.current = true;
  };

  const runScan = async () => {
    if (watchlist.length === 0) return;
    const symbols = watchlist.map((w) => w.symbol);
    scanCancelRef.current = false;
    setScanning(true);
    setScanError(null);
    setScanProgress({ current: null, done: 0, total: symbols.length, failed: 0 });
    let failed = 0;
    let stopped = false;
    let completed = 0;
    try {
      for (let i = 0; i < symbols.length; i += 1) {
        if (scanCancelRef.current) {
          stopped = true;
          break;
        }
        const sym = symbols[i];
        setScanProgress({ current: sym, done: i, total: symbols.length, failed });
        setRunningSymbols((prev) => {
          const next = new Set(prev);
          next.add(sym);
          return next;
        });
        try {
          const ok = await runCouncilRequest(sym);
          if (!ok) failed += 1;
        } catch {
          failed += 1;
        } finally {
          setRunningSymbols((prev) => {
            const next = new Set(prev);
            next.delete(sym);
            return next;
          });
        }
        if (scanCancelRef.current) {
          stopped = true;
          completed = i + 1;
          setScanProgress({
            current: null,
            done: completed,
            total: symbols.length,
            failed,
          });
          break;
        }
        completed = i + 1;
        setScanProgress({
          current: sym,
          done: completed,
          total: symbols.length,
          failed,
        });
      }
      if (stopped) {
        setScanError(`Scan stopped after ${completed} of ${symbols.length} ticker(s).`);
      } else if (failed > 0) {
        setScanError(`${failed} of ${symbols.length} ticker(s) failed during scan.`);
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanProgress(null);
      setScanning(false);
      scanCancelRef.current = false;
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

  const allExpanded =
    watchlist.length > 0 && watchlist.every((w) => expanded.has(w.symbol));

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpanded(new Set());
      return;
    }
    setExpanded(new Set(watchlist.map((w) => w.symbol)));
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
      const ok = await runCouncilRequest(sym);
      if (!ok) {
        setScanError(`Run failed for ${sym}.`);
      }
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl tracking-tight text-ink">{title}</h1>
          <StatPill label="Total" value={counts.total} tone="text-ink" />
          <StatPill label="Buy" value={counts.buy} tone="text-emerald-600" />
          <StatPill label="Hold" value={counts.hold} tone="text-amber-600" />
          <StatPill label="Sell" value={counts.sell} tone="text-rose-600" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={optionsOpen ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggleOptions}
            aria-label="Analysis options"
            aria-expanded={optionsOpen}
            title="Analysis options"
          >
            <SlidersHorizontal size={16} />
          </Button>
          {scanning ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={stopScan}
              aria-label="Stop scan"
              title="Stop scan"
            >
              <Square size={14} weight="fill" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={() => void runScan()}
            disabled={scanning || watchlist.length === 0 || providersForRun.length === 0}
          >
            Analyze all
          </Button>
        </div>
      </div>

      {optionsOpen ? (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200/70 bg-muted/20 px-3 py-3 dark:border-zinc-800/80">
          <HorizonPicker compact value={horizon} onChange={setHorizonAndSave} />
          <CouncilModelPicker
            compact
            selected={activeProviders}
            onChange={setActiveProvidersAndSave}
            defaultIds={settings?.activeProviders ?? [DEFAULT_LOCAL_PROVIDER_ID]}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add ticker…"
            className="h-9 w-full rounded-lg border border-zinc-200/80 bg-surface pl-8 pr-3 text-sm uppercase tracking-wide outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700/80"
          />
          {query && searchResults.length > 0 ? (
            <div className="absolute left-0 right-0 top-10 z-30 max-h-60 overflow-auto rounded-lg border border-zinc-200/80 bg-surface p-1 shadow-diffuse dark:border-zinc-700/80">
              {searchResults.map((t) => {
                const owned = watchSymbols.has(t.symbol.toUpperCase());
                return (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => void addSymbol(t.symbol)}
                    disabled={owned || !uid}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800"
                  >
                    <span className="flex flex-col">
                      <span className="font-mono text-xs">{t.symbol}</span>
                      <span className="text-[10px] text-steel">{t.name}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                      {owned ? "Added" : <Plus size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {query && searchResults.length === 0 ? (
            <div className="absolute left-0 right-0 top-10 z-30 rounded-lg border border-zinc-200/80 bg-surface px-3 py-2 text-xs text-steel shadow-diffuse dark:border-zinc-700/80">
              No matching tickers found.
            </div>
          ) : null}
        </div>
        {watchlist.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={toggleAllExpanded}>
            {allExpanded ? "Collapse all" : "Expand all"}
          </Button>
        ) : null}
      </div>

      {scanProgress ? <ScanProgressBar progress={scanProgress} onStop={stopScan} /> : null}

      {scanError ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          {scanError}
        </div>
      ) : null}

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
                const scanActive = scanProgress?.current === w.symbol;
                return (
                  <FragmentRow
                    key={w.symbol}
                    symbol={w.symbol}
                    name={meta?.name ?? w.symbol}
                    decision={d ?? null}
                    isOpen={isOpen}
                    running={runningSymbols.has(w.symbol)}
                    scanActive={scanActive}
                    runDisabled={providersForRun.length === 0}
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

function StatPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200/70 px-2 py-0.5 text-[11px] dark:border-zinc-800/80">
      <span className="text-steel">{label}</span>
      <span className={cn("number font-medium", tone)}>{value}</span>
    </span>
  );
}

function FragmentRow({
  symbol,
  name,
  decision,
  isOpen,
  running,
  scanActive,
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
  scanActive?: boolean;
  runDisabled?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRun: () => void;
}) {
  const confPct = decision ? Math.round(decision.confidence * 100) : null;
  const badgeClasses = confidenceBadge(decision?.action, decision?.confidence);
  const updatedAt = decision ? formatDecisionUpdatedAt(decision.timestamp) : null;
  const tickerHref = `/ticker/${encodeURIComponent(symbol)}`;
  return (
    <>
      <tr
        className={cn(
          "transition-colors hover:bg-muted/40",
          isOpen && "bg-muted/30",
          scanActive && "bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/25",
        )}
      >
        <td className="w-12 py-3 pl-4 pr-3">
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
        <td className="py-3 pl-2">
          <Link
            href={tickerHref}
            className="font-mono text-sm text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {symbol}
            {scanActive ? (
              <CircleNotch size={12} className="ml-1.5 inline animate-spin text-emerald-600" />
            ) : null}
          </Link>
        </td>
        <td className="py-3">
          <Link
            href={tickerHref}
            className="text-sm text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
          >
            {name}
          </Link>
        </td>
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
          {updatedAt ? (
            <div className="flex flex-col leading-tight">
              <span>{updatedAt.date}</span>
              <span className="text-[10px] text-steel/80">{updatedAt.time}</span>
            </div>
          ) : (
            "—"
          )}
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
              <Link href={tickerHref} aria-label={`Open ${symbol}`} title={`Open ${symbol}`}>
                <ArrowSquareOut size={16} />
              </Link>
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
        <ReasonsDisplay perModel={decision.perModel} reasons={decision.reasons} />
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
