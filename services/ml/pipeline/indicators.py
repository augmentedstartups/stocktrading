from __future__ import annotations

import numpy as np
import pandas as pd


def sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).mean()


def ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def rsi(s: pd.Series, n: int = 14) -> pd.Series:
    delta = s.diff()
    up = delta.clip(lower=0.0)
    down = -delta.clip(upper=0.0)
    roll_up = up.ewm(alpha=1.0 / n, min_periods=n, adjust=False).mean()
    roll_down = down.ewm(alpha=1.0 / n, min_periods=n, adjust=False).mean()
    rs = roll_up / roll_down.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    return out.fillna(50.0)


def macd(s: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    macd_line = ema(s, fast) - ema(s, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def bollinger(s: pd.Series, n: int = 20, k: float = 2.0):
    mid = sma(s, n)
    std = s.rolling(n, min_periods=n).std()
    upper = mid + k * std
    lower = mid - k * std
    return upper, mid, lower


def atr(df: pd.DataFrame, n: int = 14) -> pd.Series:
    high = df["high"]
    low = df["low"]
    close = df["close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [
            high - low,
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1.0 / n, min_periods=n, adjust=False).mean()


def obv(df: pd.DataFrame) -> pd.Series:
    direction = np.sign(df["close"].diff().fillna(0.0))
    return (direction * df["volume"]).cumsum()


def vwap(df: pd.DataFrame) -> pd.Series:
    typical = (df["high"] + df["low"] + df["close"]) / 3.0
    cum_v = df["volume"].cumsum()
    cum_pv = (typical * df["volume"]).cumsum()
    return (cum_pv / cum_v).bfill()


def compute_all(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    close = out["close"]
    out["ma20"] = sma(close, 20)
    out["ma50"] = sma(close, 50)
    out["ma200"] = sma(close, 200)
    out["ema12"] = ema(close, 12)
    out["ema26"] = ema(close, 26)
    out["rsi"] = rsi(close, 14)
    m, s_, h = macd(close)
    out["macd"] = m
    out["macd_signal"] = s_
    out["macd_hist"] = h
    u, mid, lo = bollinger(close)
    out["bb_upper"] = u
    out["bb_middle"] = mid
    out["bb_lower"] = lo
    out["atr"] = atr(out)
    out["obv"] = obv(out)
    out["vwap"] = vwap(out)
    return out


def latest_snapshot(df_with_inds: pd.DataFrame) -> dict:
    last = df_with_inds.dropna(subset=["ma200"]).iloc[-1]
    return {
        "rsi": float(last["rsi"]),
        "macd": float(last["macd"]),
        "macdSignal": float(last["macd_signal"]),
        "macdHist": float(last["macd_hist"]),
        "ma20": float(last["ma20"]),
        "ma50": float(last["ma50"]),
        "ma200": float(last["ma200"]),
        "bbUpper": float(last["bb_upper"]),
        "bbMiddle": float(last["bb_middle"]),
        "bbLower": float(last["bb_lower"]),
        "atr": float(last["atr"]),
        "obv": float(last["obv"]),
        "vwap": float(last["vwap"]),
        "close": float(last["close"]),
        "date": str(pd.to_datetime(last["date"]).date()),
    }
