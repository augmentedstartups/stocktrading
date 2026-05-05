from __future__ import annotations

import numpy as np
import pandas as pd

from pipeline.indicators import compute_all
from pipeline.ingest import ensure_fresh


def _stats(equity: pd.Series) -> dict:
    rets = equity.pct_change().dropna()
    if len(rets) == 0:
        return {"sharpe": 0.0, "maxDrawdown": 0.0, "totalReturn": 0.0}
    sharpe = float(rets.mean() / (rets.std() + 1e-9) * np.sqrt(252))
    cummax = equity.cummax()
    dd = ((equity - cummax) / cummax).min()
    total = float(equity.iloc[-1] / equity.iloc[0] - 1.0)
    return {"sharpe": sharpe, "maxDrawdown": float(dd), "totalReturn": total}


def _equity_to_curve(equity: pd.Series, dates: pd.Series) -> list[dict]:
    return [{"t": int(pd.Timestamp(d).timestamp()), "v": float(v)} for d, v in zip(dates, equity)]


def buyhold(df: pd.DataFrame) -> dict:
    close = df["close"].reset_index(drop=True)
    eq = close / close.iloc[0] * 100_000
    stats = _stats(eq)
    return {**stats, "equityCurve": _equity_to_curve(eq, df["date"])}


def technical(df: pd.DataFrame) -> dict:
    f = compute_all(df).dropna(subset=["ma200"]).reset_index(drop=True)
    long_signal = (f["ma50"] > f["ma200"]) & (f["rsi"] < 70)
    pos = long_signal.astype(int).shift(1).fillna(0)
    rets = f["close"].pct_change().fillna(0)
    strat = pos * rets
    eq = (1 + strat).cumprod() * 100_000
    stats = _stats(eq)
    return {**stats, "equityCurve": _equity_to_curve(eq, f["date"])}


def run(symbol: str, strategy: str = "buyhold") -> dict:
    df = ensure_fresh(symbol, period="5y")
    if strategy == "buyhold":
        out = buyhold(df)
    elif strategy == "technical":
        out = technical(df)
    elif strategy == "rl":
        out = technical(df)
    else:
        raise ValueError(f"unknown strategy {strategy}")
    out["symbol"] = symbol
    out["strategy"] = strategy
    out["startDate"] = str(pd.to_datetime(df["date"].iloc[0]).date())
    out["endDate"] = str(pd.to_datetime(df["date"].iloc[-1]).date())
    return out
