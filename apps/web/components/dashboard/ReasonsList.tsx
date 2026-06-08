"use client";

import { cn } from "@/lib/utils";
import type { Action } from "@/lib/llm/schema";

type PerModelReason = {
  provider: string;
  model: string;
  action: Action;
  reason?: string;
  reasons?: string[];
  ok: boolean;
};

function pillTone(provider: string, action: Action) {
  const byProvider: Record<string, string> = {
    anthropic:
      "border-violet-500/35 bg-violet-500/10 text-violet-800 dark:text-violet-200",
    google: "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200",
    local: "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    moonshot: "border-cyan-500/35 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
    zai: "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    minimax:
      "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200",
  };
  const base =
    byProvider[provider] ??
    "border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300";
  if (action === "buy") return cn(base, "ring-1 ring-emerald-500/25");
  if (action === "sell") return cn(base, "ring-1 ring-rose-500/25");
  return cn(base, "ring-1 ring-amber-500/20");
}

function rowsFromPerModel(perModel: PerModelReason[]) {
  return perModel
    .filter((m) => m.ok && (m.reason || m.reasons?.[0]))
    .map((m) => ({
      model: m.model,
      provider: m.provider,
      action: m.action,
      text: m.reason || m.reasons?.[0] || "",
    }));
}

function rowsFromStrings(reasons: string[]) {
  return reasons.map((r) => {
    const idx = r.indexOf(": ");
    if (idx <= 0) {
      return { model: "council", provider: "council", action: "hold" as Action, text: r };
    }
    return {
      model: r.slice(0, idx),
      provider: "council",
      action: "hold" as Action,
      text: r.slice(idx + 2),
    };
  });
}

export function ReasonsList({
  perModel,
  reasons,
}: {
  perModel?: PerModelReason[];
  reasons: string[];
}) {
  const rows =
    perModel && perModel.length > 0
      ? rowsFromPerModel(perModel)
      : rowsFromStrings(reasons);

  if (rows.length === 0) {
    return <p className="text-sm text-steel">No reasons recorded.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, i) => (
        <li key={`${row.model}-${i}`} className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] leading-none tracking-wide",
              pillTone(row.provider, row.action),
            )}
          >
            {row.model}
          </span>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {row.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
