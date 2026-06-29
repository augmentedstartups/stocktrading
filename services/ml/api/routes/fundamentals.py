from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from cache_store import read_json_cache, write_json_cache

router = APIRouter()

_response_cache: dict[str, tuple[dict, float]] = {}
_symbol_info_cache: dict[str, tuple[dict, float]] = {}
_TTL = 90 * 24 * 3600

INFO_KEYS = [
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

BENCHMARK_SYMBOLS = ["AAPL", "NVDA", "SPY"]
BENCHMARK_KEYS = [
    "shortName",
    "forwardPE",
    "priceToSalesTrailing12Months",
    "enterpriseToEbitda",
    "operatingMargins",
    "trailingEps",
]


def _pick(info: dict, keys: list[str]) -> dict:
    return {k: info.get(k) for k in keys}


def _load_info(symbol: str) -> dict:
    return yf.Ticker(symbol).info or {}


def _get_symbol_info(symbol: str, refresh: bool = False) -> dict:
    key = symbol.upper()
    now = time.time()
    if not refresh:
        disk = read_json_cache("fundamentals_info", key, _TTL)
        if disk is not None:
            _symbol_info_cache[key] = (disk, now)
            return disk
    if not refresh and key in _symbol_info_cache:
        cached, ts = _symbol_info_cache[key]
        if now - ts < _TTL:
            return cached
    info = _load_info(key)
    _symbol_info_cache[key] = (info, now)
    write_json_cache("fundamentals_info", key, info)
    return info


def _build_response(symbol: str, refresh: bool = False) -> dict:
    sym = symbol.upper()
    symbols = [sym, *BENCHMARK_SYMBOLS]
    infos: dict[str, dict] = {}

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_get_symbol_info, s, refresh): s for s in symbols}
        for future in as_completed(futures):
            sym_key = futures[future]
            try:
                infos[sym_key] = future.result()
            except Exception:
                infos[sym_key] = {}

    benchmarks: dict[str, dict] = {}
    for bench in BENCHMARK_SYMBOLS:
        bench_info = infos.get(bench, {})
        if bench_info:
            benchmarks[bench] = _pick(bench_info, BENCHMARK_KEYS)

    return {
        "symbol": sym,
        "info": _pick(infos.get(sym, {}), INFO_KEYS),
        "benchmarks": benchmarks,
    }


def warm_benchmark_cache() -> None:
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(lambda s: _get_symbol_info(s, False), BENCHMARK_SYMBOLS))


def _warm_benchmarks_async() -> None:
    threading.Thread(target=warm_benchmark_cache, daemon=True).start()


@router.get("")
def get_fundamentals(symbol: str = Query(...), refresh: bool = False):
    now = time.time()
    cache_key = symbol.upper()
    if not refresh:
        disk = read_json_cache("fundamentals", cache_key, _TTL)
        if disk is not None:
            _response_cache[cache_key] = (disk, now)
            return disk
    if not refresh and cache_key in _response_cache:
        cached_data, timestamp = _response_cache[cache_key]
        if now - timestamp < _TTL:
            return cached_data

    try:
        res = _build_response(symbol, refresh)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    _response_cache[cache_key] = (res, now)
    write_json_cache("fundamentals", cache_key, res)
    return res
