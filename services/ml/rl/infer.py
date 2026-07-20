from __future__ import annotations

import numpy as np
import pandas as pd

from rl.paths import interval_for, meta_path, model_path, normalize_horizon, periods_for

_MODEL_CACHE: dict[str, tuple[float, object]] = {}
_LABELS = ["hold", "buy", "sell"]


def _load_model(symbol: str, horizon: str):
    from stable_baselines3 import PPO

    p = model_path(symbol, horizon)
    key = str(p)
    mtime = p.stat().st_mtime
    cached = _MODEL_CACHE.get(key)
    if cached and cached[0] == mtime:
        return cached[1]
    model = PPO.load(str(p), device="cpu")
    _MODEL_CACHE[key] = (mtime, model)
    return model


def _action_probs(model, obs: np.ndarray) -> np.ndarray:
    import torch

    obs_t, _ = model.policy.obs_to_tensor(obs)
    with torch.no_grad():
        dist = model.policy.get_distribution(obs_t)
        probs = dist.distribution.probs.cpu().numpy().reshape(-1)
    return probs


def _trained_at(symbol: str, horizon: str) -> str | None:
    mp = meta_path(symbol, horizon)
    if not mp.exists():
        return None
    try:
        import json

        return json.loads(mp.read_text()).get("trained_at")
    except Exception:
        return None


def _heuristic(last: pd.Series) -> dict:
    rsi_n = float(last["rsi_n"])
    macd_h = float(last["macd_hist_n"])
    ma_diff = float(last["ma_ratio_50_200"])
    score = -rsi_n + 50 * macd_h + 10 * ma_diff
    if score > 0.3:
        return {"action": "buy", "confidence": min(0.6, abs(score)), "trained": False, "reason": "heuristic_no_model"}
    if score < -0.3:
        return {"action": "sell", "confidence": min(0.6, abs(score)), "trained": False, "reason": "heuristic_no_model"}
    return {"action": "hold", "confidence": 0.5, "trained": False, "reason": "heuristic_no_model"}


def predict(symbol: str, horizon: str = "days") -> dict:
    from pipeline.features import FEATURE_COLS, build_features
    from pipeline.ingest import ensure_fresh

    horizon = normalize_horizon(horizon)
    _, infer_period = periods_for(horizon)
    df = ensure_fresh(symbol, period=infer_period, interval=interval_for(horizon))
    feats = build_features(df)
    if len(feats) == 0:
        return {"action": "hold", "confidence": 0.0, "trained": False, "horizon": horizon, "reason": "no features"}
    last = feats.iloc[-1]

    if not model_path(symbol, horizon).exists():
        return {**_heuristic(last), "horizon": horizon}

    try:
        model = _load_model(symbol, horizon)
    except Exception:
        return {"action": "hold", "confidence": 0.0, "trained": False, "horizon": horizon, "reason": "sb3_not_installed"}

    obs = np.array([float(last[c]) for c in FEATURE_COLS] + [0.0], dtype=np.float32)
    probs = _action_probs(model, obs)
    action = int(probs.argmax())
    return {
        "action": _LABELS[action],
        "confidence": round(float(probs[action]), 4),
        "trained": True,
        "trained_at": _trained_at(symbol, horizon),
        "horizon": horizon,
        "reason": "ppo_model",
    }


def rollout(symbol: str, horizon: str = "days") -> dict:
    from pipeline.features import FEATURE_COLS, build_features
    from pipeline.ingest import ensure_fresh

    horizon = normalize_horizon(horizon)
    if not model_path(symbol, horizon).exists():
        return {"trained": False, "horizon": horizon, "markers": [], "current": None}

    _, infer_period = periods_for(horizon)
    df = ensure_fresh(symbol, period=infer_period, interval=interval_for(horizon))
    feats = build_features(df).reset_index(drop=True)
    if len(feats) < 2:
        return {"trained": False, "horizon": horizon, "markers": [], "current": None}

    try:
        model = _load_model(symbol, horizon)
    except Exception:
        return {"trained": False, "horizon": horizon, "markers": [], "current": None}

    markers: list[dict] = []
    position = 0
    last_label = "hold"
    last_conf = 0.0
    start = 30 if len(feats) > 30 else 0
    for i in range(start, len(feats)):
        row = feats.iloc[i]
        obs = np.array([float(row[c]) for c in FEATURE_COLS] + [float(position)], dtype=np.float32)
        probs = _action_probs(model, obs)
        action = int(probs.argmax())
        last_label, last_conf = _LABELS[action], float(probs[action])
        t = int(pd.Timestamp(row["date"]).timestamp())
        price = float(row["close"])
        if action == 1 and position == 0:
            markers.append({"t": t, "price": price, "action": "buy"})
            position = 1
        elif action == 2 and position == 1:
            markers.append({"t": t, "price": price, "action": "sell"})
            position = 0

    return {
        "trained": True,
        "horizon": horizon,
        "markers": markers,
        "current": {"action": last_label, "confidence": round(last_conf, 4)},
    }
