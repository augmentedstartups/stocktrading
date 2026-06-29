"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { BootstrapClient } from "./BootstrapClient";
import { CouncilModelPicker } from "./CouncilModelPicker";
import { HorizonPicker } from "./HorizonPicker";
import { DecisionCard } from "./DecisionCard";
import { IndicatorRail } from "./IndicatorRail";
import { NewsList } from "./NewsList";
import { FundamentalAnalysis } from "./FundamentalAnalysis";
import { SentimentMeter } from "./SentimentMeter";
import { TickerChart, type Candle, type IndSeries } from "./TickerChart";
import { TickerCombobox } from "./TickerCombobox";
import { WatchlistTable } from "./WatchlistTable";
import type { Action, Horizon } from "@/lib/llm/schema";
import { applySentimentWire, fetchFundamentals, fetchSentimentWire, getCachedFundamentals, hydrateSentimentWire, type FundamentalsResponse } from "@/lib/ml";

const DEFAULT_LOCAL_PROVIDER_ID = "local/google/gemma-4-12b";

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

const OFFLINE_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
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

export function TickerDetail({ symbol }: { symbol: string }) {
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  if (!hasConvex) {
    return <TickerDetailOffline symbol={symbol} />;
  }
  return (
    <>
      <BootstrapClient />
      <TickerDetailLive symbol={symbol} />
    </>
  );
}

function TickerDetailOffline({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState<ChartPeriod>("10y");
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<DecisionShape | null>(null);
  const [activeProviders, setActiveProviders] = useState<string[]>([DEFAULT_LOCAL_PROVIDER_ID]);
  const [horizon, setHorizon] = useState<Horizon>("years");
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
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);
  const [fundamentals, setFundamentals] = useState<FundamentalsResponse | null>(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(true);
  const active = useMemo(() => new Set(["MA50", "MA200", "Volume", "RSI"]), []);

  useEffect(() => {
    const cached = getCachedFundamentals(symbol);
    setFundamentals(cached);
    setFundamentalsLoading(!cached);
    const hydrated = hydrateSentimentWire(symbol);
    if (hydrated) {
      setNews(hydrated.articles);
      setSentiment(hydrated.sentiment);
      setNewsLoading(false);
    } else {
      setNewsLoading(true);
    }
  }, [symbol]);

  const loadFundamentals = useCallback(async (refresh = false) => {
    if (!refresh) {
      const cached = getCachedFundamentals(symbol);
      if (cached) {
        setFundamentals(cached);
        setFundamentalsLoading(false);
        return;
      }
    }
    setFundamentalsLoading(true);
    try {
      setFundamentals(await fetchFundamentals(symbol, refresh));
    } catch {
      setFundamentals(getCachedFundamentals(symbol));
    } finally {
      setFundamentalsLoading(false);
    }
  }, [symbol]);

  const loadChart = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:58123";
    const encoded = encodeURIComponent(symbol);
    const pr = await fetch(`${base}/prices?symbol=${encoded}&period=${period}`);
    const pj = await pr.json();
    setCandles(pj.candles ?? []);
    const ir = await fetch(`${base}/indicators?symbol=${encoded}&period=${period}`);
    const ij = await ir.json();
    setSeries(ij.series ?? []);
  }, [period, symbol]);

  const loadNewsWire = useCallback(async (refresh = false) => {
    if (!refresh) {
      const hydrated = hydrateSentimentWire(symbol);
      if (hydrated) {
        setNews(hydrated.articles);
        setSentiment(hydrated.sentiment);
        setNewsLoading(false);
        return;
      }
    }
    if (refresh) setNewsRefreshing(true);
    else setNewsLoading(true);
    try {
      const { articles, sentiment: wireSentiment } = applySentimentWire(
        await fetchSentimentWire(symbol, refresh),
      );
      setNews(articles);
      setSentiment(wireSentiment);
    } finally {
      setNewsLoading(false);
      setNewsRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    void loadChart();
    void loadNewsWire(false);
    void loadFundamentals(false);
  }, [loadChart, loadFundamentals, loadNewsWire]);

  const runCouncil = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, persist: false, activeProviders, userHorizon: horizon }),
      });
      const j = await readJsonBody<{ decision?: DecisionShape }>(r);
      if (j?.decision) setDecision(j.decision);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TickerDetailLayout
      symbol={symbol}
      period={period}
      onPeriodChange={setPeriod}
      activeProviders={activeProviders}
      onProvidersChange={setActiveProviders}
      horizon={horizon}
      onHorizonChange={setHorizon}
      onSymbolChange={(next) => router.push(`/ticker/${encodeURIComponent(next)}`)}
      tickerOptions={OFFLINE_TICKERS}
      watchlistCount={0}
      onOpenWatchlist={() => {}}
      onRefresh={() => {
        void loadChart();
        void loadNewsWire(true);
        void loadFundamentals(true);
      }}
      onRunCouncil={() => void runCouncil()}
      onDeepSentiment={async () => {
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
      }}
      loading={loading}
      chartError={null}
      candles={candles}
      series={series}
      active={active}
      indicators={["MA50", "MA200", "Volume", "RSI"]}
      onIndicatorsChange={() => {}}
      disableIndicatorToggle
      decision={decision}
      inputsUsed={null}
      sentiment={sentiment}
      news={news}
      onRefreshNews={() => void loadNewsWire(true)}
      newsLoading={newsLoading}
      newsRefreshing={newsRefreshing}
      fundamentals={fundamentals}
      fundamentalsLoading={fundamentalsLoading}
      onRefreshFundamentals={() => void loadFundamentals(true)}
      watchlistSheet={null}
    />
  );
}

