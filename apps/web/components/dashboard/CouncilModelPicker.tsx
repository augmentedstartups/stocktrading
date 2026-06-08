"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { migrateActiveProviders } from "@/lib/llm/activeProviders";
import { cn } from "@/lib/utils";

type CouncilModelMeta = { id: string; provider: string; label: string };

export function CouncilModelPicker({
  selected,
  onChange,
  defaultIds,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  defaultIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<CouncilModelMeta[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void fetch("/api/council/models")
      .then((r) => r.json())
      .then((j: { models?: CouncilModelMeta[] }) => {
        if (alive && Array.isArray(j.models)) {
          setModels(j.models);
          if (defaultIds && defaultIds.length > 0 && selected.length === 0) {
            const pruned = migrateActiveProviders(defaultIds, j.models.map((m) => m.id));
            if (pruned.length > 0) onChange(pruned);
          }
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [defaultIds, selected.length]);

  useEffect(() => {
    if (models.length === 0) return;
    const valid = models.map((m) => m.id);
    const pruned = migrateActiveProviders(selected, valid);
    if (pruned.length !== selected.length || pruned.some((id, i) => id !== selected[i])) {
      onChange(pruned);
    }
  }, [models, selected, onChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isAll = models.length > 0 && selected.length === models.length;

  const summary = models.length === 0
    ? "…"
    : selected.length === 0
      ? "No models"
      : isAll
        ? `All models (${models.length})`
        : selected.length === 1
          ? (selected[0].split("/")[1] ?? selected[0])
          : `${selected.length} models`;

  const toggle = (id: string) => {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-steel">
        Models
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="mr-2">{summary}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn("transition-transform", open && "rotate-180")}
          aria-hidden
        >
          <path d="M2 3l3 4 3-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-bento border border-zinc-200/70 bg-surface p-3 shadow-diffuse dark:border-zinc-800/80">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-steel">
              Pick one or many
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange(models.map((m) => m.id))}
                className="rounded-chip border border-zinc-200/70 px-2 py-0.5 text-[11px] text-steel hover:bg-muted/60 dark:border-zinc-800/80"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-chip border border-zinc-200/70 px-2 py-0.5 text-[11px] text-steel hover:bg-muted/60 dark:border-zinc-800/80"
              >
                None
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(migrateActiveProviders(defaultIds ?? [], models.map((m) => m.id)));
                }}
                className="rounded-chip border border-zinc-200/70 px-2 py-0.5 text-[11px] text-steel hover:bg-muted/60 dark:border-zinc-800/80"
              >
                Reset
              </button>
            </div>
          </div>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
            {models.length === 0 ? (
              <li className="px-2 py-3 text-sm text-steel">Loading…</li>
            ) : null}
            {models.map((m) => {
              const on = selected.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-chip border px-3 py-2 text-left transition-colors",
                      on
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-zinc-200/70 hover:bg-muted/40 dark:border-zinc-800/80",
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{m.label}</span>
                      <span className="font-mono text-[10px] text-steel">{m.id}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
