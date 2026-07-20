from __future__ import annotations

import os
from pathlib import Path

MODELS_DIR = Path(os.environ.get("MODELS_DIR", "./data/models"))

DEFAULT_HORIZON = "days"

# horizon -> yfinance bar interval
HORIZON_INTERVAL = {
    "days": "1d",
    "weeks": "1wk",
    "months": "1mo",
}

# horizon -> (training period, inference period) — long enough for the 200-bar MA
HORIZON_PERIOD = {
    "days": ("10y", "2y"),
    "weeks": ("10y", "5y"),
    "months": ("max", "max"),
}


def normalize_horizon(horizon: str | None) -> str:
    h = (horizon or DEFAULT_HORIZON).lower()
    return h if h in HORIZON_INTERVAL else DEFAULT_HORIZON


def interval_for(horizon: str) -> str:
    return HORIZON_INTERVAL[normalize_horizon(horizon)]


def periods_for(horizon: str) -> tuple[str, str]:
    return HORIZON_PERIOD[normalize_horizon(horizon)]


def model_path(symbol: str, horizon: str = DEFAULT_HORIZON) -> Path:
    safe = symbol.replace(".", "_").replace("^", "I_")
    return MODELS_DIR / f"ppo_{safe}_{normalize_horizon(horizon)}.zip"


def meta_path(symbol: str, horizon: str = DEFAULT_HORIZON) -> Path:
    return model_path(symbol, horizon).with_suffix(".json")
