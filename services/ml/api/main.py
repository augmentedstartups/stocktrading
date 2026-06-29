from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from api.routes import backtest, fundamentals, indicators, prices, rl, sentiment


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(os.environ.get("PARQUET_DIR", "./data/parquet")).mkdir(parents=True, exist_ok=True)
    Path(os.environ.get("MODELS_DIR", "./data/models")).mkdir(parents=True, exist_ok=True)
    fundamentals.warm_benchmark_cache()
    yield


app = FastAPI(title="stocktrading-ml", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prices.router, prefix="/prices", tags=["prices"])
app.include_router(indicators.router, prefix="/indicators", tags=["indicators"])
app.include_router(fundamentals.router, prefix="/fundamentals", tags=["fundamentals"])
app.include_router(sentiment.router, prefix="/sentiment", tags=["sentiment"])
app.include_router(rl.router, prefix="/rl", tags=["rl"])
app.include_router(backtest.router, prefix="/backtest", tags=["backtest"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "stocktrading-ml"}
