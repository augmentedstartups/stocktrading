"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DecisionCard } from "./DecisionCard";
import { NewsList } from "./NewsList";
import { SentimentMeter } from "./SentimentMeter";
import { TickerChart, type Candle, type IndSeries } from "./TickerChart";
import type { Action } from "@/lib/llm/schema";

export function TickerDetail({ symbol }: { symbol: string }) {
  const [decision, setDecision] = useState<{
    action: Action;
    confidence: number;
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
  } | null>(null);
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

  const active = useMemo(() => new Set(["MA50", "MA200", "Volume"]), []);

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" asChild>
          <Link href="/">Back</Link>
        </Button>
        <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
          {symbol}
        </h1>
        <Button type="button" onClick={() => void load()}>
          Refresh
        </Button>
        <Button type="button" variant="secondary" onClick={() => void runCouncil()} disabled={loading}>
          {loading ? "Running…" : "Run council"}
        </Button>
      </div>
      <TickerChart candles={candles} series={series} active={active} />
      {decision ? (
        <DecisionCard
          symbol={symbol}
          action={decision.action}
          confidence={decision.confidence}
          reasons={decision.reasons}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {sentiment ? (
          <SentimentMeter
            finbertScore={sentiment.finbert.score}
            consensus={sentiment.consensus}
            articles={sentiment.finbert.n_articles}
          />
        ) : null}
        <NewsList items={news} />
      </div>
    </div>
  );
}
