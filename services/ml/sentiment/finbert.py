from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List

_pipeline = None


@dataclass
class HeadlineScore:
    label: str
    score_pos: float
    score_neu: float
    score_neg: float
    confidence: float
    score: float


def _load():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
    except Exception:
        return None
    device_pref = os.environ.get("DEVICE", "mps")
    if device_pref == "mps" and torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"
    model_id = "ProsusAI/finbert"
    tok = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSequenceClassification.from_pretrained(model_id)
    _pipeline = pipeline(
        "text-classification",
        model=model,
        tokenizer=tok,
        device=device,
        top_k=None,
        truncation=True,
        max_length=256,
    )
    return _pipeline


def score_headlines(texts: List[str]) -> List[HeadlineScore]:
    if not texts:
        return []
    pipe = _load()
    if pipe is None:
        return [
            HeadlineScore(label="neutral", score_pos=0.33, score_neu=0.34, score_neg=0.33, confidence=0.0, score=0.0)
            for _ in texts
        ]
    raw = pipe(texts)
    out: List[HeadlineScore] = []
    for entry in raw:
        items = entry if isinstance(entry, list) else [entry]
        d = {x["label"].lower(): float(x["score"]) for x in items}
        pos = d.get("positive", 0.0)
        neu = d.get("neutral", 0.0)
        neg = d.get("negative", 0.0)
        label = max(("positive", pos), ("neutral", neu), ("negative", neg), key=lambda kv: kv[1])[0]
        confidence = max(pos, neu, neg)
        score = pos - neg
        out.append(
            HeadlineScore(
                label=label,
                score_pos=pos,
                score_neu=neu,
                score_neg=neg,
                confidence=confidence,
                score=score,
            )
        )
    return out


def aggregate(scores: List[HeadlineScore]) -> dict:
    if not scores:
        return {"score": 0.0, "pos": 0.0, "neu": 1.0, "neg": 0.0, "n_articles": 0}
    n = len(scores)
    pos = sum(s.score_pos for s in scores) / n
    neu = sum(s.score_neu for s in scores) / n
    neg = sum(s.score_neg for s in scores) / n
    score = sum(s.score for s in scores) / n
    return {
        "score": float(score),
        "pos": float(pos),
        "neu": float(neu),
        "neg": float(neg),
        "n_articles": n,
    }
