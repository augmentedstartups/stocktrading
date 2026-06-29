from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
import yfinance as yf

router = APIRouter()


@router.get("")
def get_fundamentals(symbol: str = Query(...)):
    try:
        t = yf.Ticker(symbol)
        info = t.info or {}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    keys = [
        "shortName",
        "longName",
        "sector",
        "industry",
        "marketCap",
        "trailingPE",
        "forwardPE",
        "priceToBook",
        "priceToSalesTrailing12Months",
        "enterpriseToEbitda",
        "trailingEps",
        "forwardEps",
        "profitMargins",
        "operatingMargins",
        "returnOnEquity",
        "revenueGrowth",
        "earningsGrowth",
        "dividendYield",
        "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow",
        "beta",
        "currency",
        "country",
        "website",
    ]
    return {"symbol": symbol, "info": {k: info.get(k) for k in keys}}