function TickerDetailLive({ symbol }: { symbol: string }) {
  const router = useRouter();
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

  const [period, setPeriod] = useState<ChartPeriod>("10y");
  const [loading, setLoading] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [localDecision, setLocalDecision] = useState<DecisionShape | null>(null);
  const [localInputsUsed, setLocalInputsUsed] = useState<InputsUsed | null>(null);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("years");
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
  const [newsLoading, setNewsLoading] = useState(true);
  const [fundamentals, setFundamentals] = useState<FundamentalsResponse | null>(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(true);

  useEffect(() => {
    setLocalDecision(null);
    setLocalInputsUsed(null);
    const cached = getCachedFundamentals(symbol);
    setFundamentals(cached);
    setFundamentalsLoading(!cached);
    const hydrated = hydrateSentimentWire(symbol);
    if (hydrated) {
      setNews(hydrated.articles);
      setSentiment(hydrated.sentiment);
      setNewsLoading(false);
    } else {
      setNewsLoading(true);
    }
  }, [symbol]);

  const loadFundamentals = useCallback(async (refresh = false) => {
    if (!refresh) {
      const cached = getCachedFundamentals(symbol);
      if (cached) {
        setFundamentals(cached);
        setFundamentalsLoading(false);
        return;
      }
    }
    setFundamentalsLoading(true);
    try {
      setFundamentals(await fetchFundamentals(symbol, refresh));
    } catch {
      setFundamentals(getCachedFundamentals(symbol));
    } finally {
      setFundamentalsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (settings?.activeProviders?.length) {
      setActiveProviders(settings.activeProviders);
    } else {
      setActiveProviders([DEFAULT_LOCAL_PROVIDER_ID]);
    }
    if (settings?.horizon) {
      setHorizon(settings.horizon);
    }
  }, [settings?.activeProviders, settings?.horizon]);

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
      const encoded = encodeURIComponent(symbol);
      const pr = await fetch(`${base}/prices?symbol=${encoded}&period=${period}`);
      const pj = await pr.json();
      setCandles(pj.candles ?? []);
      const ir = await fetch(`${base}/indicators?symbol=${encoded}&period=${period}`);
      const ij = await ir.json();
      setSeries(ij.series ?? []);
    } catch {
      setChartError("Market data service is unavailable.");
    }
  }, [period, symbol]);

  const loadNewsWire = useCallback(async (refresh = false) => {
    if (!refresh) {
      const hydrated = hydrateSentimentWire(symbol);
      if (hydrated) {
        setNews(hydrated.articles);
        setSentiment(hydrated.sentiment);
        setNewsLoading(false);
        return;
      }
    }
    if (refresh) setNewsRefreshing(true);
    else setNewsLoading(true);
    try {
      const { articles, sentiment: wireSentiment } = applySentimentWire(
        await fetchSentimentWire(symbol, refresh),
      );
      setNews(articles);
      setSentiment(wireSentiment);
    } finally {
      setNewsLoading(false);
      setNewsRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    void loadChart();
    void loadNewsWire(false);
    void loadFundamentals(false);
  }, [loadChart, loadFundamentals, loadNewsWire]);

  const remoteDecision = (decisions?.[symbol] ?? null) as DecisionShape | null;
  const decision = localDecision ?? remoteDecision;
  const decisionInputsUsed = localInputsUsed ?? inputsFromSnapshot(decision);

  const runCouncil = async () => {
    setLoading(true);
    try {
      setChartError(null);
      const providers = activeProviders.length > 0 ? activeProviders : [DEFAULT_LOCAL_PROVIDER_ID];
      const r = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          persist: true,
          userId: uid ?? undefined,
          activeProviders: providers,
          userHorizon: horizon,
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
  const setHorizonMut = useMutation(api.settings.setHorizon);

  const setActiveProvidersAndSave = (next: string[]) => {
    setActiveProviders(next);
    if (uid) void setProvidersMut({ userId: uid, activeProviders: next });
  };

  const setHorizonAndSave = (next: Horizon) => {
    setHorizon(next);
    if (uid) void setHorizonMut({ userId: uid, horizon: next });
  };

  const watchlistSheet = (
    <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen} title="Watchlist">
      <WatchlistTable
        items={wl ?? []}
        decisions={decisions ?? {}}
        symbol={symbol}
        onSelect={(next) => {
          setWatchlistOpen(false);
          router.push(`/ticker/${encodeURIComponent(next)}`);
        }}
        onToggleFavorite={(sym) => {
          if (uid) void fav({ userId: uid, symbol: sym });
        }}
      />
    </Sheet>
  );

  return (
    <TickerDetailLayout
      symbol={symbol}
      period={period}
      onPeriodChange={setPeriod}
      activeProviders={activeProviders}
      onProvidersChange={setActiveProvidersAndSave}
      defaultProviderIds={settings?.activeProviders ?? []}
      horizon={horizon}
      onHorizonChange={setHorizonAndSave}
      onSymbolChange={(next) => router.push(`/ticker/${encodeURIComponent(next)}`)}
      tickerOptions={[
        ...((wl ?? []) as Array<{ symbol: string }>).map((w) => ({ symbol: w.symbol })),
        ...tickerOptions,
      ]}
      watchlistCount={wl?.length ?? 0}
      onOpenWatchlist={() => setWatchlistOpen(true)}
      onRefresh={() => {
        void loadChart();
        void loadNewsWire(true);
        void loadFundamentals(true);
      }}
      onRunCouncil={() => void runCouncil()}
      onDeepSentiment={() => void deepSentiment()}
      loading={loading}
      chartError={chartError}
      candles={candles}
      series={series}
      active={active}
      indicators={indicators}
      onIndicatorsChange={(next) => {
        if (uid) void setIndicatorsMut({ userId: uid, indicators: next });
      }}
      decision={decision}
      inputsUsed={decisionInputsUsed}
      sentiment={sentiment}
      news={news}
      onRefreshNews={() => void loadNewsWire(true)}
      newsLoading={newsLoading}
      newsRefreshing={newsRefreshing}
      fundamentals={fundamentals}
      fundamentalsLoading={fundamentalsLoading}
      onRefreshFundamentals={() => void loadFundamentals(true)}
      watchlistSheet={watchlistSheet}
    />
  );
}

function TickerDetailLayout({
  symbol,
  period,
  onPeriodChange,
  activeProviders,
  onProvidersChange,
  defaultProviderIds,
  horizon,
  onHorizonChange,
  onSymbolChange,
  tickerOptions,
  watchlistCount,
  onOpenWatchlist,
  onRefresh,
  onRunCouncil,
  onDeepSentiment,
  loading,
  chartError,
  candles,
  series,
  active,
  indicators,
  onIndicatorsChange,
  disableIndicatorToggle,
  decision,
  inputsUsed,
  sentiment,
  news,
  onRefreshNews,
  newsLoading = false,
  newsRefreshing = false,
  fundamentals,
  fundamentalsLoading = false,
  onRefreshFundamentals,
  watchlistSheet,
}: {
  symbol: string;
  period: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  activeProviders: string[];
  onProvidersChange: (ids: string[]) => void;
  defaultProviderIds?: string[];
  horizon: Horizon;
  onHorizonChange: (horizon: Horizon) => void;
  onSymbolChange: (symbol: string) => void;
  tickerOptions: Array<{ symbol: string; name?: string }>;
  watchlistCount: number;
  onOpenWatchlist: () => void;
  onRefresh: () => void;
  onRunCouncil: () => void;
  onDeepSentiment: () => void;
  loading: boolean;
  chartError: string | null;
  candles: Candle[];
  series: IndSeries[];
  active: Set<string>;
  indicators: string[];
  onIndicatorsChange: (next: string[]) => void;
  disableIndicatorToggle?: boolean;
  decision: DecisionShape | null;
  inputsUsed: InputsUsed | null;
  sentiment: {
    finbert: { score: number; n_articles: number };
    consensus: number;
    llmBlended?: boolean;
  } | null;
  news: Array<{ title: string; url: string; source: string; finbertScore: number }>;
  onRefreshNews?: () => void;
  newsLoading?: boolean;
  newsRefreshing?: boolean;
  fundamentals?: FundamentalsResponse | null;
  fundamentalsLoading?: boolean;
  onRefreshFundamentals?: () => void;
  watchlistSheet: ReactNode;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-8">
          <div className="rounded-bento border border-zinc-200/70 bg-surface p-6 shadow-diffuse dark:border-zinc-800/80 md:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <TickerCombobox
                value={symbol}
                onChange={onSymbolChange}
                options={tickerOptions}
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
                      onClick={() => onPeriodChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <HorizonPicker value={horizon} onChange={onHorizonChange} />
              <CouncilModelPicker
                selected={activeProviders}
                onChange={onProvidersChange}
                defaultIds={defaultProviderIds ?? []}
              />
              <Button type="button" onClick={onRefresh}>
                Refresh data
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onRunCouncil}
                disabled={loading}
              >
                {loading ? "Running council…" : "Run council"}
              </Button>
              <Button type="button" variant="outline" onClick={onDeepSentiment}>
                Deep sentiment
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/watchlist">Watchlist page</Link>
              </Button>
              <Button type="button" variant="outline" onClick={onOpenWatchlist}>
                Watchlist ({watchlistCount})
              </Button>
            </div>
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
            disableToggle={disableIndicatorToggle}
            onToggleComplete={onIndicatorsChange}
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
            onRefresh={onRefreshNews}
            loading={newsLoading}
            refreshing={newsRefreshing}
          />
          <FundamentalAnalysis
            data={fundamentals ?? null}
            loading={fundamentalsLoading}
            onRefresh={onRefreshFundamentals}
          />
        </aside>
      </div>
      {watchlistSheet}
    </>
  );
}
