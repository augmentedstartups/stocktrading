from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List

import httpx


@dataclass
class Article:
    title: str
    url: str
    source: str
    published_at: int
    summary: str = ""


async def from_newsapi(query: str, limit: int = 20) -> List[Article]:
    key = os.environ.get("NEWSAPI_API_KEY")
    if not key:
        return []
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "from": since,
        "sortBy": "publishedAt",
        "language": "en",
        "pageSize": min(limit, 50),
        "apiKey": key,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            return []
        data = r.json()
    out: List[Article] = []
    for a in data.get("articles", []):
        url_ = a.get("url")
        title = a.get("title")
        if not url_ or not title:
            continue
        ts = a.get("publishedAt") or ""
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
        except Exception:
            dt = datetime.now(timezone.utc).timestamp()
        src = a.get("source")
        if isinstance(src, dict):
            src_name = str(src.get("name") or "newsapi")
        else:
            src_name = str(src or "newsapi")
        out.append(
            Article(
                title=title,
                url=url_,
                source=src_name,
                published_at=int(dt),
                summary=a.get("description") or "",
            )
        )
    return out


async def from_tavily(query: str, limit: int = 10) -> List[Article]:
    key = os.environ.get("TAVILY_API_KEY")
    if not key:
        return []
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": key,
                "query": query,
                "topic": "news",
                "max_results": limit,
                "search_depth": "basic",
                "include_answer": False,
                "days": 7,
            },
        )
        if r.status_code != 200:
            return []
        data = r.json()
    out: List[Article] = []
    for item in data.get("results", []):
        url_ = item.get("url")
        title = item.get("title")
        if not url_ or not title:
            continue
        ts = item.get("published_date") or ""
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
        except Exception:
            dt = datetime.now(timezone.utc).timestamp()
        out.append(
            Article(
                title=title,
                url=url_,
                source="tavily",
                published_at=int(dt),
                summary=item.get("content", "")[:500],
            )
        )
    return out


async def from_serpapi(query: str, limit: int = 10) -> List[Article]:
    key = os.environ.get("SERPAPI_API_KEY")
    if not key:
        return []
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            "https://serpapi.com/search.json",
            params={"engine": "google_news", "q": query, "api_key": key, "num": limit},
        )
        if r.status_code != 200:
            return []
        data = r.json()
    out: List[Article] = []
    for it in data.get("news_results", [])[:limit]:
        url_ = it.get("link")
        title = it.get("title")
        if not url_ or not title:
            continue
        ts = it.get("date_utc") or it.get("date") or ""
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
        except Exception:
            dt = datetime.now(timezone.utc).timestamp()
        src = it.get("source")
        if isinstance(src, dict):
            src_name = str(src.get("name") or "google_news")
        else:
            src_name = str(src or "google_news")
        out.append(
            Article(
                title=title,
                url=url_,
                source=src_name,
                published_at=int(dt),
                summary=it.get("snippet", ""),
            )
        )
    return out


async def gather_news(symbol: str, name_hint: str | None = None, limit_each: int = 10) -> List[Article]:
    queries = [symbol]
    if name_hint:
        queries.append(name_hint)
    bag: dict[str, Article] = {}
    for q in queries:
        for src_fn in (from_newsapi, from_tavily, from_serpapi):
            try:
                items = await src_fn(q, limit=limit_each)
            except Exception:
                items = []
            for a in items:
                bag.setdefault(a.url, a)
    return sorted(bag.values(), key=lambda a: a.published_at, reverse=True)
