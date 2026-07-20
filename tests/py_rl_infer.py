from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "ml"))

import pandas as pd

from rl.infer import _heuristic, rollout
from rl.paths import interval_for, model_path, normalize_horizon


def test_horizon_mapping() -> None:
    assert normalize_horizon("DAYS") == "days"
    assert normalize_horizon("bogus") == "days"
    assert interval_for("weeks") == "1wk"
    assert interval_for("months") == "1mo"
    assert model_path("AAPL", "weeks").name == "ppo_AAPL_weeks.zip"


def test_heuristic_actions() -> None:
    buy = _heuristic(pd.Series({"rsi_n": -1.0, "macd_hist_n": 0.02, "ma_ratio_50_200": 0.05}))
    assert buy["action"] == "buy"
    assert buy["trained"] is False
    assert buy["reason"] == "heuristic_no_model"

    sell = _heuristic(pd.Series({"rsi_n": 1.0, "macd_hist_n": -0.02, "ma_ratio_50_200": -0.05}))
    assert sell["action"] == "sell"

    hold = _heuristic(pd.Series({"rsi_n": 0.0, "macd_hist_n": 0.0, "ma_ratio_50_200": 0.0}))
    assert hold["action"] == "hold"


def test_rollout_untrained() -> None:
    for horizon in ("days", "weeks", "months"):
        out = rollout("__NO_SUCH_SYMBOL__", horizon=horizon)
        assert out["trained"] is False
        assert out["horizon"] == horizon
        assert out["markers"] == []
        assert out["current"] is None


def test_train_predict_smoke() -> None:
    try:
        import stable_baselines3  # noqa: F401
    except Exception:
        print("sb3 not installed; skipping train smoke")
        return
    if os.environ.get("RL_SMOKE") != "1":
        print("RL_SMOKE!=1; skipping heavy train+predict smoke")
        return
    from rl.infer import predict
    from rl.train import train_ppo

    train_ppo("AAPL", total_timesteps=1000)
    out = predict("AAPL")
    assert out["trained"] is True
    assert out["reason"] == "ppo_model"
    assert 0.0 <= out["confidence"] <= 1.0


def main() -> None:
    test_horizon_mapping()
    test_heuristic_actions()
    test_rollout_untrained()
    test_train_predict_smoke()


if __name__ == "__main__":
    main()
