from __future__ import annotations

import numpy as np
import pandas as pd

from .indicators import compute_all

FEATURE_COLS = [
    "ret1",
    "ret5",
    "ret20",
    "rsi_n",
    "macd_n",
    "macd_hist_n",
    "ma_ratio_50_200",
    "bb_pos",
    "atr_n",
    "vol_z",
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    inds = compute_all(df).copy()
    close = inds["close"]
    inds["ret1"] = close.pct_change(1)
    inds["ret5"] = close.pct_change(5)
    inds["ret20"] = close.pct_change(20)
    inds["rsi_n"] = (inds["rsi"] - 50.0) / 50.0
    inds["macd_n"] = inds["macd"] / close.replace(0, np.nan)
    inds["macd_hist_n"] = inds["macd_hist"] / close.replace(0, np.nan)
    inds["ma_ratio_50_200"] = (inds["ma50"] - inds["ma200"]) / inds["ma200"].replace(0, np.nan)
    bb_range = (inds["bb_upper"] - inds["bb_lower"]).replace(0, np.nan)
    inds["bb_pos"] = (close - inds["bb_lower"]) / bb_range
    inds["atr_n"] = inds["atr"] / close.replace(0, np.nan)
    vol_mean = inds["volume"].rolling(20).mean()
    vol_std = inds["volume"].rolling(20).std().replace(0, np.nan)
    inds["vol_z"] = (inds["volume"] - vol_mean) / vol_std
    inds = inds.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURE_COLS)
    return inds
