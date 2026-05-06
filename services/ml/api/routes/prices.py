from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from pipeline.ingest import apply_period, ensure_fresh, fetch, save_parquet

router = APIRouter()


@router.get("")
def get_prices(symbol: str = Query(...), period: str = "10y", limit: int = 0):
    try:
        df = ensure_fresh(symbol, period=period)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    df = apply_period(df, period)
    if limit > 0:
        df = df.tail(limit)
    return {
        "symbol": symbol,
        "rows": len(df),
        "candles": [
            {
                "t": int(r.date.timestamp()),
                "o": float(r.open),
                "h": float(r.high),
                "l": float(r.low),
                "c": float(r.close),
                "v": float(r.volume),
            }
            for r in df.itertuples()
        ],
    }


@router.post("")
def refresh_prices(symbol: str = Query(...), period: str = "10y"):
    try:
        df = fetch(symbol, period=period)
        save_parquet(symbol, df)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"symbol": symbol, "rows": int(len(df))}
