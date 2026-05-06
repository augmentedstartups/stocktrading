"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";

type CouncilModelMeta = { id: string; provider: string; label: string };

export function SettingsPanel() {
  const hasConvex = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  if (!hasConvex) {
    return (
      <p className="text-sm text-steel">
        Add <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span> to enable synced settings.
      </p>
    );
  }
  return <SettingsInner />;
}

function SettingsInner() {
  const u = useQuery(api.users.first);
  const uid = u?._id ?? null;
  const settings = useQuery(
    api.settings.get,
    uid ? { userId: uid as Id<"users"> } : "skip",
  );
  const update = useMutation(api.settings.update);

  const [health, setHealth] = useState<string>("");
  const [models, setModels] = useState<CouncilModelMeta[]>([]);

  useEffect(() => {
    let alive = true;
    void fetch("/api/council/models")
      .then((r) => r.json())
      .then((j: { models?: CouncilModelMeta[] }) => {
        if (alive && Array.isArray(j.models)) setModels(j.models);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!uid || !settings || models.length === 0) return;
    const valid = new Set(models.map((m) => m.id));
    const stored = settings.activeProviders ?? [];
    const pruned = stored.filter((id) => valid.has(id));
    if (pruned.length !== stored.length) {
      void update({ userId: uid, activeProviders: pruned });
    }
  }, [uid, settings, models, update]);

  const providers = useMemo(
    () => [
      { name: "OpenAI", key: "server-side env" },
      { name: "Anthropic", key: "server-side env" },
      { name: "Gemini", key: "server-side env" },
      {
        name: "ML service",
        key: process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000",
      },
    ],
    [],
  );

  const pingMl = async () => {
    const base = process.env.NEXT_PUBLIC_ML_URL ?? "http://localhost:8000";
    try {
      const r = await fetch(`${base}/health`);
      const j = await r.json();
      setHealth(JSON.stringify(j));
    } catch (e) {
      setHealth(e instanceof Error ? e.message : String(e));
    }
  };

  if (!uid || !settings) {
    return (
      <p className="text-sm text-steel">
        Configure Convex and open the dashboard once to load settings.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Dial markets, refresh cadence, and verify connectivity before trusting automated councils.
        </p>
      </div>

      <section className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
        <p className="font-display text-lg text-ink">Markets</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["US", "JSE", "INDEX"] as const).map((m) => {
            const on = settings.markets.includes(m);
            return (
              <Button
                key={m}
                type="button"
                variant={on ? "default" : "outline"}
                onClick={() => {
                  const next = new Set(settings.markets);
                  if (on) next.delete(m);
                  else next.add(m);
                  void update({
                    userId: uid,
                    markets: Array.from(next),
                  });
                }}
              >
                {m}
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
        <p className="font-display text-lg text-ink">Refresh cadence</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              ["eod", "Daily EOD"],
              ["15min", "Every 15 min"],
              ["realtime", "Realtime"],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              type="button"
              variant={settings.frequency === v ? "default" : "outline"}
              onClick={() => void update({ userId: uid, frequency: v })}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
        <p className="font-display text-lg text-ink">Risk posture</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              ["conservative", "Conservative"],
              ["balanced", "Balanced"],
              ["aggressive", "Aggressive"],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              type="button"
              variant={settings.risk === v ? "default" : "outline"}
              onClick={() => void update({ userId: uid, risk: v })}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg text-ink">Council models</p>
            <p className="mt-1 max-w-[55ch] text-sm text-zinc-600 dark:text-zinc-400">
              Toggle which LLMs vote in the council. Selection is saved to Convex
              and used by every council run.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                void update({ userId: uid, activeProviders: models.map((m) => m.id) })
              }
              disabled={models.length === 0}
            >
              Enable all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void update({ userId: uid, activeProviders: [] })}
            >
              Disable all
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {models.length === 0 ? (
            <p className="text-sm text-steel">Loading model registry…</p>
          ) : null}
          {models.map((m) => {
            const on = (settings.activeProviders ?? []).includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const current = new Set(settings.activeProviders ?? []);
                  if (on) current.delete(m.id);
                  else current.add(m.id);
                  void update({ userId: uid, activeProviders: Array.from(current) });
                }}
                className={
                  "flex items-center justify-between gap-3 rounded-bento border px-4 py-3 text-left transition-colors " +
                  (on
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-zinc-200/70 hover:bg-muted/40 dark:border-zinc-800/80")
                }
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-ink">{m.label}</span>
                  <span className="font-mono text-[11px] text-steel">{m.id}</span>
                </span>
                <span
                  aria-hidden
                  className={
                    "h-3 w-3 rounded-full " +
                    (on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")
                  }
                />
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-bento border border-zinc-200/70 bg-surface p-8 shadow-diffuse dark:border-zinc-800/80">
        <p className="font-display text-lg text-ink">API connectivity</p>
        <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {providers.map((p) => (
            <li key={p.name} className="flex justify-between gap-4">
              <span>{p.name}</span>
              <span className="font-mono text-xs text-steel">{p.key}</span>
            </li>
          ))}
        </ul>
        <Button type="button" className="mt-6" variant="secondary" onClick={() => void pingMl()}>
          Ping ML /health
        </Button>
        {health ? (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs text-ink">
            {health}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
