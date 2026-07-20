from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from rl.paths import (
    MODELS_DIR,
    DEFAULT_HORIZON,
    interval_for,
    meta_path,
    model_path,
    normalize_horizon,
    periods_for,
)

# Re-export inference helpers for backward-compatible imports.
from rl.infer import predict, rollout  # noqa: F401


def _n_envs() -> int:
    cpu = os.cpu_count() or 4
    return max(1, min(int(os.environ.get("RL_N_ENVS", "8")), cpu))


def train_ppo(symbol: str, horizon: str = DEFAULT_HORIZON, total_timesteps: int = 50_000) -> Path:
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv

    from pipeline.ingest import ensure_fresh
    from rl.env import TradingEnv

    horizon = normalize_horizon(horizon)
    train_period, _ = periods_for(horizon)
    df = ensure_fresh(symbol, period=train_period, interval=interval_for(horizon))

    def make_env():
        return TradingEnv(df)

    n_envs = _n_envs()
    try:
        venv = (
            SubprocVecEnv([make_env for _ in range(n_envs)])
            if n_envs > 1
            else DummyVecEnv([make_env])
        )
    except Exception:
        n_envs = 1
        venv = DummyVecEnv([make_env])

    device = "cuda" if os.environ.get("FORCE_CUDA") == "1" else "cpu"
    model = PPO(
        "MlpPolicy",
        venv,
        n_steps=max(512 // n_envs, 128),
        batch_size=64,
        learning_rate=3e-4,
        verbose=0,
        device=device,
    )
    model.learn(total_timesteps=total_timesteps)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    out = model_path(symbol, horizon)
    model.save(str(out))
    meta_path(symbol, horizon).write_text(
        json.dumps(
            {
                "symbol": symbol,
                "horizon": horizon,
                "trained_at": datetime.now(timezone.utc).isoformat(),
                "timesteps": total_timesteps,
                "n_envs": n_envs,
            }
        )
    )
    try:
        venv.close()
    except Exception:
        pass
    return out


def train_batch(
    symbols: list[str],
    horizons: list[str] | None = None,
    total_timesteps: int = 30_000,
) -> list[dict]:
    horizons = horizons or [DEFAULT_HORIZON]
    results: list[dict] = []
    for symbol in symbols:
        for horizon in horizons:
            h = normalize_horizon(horizon)
            try:
                path = train_ppo(symbol, horizon=h, total_timesteps=total_timesteps)
                results.append({"symbol": symbol, "horizon": h, "model_path": str(path)})
            except Exception as e:
                results.append({"symbol": symbol, "horizon": h, "error": str(e)})
    return results
