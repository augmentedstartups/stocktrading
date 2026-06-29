from __future__ import annotations

import time
from fastapi import APIRouter, Query

from cache_store import read_json_cache, write_json_cache
from data_sources.news import gather_news
from sentiment.finbert import aggregate, score_headlines

router = APIRouter()

_sentiment_cache: dict[str, tuple[dict, float]] = {}
_TTL = 2 * 3600


def _src_str(v: object) -> str:
    if isinstance(v, dict):
        return str(v.get("name") or "?")
    return str(v)


@router.get("")
async def get_sentiment(
    symbol: str = Query(...),
    name: str | None = None,
    limit: int = 25,
    refresh: bool = False,
):
    now = time.time()
    cache_key = symbol.upper()
    if not refresh:
        disk = read_json_cache("sentiment", cache_key, _TTL)
        if disk is not None:
            _sentiment_cache[cache_key] = (disk, now)
            return disk
    if not refresh and cache_key in _sentiment_cache:
        cached_data, timestamp = _sentiment_cache[cache_key]
        if now - timestamp < _TTL:
            return cached_data

    articles = await gather_news(symbol, name_hint=name, limit_each=10)
    articles = articles[:limit]
    scores = score_headlines([a.title + (". " + a.summary if a.summary else "") for a in articles])
    out_articles = []
    for a, s in zip(articles, scores):
        out_articles.append(
            {
                "title": a.title,
                "url": a.url,
                "source": _src_str(a.source),
                "publishedAt": a.published_at,
                "summary": a.summary,
                "finbertScore": s.score,
                "finbertLabel": s.label,
                "finbertConfidence": s.confidence,
            }
        )
    agg = aggregate(scores)
    sources = sorted({str(a["source"]) for a in out_articles})
    res = {
        "symbol": symbol,
        "articles": out_articles,
        "aggregate": agg,
        "sources": sources,
    }
    _sentiment_cache[cache_key] = (res, now)
    write_json_cache("sentiment", cache_key, res)
    return res
