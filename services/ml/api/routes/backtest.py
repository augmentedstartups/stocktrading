from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backtest.runner import run

router = APIRouter()


@router.get("")
def get_backtest(symbol: str = Query(...), strategy: str = Query("buyhold")):
    try:
        return run(symbol, strategy=strategy)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("")
def post_backtest(symbol: str = Query(...), strategy: str = Query("buyhold")):
    try:
        return run(symbol, strategy=strategy)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
