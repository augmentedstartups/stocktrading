"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { BootstrapClient } from "./BootstrapClient";
import { CouncilModelPicker } from "./CouncilModelPicker";
import { DecisionCard } from "./DecisionCard";
import { IndicatorRail } from "./IndicatorRail";
import { NewsList } from "./NewsList";
import { SentimentMeter } from "./SentimentMeter";
import { TickerChart, type Candle, type IndSeries } from "./TickerChart";
import { TickerCombobox } from "./TickerCombobox";
import { WatchlistTable } from "./WatchlistTable";
import type { Action } from "@/lib/llm/schema";
import { applySentimentWire, fetchSentimentWire } from "@/lib/ml";

type PerModelRow = {
  provider: string;
  model: string;
  action: Action;
  confidence: number;
  reason: string;
  reasons?: string[];
  latencyMs: number;
  timestamp?: string;
  ok: boolean;
  error?: string;
};

type InputsUsed = {
  technical: boolean;
  fundamentals: boolean;
  sentiment: boolean;
  rl: boolean;
  evidence?: {
    technical?: Array<{ label: string; value: string }>;
    fundamentals?: Array<{ label: string; value: string }>;
    sentiment?: {
      consensus?: number;
      finbertScore?: number;
      articles?: number;
      headlines?: Array<{ title: string; url?: string }>;
    };
    rl?: { action: string; confidence: number; reason?: string };
  };
};

type DecisionShape = {
  action: Action;
  confidence: number;
  reasons: string[];
  perModel: PerModelRow[];
  snapshot?: string;
};

type ChartPeriod = "1y" | "2y" | "5y" | "10y";

const CHART_PERIODS: Array<{ value: ChartPeriod; label: string }> = [
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
];

function evidenceEntries(source: Record<string, unknown> | undefined, limit = 8) {
  return Object.entries(source ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      value: typeof value === "number" ? Number(value.toFixed(4)).toString() : String(value),
    }));
}

async function readJsonBody<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function inputsFromSnapshot(decision: DecisionShape | null): InputsUsed | null {
  if (!decision?.snapshot) return null;
  try {
    const parsed = JSON.parse(decision.snapshot) as {
      indicators?: Record<string, unknown>;
      fundamentals?: Record<string, unknown>;
      sentiment?: { consensus?: number; finbert?: { score?: number; n_articles?: number } } | null;
      articles?: Array<{ title: string; url?: string }>;
      rl?: { action: string; confidence: number; reason?: string };
      inputsUsed?: InputsUsed;
    };
    if (parsed.inputsUsed) return parsed.inputsUsed;
    return {
      technical: Object.keys(parsed.indicators ?? {}).length > 0,
      fundamentals: Object.keys(parsed.fundamentals ?? {}).length > 0,
      sentiment: Boolean(parsed.sentiment),
      rl: Boolean(parsed.rl),
      evidence: {
        technical: evidenceEntries(parsed.indicators),
        fundamentals: evidenceEntries(parsed.fundamentals),
        sentiment: parsed.sentiment
          ? {
              consensus: parsed.sentiment.consensus,
              finbertScore: parsed.sentiment.finbert?.score,
              articles: parsed.sentiment.finbert?.n_articles ?? parsed.articles?.length,
              headlines: parsed.articles?.slice(0, 5),
            }
          : undefined,
        rl: parsed.rl,
      },
    };
  } catch {
    return null;
  }
}

const OFFLINE_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMZN", name: "Amazon.com" },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "NPN.JO", name: "Naspers Ltd" },
  { symbol: "FSR.JO", name: "FirstRand Ltd" },
  { symbol: "SBK.JO", name: "Standard Bank Group" },
  { symbol: "SHP.JO", name: "Shoprite Holdings" },
];

function OfflineBanner() {
  return (
    <div className="mb-6 rounded-bento border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      Set{" "}
      <span className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</span> for live
      persistence and indicator sync across devices.
    </div>
  );
}

export function DashboardHome() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-steel">Loading…</div>}>
      <DashboardHomeGate />
    </Suspense>
  );
}

function DashboardHomeGate() {
  const sp = useSearchParams();
  const e2eOffline = sp.get("e2eOffline") === "1";
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  if (e2eOffline || !hasConvex) {
    return (
      <div>
        {!hasConvex ? <OfflineBanner /> : null}
        <OfflineDashboard />
      </div>
    );
  }
  return (
    <>
      <BootstrapClient />
      <LiveDashboard />
    </>
  );
}

