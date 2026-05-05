from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

try:
    import gymnasium as gym
    from gymnasium import spaces
except Exception:
    gym = None
    spaces = None


from pipeline.features import FEATURE_COLS, build_features


@dataclass
class TradingConfig:
    initial_cash: float = 100_000.0
    fee_bps: float = 5.0
    window: int = 1


class TradingEnv(gym.Env if gym else object):
    metadata = {"render_modes": []}

    def __init__(self, df: pd.DataFrame, config: TradingConfig | None = None):
        if gym is None:
            raise RuntimeError("gymnasium not installed")
        super().__init__()
        self.config = config or TradingConfig()
        self.feat = build_features(df).reset_index(drop=True)
        self.n = len(self.feat)
        if self.n < 50:
            raise ValueError("not enough rows after feature build")
        self.action_space = spaces.Discrete(3)
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(len(FEATURE_COLS) + 1,),
            dtype=np.float32,
        )
        self.reset()

    def reset(self, *, seed: int | None = None, options=None):
        super().reset(seed=seed)
        self.t = 30
        self.cash = self.config.initial_cash
        self.shares = 0.0
        self.equity_history: list[float] = [self.cash]
        self.position = 0
        return self._obs(), {}

    def _obs(self):
        row = self.feat.iloc[self.t]
        feats = np.array([float(row[c]) for c in FEATURE_COLS], dtype=np.float32)
        return np.concatenate([feats, np.array([float(self.position)], dtype=np.float32)])

    def step(self, action: int):
        price = float(self.feat.iloc[self.t]["close"])
        fee = self.config.fee_bps / 10_000.0
        if action == 1 and self.position == 0:
            qty = (self.cash * (1 - fee)) / max(price, 1e-6)
            self.shares = qty
            self.cash = 0.0
            self.position = 1
        elif action == 2 and self.position == 1:
            self.cash = self.shares * price * (1 - fee)
            self.shares = 0.0
            self.position = 0
        equity = self.cash + self.shares * price
        prev = self.equity_history[-1]
        ret = (equity - prev) / max(prev, 1e-6)
        self.equity_history.append(equity)
        rolling = self.equity_history[-30:]
        returns = np.diff(rolling) / np.array(rolling[:-1])
        sharpe_term = float(returns.mean() / (returns.std() + 1e-6)) if len(returns) > 1 else 0.0
        reward = float(ret) + 0.001 * sharpe_term
        self.t += 1
        terminated = self.t >= self.n - 1
        return self._obs(), reward, terminated, False, {"equity": equity}
