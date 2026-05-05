from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from pipeline.indicators import compute_all, latest_snapshot
from pipeline.ingest import ensure_fresh

router = APIRouter()


@router.get("")
def get_indicators(symbol: str = Query(...)):
    try:
        df = ensure_fresh(symbol)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    full = compute_all(df)
    snap = latest_snapshot(full)
    series = full.dropna(subset=["ma200"]).tail(500)
    return {
        "symbol": symbol,
        "snapshot": snap,
        "series": [
            {
                "t": int(r.date.timestamp()),
                "close": float(r.close),
                "ma20": float(r.ma20),
                "ema12": float(r.ema12),
                "ma50": float(r.ma50),
                "ma200": float(r.ma200),
                "rsi": float(r.rsi),
                "macd": float(r.macd),
                "macd_signal": float(r.macd_signal),
                "macd_hist": float(r.macd_hist),
                "bb_upper": float(r.bb_upper),
                "bb_middle": float(r.bb_middle),
                "bb_lower": float(r.bb_lower),
                "atr": float(r.atr),
                "obv": float(r.obv),
                "vwap": float(r.vwap),
                "volume": float(r.volume),
            }
            for r in series.itertuples()
        ],
    }
