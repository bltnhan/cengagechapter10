"""api.schemas — pydantic request models cho các endpoint."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class PrepRequest(BaseModel):
    op: Literal["missing", "duplicates", "outliers", "remove_outliers", "encode"]
    # chỉ dùng cho op == "encode":
    encode_type: Literal["ordinal", "nominal"] = "ordinal"
    ordinal_orders: Optional[dict] = None


class RunRequest(BaseModel):
    task: Literal["classification", "regression", "clustering", "association"]
    method: Optional[str] = None                 # tên thuật toán (clf/reg/clustering)
    target: Optional[str] = None                 # clf/reg
    features: Optional[list[str]] = None         # clf/reg/clustering
    test_size: float = 0.3
    split_seed: int = 42
    # classification:
    balance: str = "None"
    oversample_order: Literal["split_first", "oversample_first"] = "split_first"
    hyperparams: Optional[dict] = None
    # clustering:
    n_clusters: int = 3
    # association:
    min_support: float = 0.05
    min_confidence: float = 0.3
    min_lift: float = 1.0


class AskRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    gemini_key: Optional[str] = None
    openrouter_key: Optional[str] = None


class ReloadRequest(BaseModel):
    header_row: int = 0
    sheet_name: Optional[str] = None
