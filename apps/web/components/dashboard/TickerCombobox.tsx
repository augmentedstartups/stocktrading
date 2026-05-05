"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type TickerOption = { symbol: string; name?: string };

export function TickerCombobox({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: TickerOption[];
  className?: string;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const normalizedValue = value.toUpperCase();
  const normalizedQuery = query.trim().toUpperCase();
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return options
      .map((o) => ({ ...o, symbol: o.symbol.toUpperCase() }))
      .filter((o) => {
        if (seen.has(o.symbol)) return false;
        seen.add(o.symbol);
        return true;
      });
  }, [options]);
  const visible = useMemo(() => {
    if (!normalizedQuery) return unique;
    return unique.filter(
      (o) =>
        o.symbol.includes(normalizedQuery) ||
        o.name?.toUpperCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, unique]);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  const commit = (next: string) => {
    const symbol = next.trim().toUpperCase();
    if (symbol && symbol !== normalizedValue) onChange(symbol);
    setQuery(symbol || normalizedValue);
    setOpen(false);
  };

  return (
    <div className="relative flex min-w-[12rem] items-center">
      <input
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => commit(query || value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(query || value);
          if (e.key === "Escape") {
            setQuery(value);
            setOpen(false);
          }
        }}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-label="Ticker symbol"
        placeholder="Pick or type a ticker"
        role="combobox"
        className={cn(
          "h-11 w-full rounded-xl border border-zinc-200/80 bg-surface px-3 font-mono text-sm uppercase tracking-wide outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700/80",
          className,
        )}
      />
      {open && visible.length ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-12 z-30 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200/80 bg-surface p-1 shadow-diffuse dark:border-zinc-700/80"
        >
          {visible.map((o) => (
            <button
              key={o.symbol}
              type="button"
              role="option"
              aria-selected={o.symbol === normalizedValue}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(o.symbol)}
              className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
            >
              <span className="font-mono text-sm font-medium">{o.symbol}</span>
              {o.name ? <span className="text-xs text-steel">{o.name}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
