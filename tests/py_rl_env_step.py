from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "ml"))

import numpy as np
import pandas as pd

from rl.env import TradingEnv


def main() -> None:
    rng = np.random.default_rng(0)
    n = 1200
    close = 100.0 + np.cumsum(rng.normal(0, 0.35, n))
    noise = rng.uniform(0.05, 0.25, n)
    df = pd.DataFrame(
        {
            "date": pd.date_range("2020-01-01", periods=n, freq="D"),
            "open": close - noise,
            "high": close + noise * 2,
            "low": close - noise * 2,
            "close": close,
            "volume": rng.uniform(8e5, 1.2e6, n),
        }
    )
    env = TradingEnv(df)
    env.reset(seed=0)
    assert env.position == 0
    env.step(1)
    assert env.position == 1
    env.step(2)
    assert env.position == 0


if __name__ == "__main__":
    main()
