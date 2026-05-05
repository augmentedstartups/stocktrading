# Council — Stock Analysis Platform

Next.js 16 dashboard + Convex realtime state + local FastAPI ML service (indicators, hybrid sentiment, RL stub/backtest, Yahoo ingest).

## Prerequisites

- Node 20+ and `pnpm`
- Python 3.12 (`uv` recommended)
- Optional: Convex account for persistence (`npx convex dev` inside `apps/web`)

## Environment

Copy keys into:

- `apps/web/.env.local` — LLM + search keys + `NEXT_PUBLIC_ML_URL` + optional `NEXT_PUBLIC_CONVEX_URL`
- `services/ml/.env` — News/Tavily/Serp keys for ingestion

Never commit real keys.

## Run locally

Terminal 1 — ML API:

```bash
cd /Users/riteshkanjee/Documents/dev/stocktrading
pnpm dev:ml
```

Terminal 2 — Convex (optional):

```bash
cd /Users/riteshkanjee/Documents/dev/stocktrading/apps/web
pnpm convex dev
```

Add the printed `NEXT_PUBLIC_CONVEX_URL` to `apps/web/.env.local`, restart Next.

Terminal 3 — Web:

```bash
cd /Users/riteshkanjee/Documents/dev/stocktrading
pnpm dev
```

Open http://localhost:3000

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm dev:ml` | FastAPI on :8000 |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Stack smoke checks (needs ML on :8000) |
| `pnpm test:design` | Lightweight HTTP sanity |

## Stack tests

With ML running:

```bash
curl -s http://localhost:8000/health
curl -s "http://localhost:8000/indicators?symbol=AAPL" | head
```

Run council from UI button or:

```bash
curl -s -X POST http://localhost:3000/api/council \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","persist":false}'
```
