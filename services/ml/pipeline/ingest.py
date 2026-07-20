from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
import yfinance as yf

PARQUET_DIR = Path(os.environ.get("PARQUET_DIR", "./data/parquet"))


def _path(symbol: str, interval: str = "1d") -> Path:
    safe = symbol.replace("/", "_").replace("^", "I_")
    suffix = "" if interval == "1d" else f"_{interval}"
    return PARQUET_DIR / f"{safe}{suffix}.parquet"


def _staleness_days(interval: str) -> int:
    return {"1d": 2, "1wk": 8, "1mo": 35}.get(interval, 2)


def fetch(symbol: str, period: str = "10y", interval: str = "1d") -> pd.DataFrame:
    df = yf.download(
        symbol,
        period=period,
        interval=interval,
        auto_adjust=True,
        progress=False,
        threads=False,
    )
    if df is None or len(df) == 0:
        raise ValueError(f"No data returned for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    df = df.rename(columns=str.lower).reset_index()
    df["date"] = pd.to_datetime(df["date"] if "date" in df.columns else df["Date"]).dt.tz_localize(None)
    cols = ["date", "open", "high", "low", "close", "volume"]
    df = df[cols].dropna()
    return df


def save_parquet(symbol: str, df: pd.DataFrame, interval: str = "1d") -> Path:
    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    p = _path(symbol, interval)
    df.to_parquet(p, index=False)
    return p


def load_parquet(symbol: str, interval: str = "1d") -> Optional[pd.DataFrame]:
    p = _path(symbol, interval)
    if not p.exists():
        return None
    return pd.read_parquet(p)


def _period_days(period: str) -> Optional[int]:
    if not period.endswith("y"):
        return None
    try:
        return int(period[:-1]) * 365
    except ValueError:
        return None


def apply_period(df: pd.DataFrame, period: str) -> pd.DataFrame:
    period_days = _period_days(period)
    if period_days is None or len(df) == 0:
        return df
    latest = pd.to_datetime(df["date"].max())
    cutoff = latest - pd.Timedelta(days=period_days)
    return df[pd.to_datetime(df["date"]) >= cutoff]


def ensure_fresh(symbol: str, period: str = "10y", interval: str = "1d") -> pd.DataFrame:
    df = load_parquet(symbol, interval)
    needs_refresh = df is None or len(df) == 0
    if df is not None and len(df) > 0:
        latest = df["date"].max()
        if (datetime.now() - pd.to_datetime(latest)).days > _staleness_days(interval):
            needs_refresh = True
        period_days = _period_days(period)
        if period_days is not None:
            earliest = df["date"].min()
            cached_days = (pd.to_datetime(latest) - pd.to_datetime(earliest)).days
            if cached_days < period_days - 10:
                needs_refresh = True
    if needs_refresh:
        df = fetch(symbol, period=period, interval=interval)
        save_parquet(symbol, df, interval)
    return df  # type: ignore[return-value]
