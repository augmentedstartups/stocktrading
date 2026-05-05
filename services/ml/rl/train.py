from __future__ import annotations

import os
from pathlib import Path

import numpy as np

MODELS_DIR = Path(os.environ.get("MODELS_DIR", "./data/models"))


def train_ppo(symbol: str, total_timesteps: int = 50_000) -> Path:
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv

    from pipeline.ingest import ensure_fresh
    from rl.env import TradingEnv

    df = ensure_fresh(symbol, period="10y")

    def make_env():
        return TradingEnv(df)

    venv = DummyVecEnv([make_env])
    device = "cuda" if os.environ.get("FORCE_CUDA") == "1" else "cpu"
    model = PPO(
        "MlpPolicy",
        venv,
        n_steps=512,
        batch_size=64,
        learning_rate=3e-4,
        verbose=0,
        device=device,
    )
    model.learn(total_timesteps=total_timesteps)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    out = MODELS_DIR / f"ppo_{symbol.replace('.', '_').replace('^', 'I_')}.zip"
    model.save(str(out))
    return out


def predict(symbol: str) -> dict:
    from pipeline.features import FEATURE_COLS, build_features
    from pipeline.ingest import ensure_fresh

    df = ensure_fresh(symbol, period="2y")
    feats = build_features(df)
    if len(feats) == 0:
        return {"action": "hold", "confidence": 0.0, "reason": "no features"}
    last = feats.iloc[-1]
    obs = np.array([float(last[c]) for c in FEATURE_COLS] + [0.0], dtype=np.float32)

    model_path = MODELS_DIR / f"ppo_{symbol.replace('.', '_').replace('^', 'I_')}.zip"
    if not model_path.exists():
        rsi_n = float(last["rsi_n"])
        macd_h = float(last["macd_hist_n"])
        ma_diff = float(last["ma_ratio_50_200"])
        score = -rsi_n + 50 * macd_h + 10 * ma_diff
        if score > 0.3:
            return {"action": "buy", "confidence": min(0.6, abs(score)), "reason": "heuristic_no_model"}
        if score < -0.3:
            return {"action": "sell", "confidence": min(0.6, abs(score)), "reason": "heuristic_no_model"}
        return {"action": "hold", "confidence": 0.5, "reason": "heuristic_no_model"}

    try:
        from stable_baselines3 import PPO
    except Exception:
        return {"action": "hold", "confidence": 0.0, "reason": "sb3_not_installed"}
    model = PPO.load(str(model_path))
    a, _ = model.predict(obs, deterministic=True)
    action = int(a)
    label = ["hold", "buy", "sell"][action]
    return {"action": label, "confidence": 0.7, "reason": "ppo_model"}
