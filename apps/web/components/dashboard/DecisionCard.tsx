"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

type CouncilMode = {
  provider: string;
  model: string;
  action: Action;
  confidence: number;
  reason: string;
  reasons?: string[];
  latencyMs?: number;
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

function confidencePlain(p: number): string {
  if (p >= 0.8) return "very sure";
  if (p >= 0.6) return "pretty sure";
  if (p >= 0.4) return "kind of sure";
  if (p >= 0.2) return "not very sure";
  return "barely sure";
}

function actionPlain(a: Action): string {
  if (a === "buy") return "thumbs up — buy";
  if (a === "sell") return "thumbs down — sell";
  return "wait and watch — hold";
}

export function DecisionCard({
  symbol,
  action,
  confidence,
  reasons,
  perModel,
  inputsUsed,
}: {
  symbol: string;
  action: Action;
  confidence: number;
  reasons: string[];
  perModel?: CouncilMode[];
  inputsUsed?: InputsUsed;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const ring = Math.round(confidence * 100);
  const color =
    action === "buy"
      ? "text-emerald-700 dark:text-emerald-300"
      : action === "sell"
        ? "text-rose-700 dark:text-rose-300"
        : "text-amber-700 dark:text-amber-300";
  const rows: CouncilMode[] =
    perModel && perModel.length > 0
      ? perModel.slice(0, 8)
      : reasons.slice(0, 8).map((reason) => {
          const [provider, ...rest] = reason.split(": ");
          return {
            provider: rest.length ? provider : "council",
            model: "summary",
            action,
            confidence,
            reason: rest.length ? rest.join(": ") : reason,
            ok: true,
          };
        });

  return (
    <motion.div
      layout
      className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80"
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-steel">
            Council verdict
          </p>
          <h2 className="font-display mt-2 text-3xl tracking-tight text-ink md:text-4xl">
            {symbol}
          </h2>
        </div>
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - confidence)}`}
              strokeLinecap="round"
              className={cn(
                action === "buy" && "text-emerald-500",
                action === "sell" && "text-rose-500",
                action === "hold" && "text-amber-500",
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-display text-lg tracking-tight", color)}>
              {action.toUpperCase()}
            </span>
            <span className="number text-xs text-steel">{ring}%</span>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-5 border-t border-zinc-200/60 pt-6 dark:border-zinc-800/80">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-steel">
            Models used
          </p>
          <div className="flex flex-wrap gap-2">
            {rows.map((r, i) => (
              <span
                key={`${r.provider}-${r.model}-${i}-mode`}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide",
                  r.ok
                    ? "border-zinc-200/80 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300",
                )}
              >
                {r.provider}/{r.model}
              </span>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const isOpen = !!expanded[i];
            return (
              <li
                key={`${r.provider}-${r.model}-${i}`}
                className={cn(
                  "rounded-2xl border bg-zinc-50/60 p-4 dark:bg-zinc-950/30",
                  r.ok && r.action === "buy" && "border-emerald-200/80 dark:border-emerald-900/60",
                  r.ok && r.action === "sell" && "border-rose-200/80 dark:border-rose-900/60",
                  r.ok && r.action === "hold" && "border-amber-200/80 dark:border-amber-900/60",
                  !r.ok && "border-rose-200/80 dark:border-rose-900/60",
                )}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wide text-ink">
                      {r.provider}
                    </span>
                    <span className="number text-[11px] text-steel">{r.model}</span>
                    {r.latencyMs ? (
                      <span className="number text-[11px] text-steel/60">
                        {r.latencyMs}ms
                      </span>
                    ) : null}
                    {r.timestamp ? (
                      <span className="number text-[11px] text-steel/60">
                        • {new Date(r.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-xs uppercase tracking-wide",
                        r.ok && r.action === "buy" && "text-emerald-600 dark:text-emerald-300",
                        r.ok && r.action === "sell" && "text-rose-600 dark:text-rose-300",
                        r.ok && r.action === "hold" && "text-amber-600 dark:text-amber-300",
                        !r.ok && "text-rose-600 dark:text-rose-300",
                      )}
                    >
                      {r.ok ? r.action : "fail"}
                    </span>
                    <span className="number text-xs text-steel">
                      {r.ok ? `${Math.round(r.confidence * 100)}%` : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((s) => ({ ...s, [i]: !s[i] }))
                      }
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Hide explanation" : "Show explanation"}
                      className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200/70 text-steel transition-colors hover:bg-muted/60 dark:border-zinc-800/80"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={cn("transition-transform", isOpen && "rotate-180")}
                        aria-hidden
                      >
                        <path
                          d="M2.5 4.25L6 7.75l3.5-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {r.ok ? r.reason : r.error ?? "Model did not return a verdict."}
                </p>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="exp"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <ExplainPanel row={r} inputsUsed={inputsUsed} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}

function ExplainPanel({
  row,
  inputsUsed,
}: {
  row: CouncilMode;
  inputsUsed?: InputsUsed;
}) {
  const lookedAt: Array<{ label: string; on: boolean; what: string }> = [
    {
      label: "Charts (technical)",
      on: !!inputsUsed?.technical,
      what: "Lines on the price chart like moving averages, RSI, MACD, Bollinger bands.",
    },
    {
      label: "Company numbers (financials)",
      on: !!inputsUsed?.fundamentals,
      what: "Things the company reports like sales, profit, market value.",
    },
    {
      label: "News mood (sentiment)",
      on: !!inputsUsed?.sentiment,
      what: "How positive or negative the news headlines are right now.",
    },
    {
      label: "AI traffic-light hint",
      on: !!inputsUsed?.rl,
      what: "A small machine-learning model that learned to say buy/hold/sell from history.",
    },
  ];
  const hasEvidence =
    (inputsUsed?.evidence?.technical?.length ?? 0) > 0 ||
    (inputsUsed?.evidence?.fundamentals?.length ?? 0) > 0 ||
    Boolean(inputsUsed?.evidence?.sentiment) ||
    Boolean(inputsUsed?.evidence?.rl);

  return (
    <div className="mt-4 rounded-xl border border-zinc-200/70 bg-surface/70 p-4 dark:border-zinc-800/70">
      <p className="font-mono text-[10px] uppercase tracking-widest text-steel">
        How {row.provider} thought about it
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">
            What it looked at
          </p>
          <ul className="mt-2 space-y-1.5">
            {lookedAt.map((it) => (
              <li key={it.label} className="flex items-start gap-2 text-xs leading-relaxed">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 inline-block h-2 w-2 flex-none rounded-full",
                    it.on
                      ? "bg-emerald-500"
                      : "bg-zinc-300 dark:bg-zinc-700",
                  )}
                />
                <span>
                  <span
                    className={cn(
                      it.on
                        ? "text-ink"
                        : "text-zinc-400 line-through dark:text-zinc-600",
                    )}
                  >
                    {it.label}
                  </span>
                  <span className="ml-1 text-steel">— {it.what}</span>
                </span>
              </li>
            ))}
          </ul>
          {hasEvidence ? (
            <div className="mt-4 rounded-lg border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-zinc-800/70 dark:bg-zinc-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">
                Sources / data used
              </p>
              <EvidenceList inputsUsed={inputsUsed} />
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink">
            How it decided
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            It read all the inputs above, weighed the good news against the bad
            news, and picked{" "}
            <span className="font-semibold text-ink">{actionPlain(row.action)}</span>
            . It feels{" "}
            <span className="font-semibold text-ink">
              {confidencePlain(row.confidence)}
            </span>{" "}
            ({Math.round(row.confidence * 100)}%).
          </p>
          {row.reasons && row.reasons.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {row.reasons.map((re, idx) => (
                <li key={idx}>{re}</li>
              ))}
            </ul>
          ) : row.reason ? (
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {row.reason}
            </p>
          ) : null}
          {!row.ok && row.error ? (
            <p className="mt-3 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              Error: {row.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EvidenceList({ inputsUsed }: { inputsUsed?: InputsUsed }) {
  const evidence = inputsUsed?.evidence;
  if (!evidence) return null;
  return (
    <div className="mt-2 space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
      {evidence.technical && evidence.technical.length > 0 ? (
        <EvidenceGroup title="Technical calculations" items={evidence.technical} />
      ) : null}
      {evidence.fundamentals && evidence.fundamentals.length > 0 ? (
        <EvidenceGroup title="Company numbers" items={evidence.fundamentals} />
      ) : null}
      {evidence.sentiment ? (
        <div>
          <p className="font-medium text-ink">News sentiment</p>
          <p className="mt-1">
            {evidence.sentiment.articles ?? 0} articles scanned
            {typeof evidence.sentiment.finbertScore === "number"
              ? `, FinBERT score ${evidence.sentiment.finbertScore.toFixed(3)}`
              : ""}
            {typeof evidence.sentiment.consensus === "number"
              ? `, consensus ${evidence.sentiment.consensus.toFixed(3)}`
              : ""}
          </p>
          {evidence.sentiment.headlines && evidence.sentiment.headlines.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {evidence.sentiment.headlines.map((headline, idx) => (
                <li key={`${headline.title}-${idx}`}>
                  {headline.url ? (
                    <a
                      href={headline.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
                    >
                      {headline.title}
                    </a>
                  ) : (
                    headline.title
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {evidence.rl ? (
        <div>
          <p className="font-medium text-ink">RL policy hint</p>
          <p className="mt-1">
            {evidence.rl.action} at {Math.round(evidence.rl.confidence * 100)}%
            confidence{evidence.rl.reason ? `: ${evidence.rl.reason}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div>
      <p className="font-medium text-ink">{title}</p>
      <dl className="mt-1 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between gap-2">
            <dt className="text-steel">{item.label}</dt>
            <dd className="number text-right text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
