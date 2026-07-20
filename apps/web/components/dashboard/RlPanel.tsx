"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { RL_HORIZONS } from "@/lib/rlHorizons";
import { cn } from "@/lib/utils";

type HorizonState = {
  trained: boolean;
  trainedAt?: string;
  action?: string;
  confidence?: number;
};

function actionColor(action?: string) {
  if (action === "buy") return "text-emerald-600 dark:text-emerald-400";
  if (action === "sell") return "text-rose-600 dark:text-rose-400";
  return "text-amber-600 dark:text-amber-400";
}

export function RlPanel({ symbol }: { symbol: string }) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<Record<string, HorizonState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const loadHorizon = useCallback(
    async (horizon: string): Promise<HorizonState> => {
      const [statusRes, predictRes] = await Promise.all([
        fetch(`/api/rl/status?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}`)
          .then((r) => r.json())
          .catch(() => ({})),
        fetch(`/api/rl/predict?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}`)
          .then((r) => r.json())
          .catch(() => ({})),
      ]);
      return {
        trained: Boolean(statusRes?.trained),
        trainedAt: statusRes?.trained_at,
        action: predictRes?.trained ? predictRes?.action : undefined,
        confidence: predictRes?.trained ? predictRes?.confidence : undefined,
      };
    },
    [symbol],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(RL_HORIZONS.map((h) => loadHorizon(h.horizon))).then((states) => {
      if (cancelled) return;
      const next: Record<string, HorizonState> = {};
      RL_HORIZONS.forEach((h, i) => {
        next[h.horizon] = states[i];
      });
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [loadHorizon]);

  const train = async (horizon: string) => {
    setBusy(horizon);
    setErr(null);
    try {
      const r = await fetch("/api/rl/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, horizon }),
      });
      const d = await r.json();
      if (d?.error) {
        setErr(typeof d.error === "string" ? d.error : "Training failed");
      } else {
        const fresh = await loadHorizon(horizon);
        setState((prev) => ({ ...prev, [horizon]: fresh }));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Training failed");
    } finally {
      setBusy(null);
    }
  };

  const horizonTooltip: Record<string, string> = {
    days: [
      "Trained on 10 years of daily price bars.",
      "BUY % = how often this pattern historically led to a profitable trade within 1–10 trading days.",
      "When to sell: toggle 'RL · Days' on the chart — the blue arrows show the model's historical exit points. Typically holds 3–7 days.",
      "This signal is included in the LLM council when the model is trained.",
    ].join(" "),
    weeks: [
      "Trained on 10 years of weekly price bars.",
      "BUY % = how often this setup historically led to a gain over 1–6 weeks.",
      "When to sell: toggle 'RL · Weeks' on the chart — purple arrows mark historical exits. Typical hold: 2–6 weeks.",
      "This signal is included in the LLM council when the model is trained.",
    ].join(" "),
    months: [
      "Trained on the full available history of monthly price bars.",
      "BUY % = how often this setup historically resolved higher over 1–6 months.",
      "When to sell: toggle 'RL · Months' on the chart — amber arrows mark historical exits. Typical hold: 1–3 months.",
      "This signal is included in the LLM council when the model is trained.",
    ].join(" "),
  };

  return (
    <TooltipProvider>
      <div className="rounded-bento border border-zinc-200/70 bg-surface p-5 shadow-diffuse dark:border-zinc-800/80">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-steel">
              Reinforcement learning
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Runs locally — no API cost. Trained signals feed into the LLM council. Toggle chart overlays to see entry/exit markers.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {RL_HORIZONS.map((h) => {
            const st = state[h.horizon];
            const isBusy = busy === h.horizon;
            return (
              <div
                key={h.horizon}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/60 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800/60 dark:bg-zinc-950/40"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-ink">{h.label}</p>
                      <Tooltip label={horizonTooltip[h.horizon]} side="bottom">
                        <button
                          type="button"
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none text-zinc-400 ring-1 ring-zinc-300 hover:text-zinc-600 dark:ring-zinc-700 dark:hover:text-zinc-300"
                        >
                          ?
                        </button>
                      </Tooltip>
                    </div>
                    <p className="text-[11px] leading-tight text-zinc-600 dark:text-zinc-400">
                      {st?.trained
                        ? `Trained${
                            st.trainedAt && mounted
                              ? ` — ${new Date(st.trainedAt).toLocaleDateString()}`
                              : ""
                          }`
                        : "Not trained"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {st?.trained && st.action ? (
                    <Tooltip
                      label={
                        st.action === "buy"
                          ? `Model says enter now. ${Math.round((st.confidence ?? 0) * 100)}% confidence = this pattern historically resolved upward that often. Toggle the ${h.label} chart overlay to see historical exit points.`
                          : st.action === "sell"
                            ? `Model says exit or avoid. ${Math.round((st.confidence ?? 0) * 100)}% confidence = this setup historically resolved downward that often.`
                            : `Model is neutral — no strong edge detected in the current pattern.`
                      }
                      side="bottom"
                    >
                      <span
                        className={cn(
                          "cursor-help text-xs font-semibold",
                          actionColor(st.action),
                        )}
                      >
                        {st.action.toUpperCase()}
                        {typeof st.confidence === "number"
                          ? ` ${Math.round(st.confidence * 100)}%`
                          : ""}
                      </span>
                    </Tooltip>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void train(h.horizon)}
                  >
                    {isBusy ? "Training…" : st?.trained ? "Retrain" : "Train"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {err ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{err}</p> : null}
      </div>
    </TooltipProvider>
  );
}
