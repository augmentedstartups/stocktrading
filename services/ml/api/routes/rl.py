from __future__ import annotations

from fastapi import APIRouter, Query

from rl.train import predict, train_ppo

router = APIRouter()


@router.get("/predict")
def predict_action(symbol: str = Query(...)):
    return predict(symbol)


@router.post("/train")
def train(symbol: str = Query(...), timesteps: int = 30_000):
    try:
        path = train_ppo(symbol, total_timesteps=timesteps)
        return {"symbol": symbol, "model_path": str(path)}
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}
