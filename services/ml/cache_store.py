from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

CACHE_DIR = Path(__file__).resolve().parent / ".cache"


def _safe_key(key: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", key.upper())


def read_json_cache(namespace: str, key: str, ttl_seconds: float) -> dict[str, Any] | None:
    path = CACHE_DIR / namespace / f"{_safe_key(key)}.json"
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - float(payload.get("ts", 0)) > ttl_seconds:
            return None
        data = payload.get("data")
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def write_json_cache(namespace: str, key: str, data: dict[str, Any]) -> None:
    path = CACHE_DIR / namespace / f"{_safe_key(key)}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"ts": time.time(), "data": data}, ensure_ascii=False),
        encoding="utf-8",
    )
