"use client";

import {
  ChartBar,
  ChartLine,
  Crosshair,
  Lightning,
  LineSegments,
  Newspaper,
  Pulse,
  Robot,
  Sparkle,
  Speedometer,
  StackSimple,
  TrendUp,
  UsersThree,
  WaveSine,
  WaveTriangle,
} from "@phosphor-icons/react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { RL_HORIZONS } from "@/lib/rlHorizons";
import { cn } from "@/lib/utils";

const DEFS: Array<{
  id: string;
  label: string;
  hint: string;
  Icon: typeof TrendUp;
  tint?: string;
  disabled?: boolean;
}> = [
  { id: "MA20", label: "MA 20", hint: "20-day moving average", Icon: TrendUp },
  { id: "MA50", label: "MA 50", hint: "50-day moving average", Icon: ChartLine },
  { id: "MA200", label: "MA 200", hint: "200-day moving average", Icon: LineSegments },
  { id: "EMA", label: "EMA", hint: "Exponential moving average emphasis", Icon: Lightning },
  { id: "Bollinger", label: "Bollinger", hint: "Bollinger envelope", Icon: WaveSine },
  { id: "VWAP", label: "VWAP", hint: "Volume-weighted average price", Icon: Crosshair },
  { id: "RSI", label: "RSI", hint: "Relative strength index pane", Icon: Speedometer },
  { id: "MACD", label: "MACD", hint: "MACD vs signal", Icon: WaveTriangle },
  { id: "ATR", label: "ATR", hint: "Average true range overlay", Icon: Pulse },
  { id: "OBV", label: "OBV", hint: "On-balance volume", Icon: StackSimple },
  { id: "Volume", label: "Volume", hint: "Volume histogram", Icon: ChartBar },
  { id: "News", label: "News", hint: "News markers on timeline", Icon: Newspaper },
  { id: "Sentiment", label: "Sentiment", hint: "Sentiment ribbon", Icon: Sparkle },
  ...RL_HORIZONS.map((h) => ({
    id: h.id,
    label: h.label,
    hint: h.hint,
    Icon: Robot,
    tint: h.color,
  })),
  { id: "Council", label: "Council", hint: "Council verdict markers", Icon: UsersThree },
];

function PulseDot({ on }: { on: boolean }) {
  const reduce = useReducedMotion();
  if (!on) return null;
  return (
    <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full bg-accent opacity-75",
          !reduce && "animate-pulse",
        )}
      />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
    </span>
  );
}

export function IndicatorRail({
  indicators,
  disableToggle,
  onToggleComplete,
}: {
  indicators: string[];
  disableToggle?: boolean;
  onToggleComplete: (next: string[]) => void | Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = useMemo(() => new Set(mounted ? indicators : []), [indicators, mounted]);

  const toggle = async (id: string) => {
    if (disableToggle) return;
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const arr = Array.from(next);
    await Promise.resolve(onToggleComplete(arr));
  };

  return (
    <div className="rounded-bento border border-zinc-200/70 bg-surface/80 p-3 shadow-diffuse dark:border-zinc-800/80">
      <div className="flex flex-wrap gap-2">
        {DEFS.map((d) => {
          const on = active.has(d.id);
          const disabled = d.disabled || disableToggle;
          return (
            <Tooltip key={d.id} label={`${d.label}: ${d.hint}`}>
              <button
                type="button"
                disabled={disabled}
                aria-label={d.label}
                aria-pressed={on}
                data-testid={`indicator-rail-${d.id}`}
                onClick={() => void toggle(d.id)}
                style={on && d.tint ? { borderColor: d.tint, color: d.tint } : undefined}
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-zinc-600 transition-colors active:scale-[0.96] active:translate-y-px",
                  on && !d.tint
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:bg-emerald-950/30 dark:text-emerald-200"
                    : on && d.tint
                      ? "bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:bg-zinc-900/50"
                      : "border-zinc-200/70 bg-white/50 dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:text-zinc-300",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <d.Icon size={22} weight="regular" />
                <PulseDot on={on} />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