function OfflineDashboard() {
  const [symbol, setSymbol] = useState("AAPL");
  const [decision, setDecision] = useState<DecisionShape | null>(null);
  const [inputsUsed, setInputsUsed] = useState<InputsUsed | null>(null);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [series, setSeries] = useState<IndSeries[]>([]);
  const [news, setNews] = useState<
    Array<{ title: string; url: string; source: string; finbertScore: number }>
  >([]);
  const [sentiment, setSentiment] = useState<{
    finbert: { score: number; n_articles: number };
    consensus: number;
    llmBlended?: boolean;
  } | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [railIndicators, setRailIndicators] = useState<string[]>([
    "MA50",
    "MA200",
    "Volume",
    "RSI",
  ]);
  const active = useMemo(() => new Set(railIndicators), [railIndicators]);

  useEffect(() => {
    setDecision(null);
    setInputsUsed(null);
  }, [symbol]);

  const loadChart = useCallback(async () => {
    try {
      setChartError(null);
      const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:58123";
      const encodedSymbol = encodeURIComponent(symbol);
      const pr = await fetch(`${base}/prices?symbol=${encodedSymbol}&limit=400`);
      const pj = await pr.json();
      setCandles(pj.candles ?? []);
      const ir = await fetch(`${base}/indicators?symbol=${encodedSymbol}`);
      const ij = await ir.json();
      setSeries(ij.series ?? []);
      const { articles, sentiment: wireSentiment } = applySentimentWire(
        await fetchSentimentWire(symbol),
      );
      setNews(articles);
      setSentiment(wireSentiment);
    } catch {
      setChartError("Market data service is unavailable.");
    }
  }, [symbol]);

  const loadNewsWire = useCallback(async () => {
    setNewsRefreshing(true);
    try {
      const { articles, sentiment: wireSentiment } = applySentimentWire(
        await fetchSentimentWire(symbol),
      );
      setNews(articles);
      setSentiment(wireSentiment);
    } finally {
      setNewsRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  const runCouncil = async () => {
    setLoading(true);
    try {
      setChartError(null);
      const r = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          persist: false,
          activeProviders: activeProviders.length > 0 ? activeProviders : undefined,
        }),
      });
      const j = await readJsonBody<{ decision?: DecisionShape; inputsUsed?: InputsUsed; error?: string }>(r);
      if (!r.ok || !j?.decision) {
        setChartError(j?.error ?? "Council run failed.");
        return;
      }
      setDecision(j.decision);
      setInputsUsed(j.inputsUsed ?? null);
    } finally {
      setLoading(false);
    }
  };

  const deepSentiment = async () => {
    const r = await fetch("/api/sentiment/deep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    const j = await r.json();
    if (j.snapshot) {
      setSentiment({
        finbert: {
          score: j.snapshot.finbert.score,
          n_articles: j.snapshot.finbert.n_articles,
        },
        consensus: j.snapshot.consensus,
        llmBlended: j.snapshot.llm != null,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <TickerCombobox
            value={symbol}
            onChange={setSymbol}
            options={OFFLINE_TICKERS}
          />
          <CouncilModelPicker
            selected={activeProviders}
            onChange={setActiveProviders}
          />
          <Button type="button" onClick={() => void loadChart()}>
            Refresh data
          </Button>
          <Button type="button" variant="secondary" onClick={() => void runCouncil()} disabled={loading || activeProviders.length === 0}>
            {loading ? "Running council…" : "Run council"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void deepSentiment()}>
            Deep sentiment
          </Button>
        </div>
        {activeProviders.length === 0 && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Select at least one model above to enable the council.
          </p>
        )}
        {chartError ? (
          <div className="rounded-bento border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            {chartError}
          </div>
        ) : null}
        <div className="rounded-bento border border-zinc-200/60 bg-surface/40 p-2 shadow-diffuse dark:border-zinc-800/70">
          <TickerChart candles={candles} series={series} active={active} />
        </div>
        <IndicatorRail
          indicators={railIndicators}
          onToggleComplete={(next) => {
            setRailIndicators(next);
          }}
        />
        {decision ? (
          <DecisionCard
            symbol={symbol}
            action={decision.action}
            confidence={decision.confidence}
            reasons={decision.reasons}
            perModel={decision.perModel}
            inputsUsed={inputsUsed ?? undefined}
          />
        ) : (
          <div className="rounded-bento border border-dashed border-zinc-300/80 p-8 text-sm text-steel dark:border-zinc-700/80">
            Run the council to synthesize a Buy/Hold/Sell memo for {symbol}.
          </div>
          )}
        </section>
      <aside className="flex flex-col gap-8">
        {sentiment ? (
          <SentimentMeter
            finbertScore={sentiment.finbert.score}
            consensus={sentiment.consensus}
            articles={sentiment.finbert.n_articles}
            llmBlended={sentiment.llmBlended}
          />
        ) : null}
        <NewsList
          items={news}
          onRefresh={() => void loadNewsWire()}
          refreshing={newsRefreshing}
        />
      </aside>
    </div>
  );
}

function LiveDashboard() {
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

  const [symbol, setSymbol] = useState("AAPL");
  const defaultedRef = useRef(false);
  const [period, setPeriod] = useState<ChartPeriod>("10y");
  const [loading, setLoading] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [localDecision, setLocalDecision] = useState<DecisionShape | null>(null);
  const [localInputsUsed, setLocalInputsUsed] = useState<InputsUsed | null>(null);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setLocalDecision(null);
    setLocalInputsUsed(null);
  }, [symbol]);

  useEffect(() => {
    if (Array.isArray(settings?.activeProviders) && settings.activeProviders.length > 0) {
      setActiveProviders(settings.activeProviders);
    }
  }, [settings?.activeProviders]);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [series, setSeries] = useState<IndSeries[]>([]);
  const [news, setNews] = useState<
    Array<{ title: string; url: string; source: string; finbertScore: number }>
  >([]);
  const [sentiment, setSentiment] = useState<{
    finbert: { score: number; n_articles: number };
    consensus: number;
    llmBlended?: boolean;
  } | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [newsRefreshing, setNewsRefreshing] = useState(false);

  const indicators = (settings?.indicators ?? []) as string[];
  const active = useMemo(() => new Set<string>(indicators), [indicators]);
  const tickerOptions =
    tickers && tickers.length
      ? tickers.map((t) => ({ symbol: t.symbol, name: t.name }))
      : OFFLINE_TICKERS;

  const loadChart = useCallback(async () => {
    try {
      setChartError(null);
      const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:58123";
      const encodedSymbol = encodeURIComponent(symbol);
      const pr = await fetch(`${base}/prices?symbol=${encodedSymbol}&period=${period}`);
      const pj = await pr.json();
      setCandles(pj.candles ?? []);
      const ir = await fetch(`${base}/indicators?symbol=${encodedSymbol}&period=${period}`);
      const ij = await ir.json();
      setSeries(ij.series ?? []);
      const { articles, sentiment: wireSentiment } = applySentimentWire(
        await fetchSentimentWire(symbol),
      );
      setNews(articles);
      setSentiment(wireSentiment);
    } catch {
      setChartError("Market data service is unavailable.");
    }
  }, [period, symbol]);

  const loadNewsWire = useCallback(async () => {
    setNewsRefreshing(true);
    try {
      const { articles, sentiment: wireSentiment } = applySentimentWire(
        await fetchSentimentWire(symbol),
      );
      setNews(articles);
      setSentiment(wireSentiment);
    } finally {
      setNewsRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  useEffect(() => {
    if (wl && wl.length && !defaultedRef.current) {
      defaultedRef.current = true;
      if (!wl.find((x: { symbol: string }) => x.symbol === symbol)) {
        setSymbol(wl[0].symbol);
      }
    }
  }, [wl, symbol]);

  const remoteDecision = decisions?.[symbol] as DecisionShape | null | undefined;

  const decision: DecisionShape | null = localDecision ?? remoteDecision ?? null;
  const decisionInputsUsed = localInputsUsed ?? inputsFromSnapshot(decision);

  const runCouncil = async () => {
    setLoading(true);
    try {
      setChartError(null);
      const r = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          persist: true,
          userId: uid ?? undefined,
          activeProviders,
        }),
      });
      const j = await readJsonBody<{ decision?: DecisionShape; inputsUsed?: InputsUsed; error?: string }>(r);
      if (!r.ok || !j?.decision) {
        setChartError(j?.error ?? "Council run failed.");
        return;
      }
      setLocalDecision(j.decision);
      setLocalInputsUsed(j.inputsUsed ?? null);
    } finally {
      setLoading(false);
    }
  };

  const deepSentiment = async () => {
    const r = await fetch("/api/sentiment/deep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    const j = await r.json();
    if (j.snapshot) {
      setSentiment({
        finbert: {
          score: j.snapshot.finbert.score,
          n_articles: j.snapshot.finbert.n_articles,
        },
        consensus: j.snapshot.consensus,
        llmBlended: j.snapshot.llm != null,
      });
    }
  };

  const fav = useMutation(api.watchlist.toggleFavorite);
  const setIndicatorsMut = useMutation(api.settings.setIndicators);
  const setProvidersMut = useMutation(api.settings.setActiveProviders);

  const setActiveProvidersAndSave = (next: string[]) => {
    setActiveProviders(next);
    if (uid) {
      void setProvidersMut({ userId: uid, activeProviders: next });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-8">
          <div className="rounded-bento border border-zinc-200/70 bg-surface p-6 shadow-diffuse dark:border-zinc-800/80 md:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <TickerCombobox
                value={symbol}
                onChange={setSymbol}
                options={[
                  ...((wl ?? []) as Array<{ symbol: string }>).map((w) => ({ symbol: w.symbol })),
                  ...tickerOptions,
                ]}
              />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-steel">
                  Data range
                </span>
                <div className="flex flex-wrap gap-2">
                  {CHART_PERIODS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={period === option.value ? "default" : "outline"}
                      onClick={() => setPeriod(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <CouncilModelPicker
                selected={activeProviders}
                onChange={setActiveProvidersAndSave}
                defaultIds={settings?.activeProviders ?? []}
              />
              <Button type="button" onClick={() => void loadChart()}>
                Refresh data
              </Button>
              <Button type="button" variant="secondary" onClick={() => void runCouncil()} disabled={loading || activeProviders.length === 0}>
                {loading ? "Running council…" : "Run council"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void deepSentiment()}>
                Deep sentiment
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={`/ticker/${encodeURIComponent(symbol)}`}>Ticker detail</Link>
              </Button>
              <Button type="button" variant="outline" onClick={() => setWatchlistOpen(true)}>
                <span suppressHydrationWarning>Watchlist ({hydrated ? (wl?.length ?? 0) : 0})</span>
              </Button>
            </div>
            {hydrated && activeProviders.length === 0 ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Select at least one model above to enable the council.
              </p>
            ) : null}
            {chartError ? (
              <div className="mt-4 rounded-bento border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                {chartError}
              </div>
            ) : null}
          </div>

          <div className="rounded-bento border border-zinc-200/60 bg-surface/40 p-2 shadow-diffuse dark:border-zinc-800/70">
            <TickerChart candles={candles} series={series} active={active} />
          </div>
          <IndicatorRail
            indicators={indicators}
            disableToggle={!uid}
            onToggleComplete={(next) => {
              if (!uid) return;
              void setIndicatorsMut({ userId: uid, indicators: next });
            }}
          />

          {decision ? (
            <DecisionCard
              symbol={symbol}
              action={decision.action}
              confidence={decision.confidence}
              reasons={decision.reasons}
              perModel={decision.perModel}
              inputsUsed={decisionInputsUsed ?? undefined}
            />
          ) : (
            <div className="rounded-bento border border-dashed border-zinc-300/80 p-8 text-sm text-steel dark:border-zinc-700/80">
              Run the council to synthesize a Buy/Hold/Sell memo for {symbol}.
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-8">
          {sentiment ? (
            <SentimentMeter
              finbertScore={sentiment.finbert.score}
              consensus={sentiment.consensus}
              articles={sentiment.finbert.n_articles}
              llmBlended={sentiment.llmBlended}
            />
          ) : null}
          <NewsList
            items={news}
            onRefresh={() => void loadNewsWire()}
            refreshing={newsRefreshing}
          />
        </aside>
      </div>
      <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen} title="Watchlist">
        <WatchlistTable
          items={wl ?? []}
          decisions={decisions ?? {}}
          symbol={symbol}
          onSelect={(next) => {
            setSymbol(next);
            setWatchlistOpen(false);
          }}
          onToggleFavorite={(sym) => {
            if (uid) void fav({ userId: uid, symbol: sym });
          }}
        />
      </Sheet>
    </>
  );
}
