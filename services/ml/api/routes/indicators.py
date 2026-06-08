from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, Query

from pipeline.indicators import compute_all, latest_snapshot
from pipeline.ingest import apply_period, ensure_fresh

router = APIRouter()

COMPUTE_PERIOD = "10y"


def _f(v) -> float | None:
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return float(v)


@router.get("")
def get_indicators(symbol: str = Query(...), period: str = "10y"):
    try:
        df = ensure_fresh(symbol, period=COMPUTE_PERIOD)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    full = compute_all(df)
    display = apply_period(full, period)
    snap = latest_snapshot(full)
    return {
        "symbol": symbol,
        "snapshot": snap,
        "series": [
            {
                "t": int(r.date.timestamp()),
                "close": _f(r.close),
                "ma20": _f(r.ma20),
                "ema12": _f(r.ema12),
                "ma50": _f(r.ma50),
                "ma200": _f(r.ma200),
                "rsi": _f(r.rsi),
                "macd": _f(r.macd),
                "macd_signal": _f(r.macd_signal),
                "macd_hist": _f(r.macd_hist),
                "bb_upper": _f(r.bb_upper),
                "bb_middle": _f(r.bb_middle),
                "bb_lower": _f(r.bb_lower),
                "atr": _f(r.atr),
                "obv": _f(r.obv),
                "vwap": _f(r.vwap),
                "volume": _f(r.volume),
            }
            for r in display.itertuples()
        ],
    }
