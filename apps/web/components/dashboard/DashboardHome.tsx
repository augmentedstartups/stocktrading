"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { BootstrapClient } from "./BootstrapClient";
import { DecisionCard } from "./DecisionCard";
import { IndicatorRail } from "./IndicatorRail";
import { ModelBreakdown } from "./ModelBreakdown";
import { NewsList } from "./NewsList";
import { SentimentMeter } from "./SentimentMeter";
import { TickerChart, type Candle, type IndSeries } from "./TickerChart";
import { TickerCombobox } from "./TickerCombobox";
import { WatchlistTable } from "./WatchlistTable";
import type { Action } from "@/lib/llm/schema";

type PerModelRow = {
  provider: string;
  model: string;
  action: Action;
  confidence: number;
  reason: string;
  latencyMs: number;
  ok: boolean;
  error?: string;
};

type DecisionShape = {
  action: Action;
  confidence: number;
  reasons: string[];
  perModel: PerModelRow[];
};

const OFFLINE_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMZN", name: "Amazon.com" },
  { symbol: "NVDA", name: "NVIDIA Corp." },
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
  const [loading, setLoading] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [series, setSeries] = useState<IndSeries[]>([]);
  const [news, setNews] = useState<
    Array<{ title: string; url: string; source: string; finbertScore: number }>
  >([]);
  const [sentiment, setSentiment] = useState<{
    finbert: { score: number; n_articles: number };
    consensus: number;
  } | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [railIndicators, setRailIndicators] = useState<string[]>([
    "MA50",
    "MA200",
    "Volume",
    "RSI",
  ]);
  const active = useMemo(() => new Set(railIndicators), [railIndicators]);

  const loadChart = useCallback(async () => {
    try {
      setChartError(null);
      const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";
      const encodedSymbol = encodeURIComponent(symbol);
      const pr = await fetch(`${base}/prices?symbol=${encodedSymbol}&limit=400`);
      const pj = await pr.json();
      setCandles(pj.candles ?? []);
      const ir = await fetch(`${base}/indicators?symbol=${encodedSymbol}`);
      const ij = await ir.json();
      setSeries(ij.series ?? []);
      const sr = await fetch(`${base}/sentiment?symbol=${encodedSymbol}`);
      const sj = await sr.json();
      setNews(sj.articles ?? []);
      setSentiment({
        finbert: {
          score: sj.aggregate?.score ?? 0,
          n_articles: sj.aggregate?.n_articles ?? 0,
        },
        consensus: sj.aggregate?.score ?? 0,
      });
    } catch {
      setChartError("Market data service is unavailable.");
    }
  }, [symbol]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  const runCouncil = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, persist: false }),
      });
      const j = await r.json();
      setDecision(j.decision);
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
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <TickerCombobox
            value={symbol}
            onChange={setSymbol}
            options={OFFLINE_TICKERS}
          />
          <Button type="button" onClick={() => void loadChart()}>
            Refresh data
          </Button>
          <Button type="button" variant="secondary" onClick={() => void runCouncil()} disabled={loading}>
            {loading ? "Running council…" : "Run council"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void deepSentiment()}>
            Deep sentiment
          </Button>
        </div>
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
          />
        ) : (
          <div className="rounded-bento border border-dashed border-zinc-300/80 p-8 text-sm text-steel dark:border-zinc-700/80">
            Run the council to synthesize a Buy/Hold/Sell memo for {symbol}.
          </div>
        )}
        {decision ? <ModelBreakdown rows={decision.perModel} /> : null}
      </section>
      <aside className="flex flex-col gap-8">
        {sentiment ? (
          <SentimentMeter finbertScore={sentiment.finbert.score} consensus={sentiment.consensus} articles={sentiment.finbert.n_articles} />
        ) : null}
        <NewsList items={news} />
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
  const [loading, setLoading] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [localDecision, setLocalDecision] = useState<DecisionShape | null>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [series, setSeries] = useState<IndSeries[]>([]);
  const [news, setNews] = useState<
    Array<{ title: string; url: string; source: string; finbertScore: number }>
  >([]);
  const [sentiment, setSentiment] = useState<{
    finbert: { score: number; n_articles: number };
    consensus: number;
  } | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const indicators = (settings?.indicators ?? []) as string[];
  const active = useMemo(() => new Set<string>(indicators), [indicators]);
  const tickerOptions =
    tickers && tickers.length
      ? tickers.map((t) => ({ symbol: t.symbol, name: t.name }))
      : OFFLINE_TICKERS;

  const loadChart = useCallback(async () => {
    try {
      setChartError(null);
      const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";
      const encodedSymbol = encodeURIComponent(symbol);
      const pr = await fetch(`${base}/prices?symbol=${encodedSymbol}&limit=400`);
      const pj = await pr.json();
      setCandles(pj.candles ?? []);
      const ir = await fetch(`${base}/indicators?symbol=${encodedSymbol}`);
      const ij = await ir.json();
      setSeries(ij.series ?? []);
      const sr = await fetch(`${base}/sentiment?symbol=${encodedSymbol}`);
      const sj = await sr.json();
      setNews(sj.articles ?? []);
      setSentiment({
        finbert: {
          score: sj.aggregate?.score ?? 0,
          n_articles: sj.aggregate?.n_articles ?? 0,
        },
        consensus: sj.aggregate?.score ?? 0,
      });
    } catch {
      setChartError("Market data service is unavailable.");
    }
  }, [symbol]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  useEffect(() => {
    if (wl && wl.length && !wl.find((x: { symbol: string }) => x.symbol === symbol)) {
      setSymbol(wl[0].symbol);
    }
  }, [wl, symbol]);

  const remoteDecision = decisions?.[symbol] as DecisionShape | null | undefined;

  const decision: DecisionShape | null = localDecision ?? remoteDecision ?? null;

  const runCouncil = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          persist: true,
          userId: uid ?? undefined,
        }),
      });
      const j = await r.json();
      setLocalDecision(j.decision);
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
      });
    }
  };

  const fav = useMutation(api.watchlist.toggleFavorite);
  const setIndicatorsMut = useMutation(api.settings.setIndicators);

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-8">
          <div className="rounded-bento border border-zinc-200/70 bg-surface p-6 shadow-diffuse dark:border-zinc-800/80 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <TickerCombobox
                value={symbol}
                onChange={setSymbol}
                options={[
                  ...((wl ?? []) as Array<{ symbol: string }>).map((w) => ({ symbol: w.symbol })),
                  ...tickerOptions,
                ]}
              />
              <Button type="button" onClick={() => void loadChart()}>
                Refresh data
              </Button>
              <Button type="button" variant="secondary" onClick={() => void runCouncil()} disabled={loading}>
                {loading ? "Running council…" : "Run council"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void deepSentiment()}>
                Deep sentiment
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={`/ticker/${encodeURIComponent(symbol)}`}>Ticker detail</Link>
              </Button>
              <Button type="button" variant="outline" onClick={() => setWatchlistOpen(true)}>
                Watchlist ({wl?.length ?? 0})
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
            />
          ) : (
            <div className="rounded-bento border border-dashed border-zinc-300/80 p-8 text-sm text-steel dark:border-zinc-700/80">
              Run the council to synthesize a Buy/Hold/Sell memo for {symbol}.
            </div>
          )}
          {decision ? <ModelBreakdown rows={decision.perModel} /> : null}
        </section>

        <aside className="flex flex-col gap-8">
          {sentiment ? (
            <SentimentMeter
              finbertScore={sentiment.finbert.score}
              consensus={sentiment.consensus}
              articles={sentiment.finbert.n_articles}
            />
          ) : null}
          <NewsList items={news} />
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
