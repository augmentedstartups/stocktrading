from __future__ import annotations

import json

from fastapi import APIRouter, Query
from pydantic import BaseModel

from rl.infer import predict, rollout
from rl.paths import DEFAULT_HORIZON, meta_path, model_path, normalize_horizon
from rl.train import train_batch, train_ppo

router = APIRouter()


@router.get("/predict")
def predict_action(symbol: str = Query(...), horizon: str = DEFAULT_HORIZON):
    return predict(symbol, horizon=horizon)


@router.get("/rollout")
def rollout_action(symbol: str = Query(...), horizon: str = DEFAULT_HORIZON):
    return rollout(symbol, horizon=horizon)


@router.get("/status")
def status(symbol: str = Query(...), horizon: str = DEFAULT_HORIZON):
    horizon = normalize_horizon(horizon)
    p = model_path(symbol, horizon)
    if not p.exists():
        return {"symbol": symbol, "horizon": horizon, "trained": False}
    meta = {}
    mp = meta_path(symbol, horizon)
    if mp.exists():
        try:
            meta = json.loads(mp.read_text())
        except Exception:
            meta = {}
    return {"symbol": symbol, "horizon": horizon, "trained": True, **meta}


@router.post("/train")
def train(symbol: str = Query(...), horizon: str = DEFAULT_HORIZON, timesteps: int = 30_000):
    try:
        path = train_ppo(symbol, horizon=horizon, total_timesteps=timesteps)
        h = normalize_horizon(horizon)
        meta = {}
        mp = meta_path(symbol, h)
        if mp.exists():
            try:
                meta = json.loads(mp.read_text())
            except Exception:
                meta = {}
        return {"symbol": symbol, "horizon": h, "model_path": str(path), "trained": True, **meta}
    except Exception as e:
        return {"symbol": symbol, "horizon": normalize_horizon(horizon), "error": str(e)}


class TrainBatchBody(BaseModel):
    symbols: list[str]
    horizons: list[str] | None = None
    timesteps: int = 30_000


@router.post("/train_batch")
def train_batch_route(body: TrainBatchBody):
    return {"results": train_batch(body.symbols, horizons=body.horizons, total_timesteps=body.timesteps)}
