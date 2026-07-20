"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { RL_HORIZONS } from "@/lib/rlHorizons";
import { cn } from "@/lib/utils";

type RlChartMarker = {
  t: number;
  action: "buy" | "sell";
  color: string;
  label: string;
};

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type IndSeries = {
  t: number;
  close: number;
  ma20?: number;
  ema12?: number;
  ma50?: number;
  ma200?: number;
  rsi?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  macd?: number;
  macd_signal?: number;
  volume?: number;
};

export function TickerChart({
  candles,
  series,
  active,
  symbol,
  className,
}: {
  candles: Candle[];
  series: IndSeries[];
  active: Set<string>;
  symbol?: string;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [rlMarkers, setRlMarkers] = useState<RlChartMarker[]>([]);

  const activeHorizons = useMemo(
    () => RL_HORIZONS.filter((h) => active.has(h.id)),
    [active],
  );
  const activeHorizonKey = activeHorizons.map((h) => h.id).join(",");

  useEffect(() => {
    if (activeHorizons.length === 0 || !symbol) {
      setRlMarkers([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      activeHorizons.map((h) =>
        fetch(`/api/rl/rollout?symbol=${encodeURIComponent(symbol)}&horizon=${h.horizon}`)
          .then((r) => r.json())
          .then((d) =>
            (Array.isArray(d?.markers) ? d.markers : []).map(
              (m: { t: number; action: "buy" | "sell" }) => ({
                t: m.t,
                action: m.action,
                color: h.color,
                label: h.label,
              }),
            ),
          )
          .catch(() => [] as RlChartMarker[]),
      ),
    ).then((groups) => {
      if (!cancelled) setRlMarkers(groups.flat());
    });
    return () => {
      cancelled = true;
    };
  }, [activeHorizonKey, symbol]);

  const palette = useMemo(() => {
    const dark = resolvedTheme === "dark";
    return {
      bg: dark ? "#131316" : "#ffffff",
      text: dark ? "#d4d4d8" : "#52525b",
      grid: dark ? "#27272a" : "#e4e4e7",
      border: dark ? "#3f3f46" : "#e4e4e7",
      up: "#10b981",
      down: "#e11d48",
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (!wrap.current || candles.length === 0) return;
    const el = wrap.current;
    const c = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor: palette.text,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: palette.border },
      timeScale: { borderColor: palette.border },
      height: 420,
    });

    const cs = c.addSeries(CandlestickSeries, {
      upColor: palette.up,
      downColor: palette.down,
      borderVisible: false,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
    });
    cs.setData(
      candles.map((x) => ({
        time: x.t as never,
        open: x.o,
        high: x.h,
        low: x.l,
        close: x.c,
      })),
    );

    const addLine = (toggle: string, key: keyof IndSeries, color: string, scale?: string) => {
      if (!active.has(toggle)) return;
      const ln = c.addSeries(LineSeries, { color, lineWidth: 2, priceScaleId: scale });
      const pts = series
        .filter((r) => typeof r[key] === "number" && Number.isFinite(r[key]))
        .map((r) => ({ time: r.t as never, value: r[key] as number }));
      ln.setData(pts);
    };

    addLine("MA20", "ma20", "#64748b");
    addLine("MA50", "ma50", "#0ea5e9");
    addLine("MA200", "ma200", "#f59e0b");

    if (active.has("EMA")) {
      addLine("EMA", "ema12", "#6366f1");
    }

    if (active.has("Bollinger")) {
      addLine("Bollinger", "bb_upper", "#94a3b8");
      addLine("Bollinger", "bb_middle", "#cbd5e1");
      addLine("Bollinger", "bb_lower", "#94a3b8");
    }

    if (active.has("Volume")) {
      const vol = c.addSeries(HistogramSeries, {
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
      });
      c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      const candleMap = new Map(candles.map((x) => [x.t, x]));
      vol.setData(
        series.map((r) => {
          const cd = candleMap.get(r.t);
          const up = cd ? cd.c >= cd.o : true;
          return {
            time: r.t as never,
            value: r.volume ?? 0,
            color: up ? "#10b98144" : "#e11d4844",
          };
        }),
      );
    }

    if (active.has("RSI")) {
      const rsiLine = c.addSeries(LineSeries, {
        color: "#a855f7",
        lineWidth: 2,
        priceScaleId: "rsi",
      });
      c.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.05, bottom: 0.55 } });
      rsiLine.setData(
        series
          .filter((r) => typeof r.rsi === "number" && Number.isFinite(r.rsi))
          .map((r) => ({ time: r.t as never, value: r.rsi as number })),
      );
    }

    if (active.has("MACD")) {
      const m = c.addSeries(LineSeries, {
        color: "#22c55e",
        lineWidth: 2,
        priceScaleId: "macd",
      });
      const s = c.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 2,
        priceScaleId: "macd",
      });
      c.priceScale("macd").applyOptions({ scaleMargins: { top: 0.55, bottom: 0.05 } });
      m.setData(
        series
          .filter((r) => typeof r.macd === "number" && Number.isFinite(r.macd))
          .map((r) => ({ time: r.t as never, value: r.macd as number })),
      );
      s.setData(
        series
          .filter((r) => typeof r.macd_signal === "number" && Number.isFinite(r.macd_signal))
          .map((r) => ({ time: r.t as never, value: r.macd_signal as number })),
      );
    }

    if (rlMarkers.length > 0) {
      const markers = rlMarkers
        .slice()
        .sort((a, b) => a.t - b.t)
        .map((m) => ({
          time: m.t as never,
          position: m.action === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
          color: m.color,
          shape: m.action === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
          text: `${m.label} ${m.action === "buy" ? "Buy" : "Sell"}`,
        }));
      createSeriesMarkers(cs, markers);
    }

    c.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      c.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      c.remove();
    };
  }, [active, candles, palette, series, rlMarkers]);

  return (
    <div
      ref={wrap}
      className={cn(
        "relative h-[420px] w-full overflow-hidden rounded-bento border border-zinc-200/60 bg-surface shadow-diffuse",
        className,
      )}
    />
  );
}
