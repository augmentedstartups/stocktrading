"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { BootstrapClient } from "./BootstrapClient";
import { DecisionCard } from "./DecisionCard";
import { IndicatorRail } from "./IndicatorRail";
import { ModelBreakdown } from "./ModelBreakdown";
import { NewsList } from "./NewsList";
import { SentimentMeter } from "./SentimentMeter";
import { TickerChart, type Candle, type IndSeries } from "./TickerChart";
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
  const [railIndicators, setRailIndicators] = useState<string[]>([
    "MA50",
    "MA200",
    "Volume",
    "RSI",
  ]);
  const active = useMemo(() => new Set(railIndicators), [railIndicators]);

  const loadChart = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";
    const pr = await fetch(`${base}/prices?symbol=${symbol}&limit=400`);
    const pj = await pr.json();
    setCandles(pj.candles ?? []);
    const ir = await fetch(`${base}/indicators?symbol=${symbol}`);
    const ij = await ir.json();
    setSeries(ij.series ?? []);
    const sr = await fetch(`${base}/sentiment?symbol=${symbol}`);
    const sj = await sr.json();
    setNews(sj.articles ?? []);
    setSentiment({
      finbert: {
        score: sj.aggregate?.score ?? 0,
        n_articles: sj.aggregate?.n_articles ?? 0,
      },
      consensus: sj.aggregate?.score ?? 0,
    });
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
          <input
            className="h-11 rounded-xl border border-zinc-200/80 bg-surface px-3 font-mono text-sm dark:border-zinc-700/80"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            aria-label="Ticker symbol"
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
        <div className="relative rounded-bento border border-zinc-200/60 bg-surface/40 p-2 shadow-diffuse dark:border-zinc-800/70">
          <TickerChart candles={candles} series={series} active={active} />
          <IndicatorRail
            indicators={railIndicators}
            onToggleComplete={(next) => {
              setRailIndicators(next);
            }}
          />
        </div>
        {decision ? (
          <DecisionCard
            symbol={symbol}
            action={decision.action}
            confidence={decision.confidence}
            reasons={decision.reasons}
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

  const [symbol, setSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(false);
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

  const indicators = (settings?.indicators ?? []) as string[];
  const active = useMemo(() => new Set<string>(indicators), [indicators]);

  const loadChart = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";
    const pr = await fetch(`${base}/prices?symbol=${symbol}&limit=400`);
    const pj = await pr.json();
    setCandles(pj.candles ?? []);
    const ir = await fetch(`${base}/indicators?symbol=${symbol}`);
    const ij = await ir.json();
    setSeries(ij.series ?? []);
    const sr = await fetch(`${base}/sentiment?symbol=${symbol}`);
    const sj = await sr.json();
    setNews(sj.articles ?? []);
    setSentiment({
      finbert: {
        score: sj.aggregate?.score ?? 0,
        n_articles: sj.aggregate?.n_articles ?? 0,
      },
      consensus: sj.aggregate?.score ?? 0,
    });
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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="space-y-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-bento border border-zinc-200/70 bg-surface p-6 shadow-diffuse dark:border-zinc-800/80 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
          </div>
          <WatchlistTable
            items={wl ?? []}
            decisions={decisions ?? {}}
            symbol={symbol}
            onSelect={setSymbol}
            onToggleFavorite={(sym) => {
              if (uid) void fav({ userId: uid, symbol: sym });
            }}
          />
        </div>

        <div className="relative rounded-bento border border-zinc-200/60 bg-surface/40 p-2 shadow-diffuse dark:border-zinc-800/70">
          <TickerChart candles={candles} series={series} active={active} />
          <IndicatorRail
            indicators={indicators}
            disableToggle={!uid}
            onToggleComplete={(next) => {
              if (!uid) return;
              void setIndicatorsMut({ userId: uid, indicators: next });
            }}
          />
        </div>

        {decision ? (
          <DecisionCard
            symbol={symbol}
            action={decision.action}
            confidence={decision.confidence}
            reasons={decision.reasons}
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
  );
}
