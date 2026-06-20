"""
api.store — Dataset store backed by Redis (BƯỚC 5: web scale nhiều replica an toàn).

Trước đây store là dict in-memory trong 1 process → upload và run/prep PHẢI vào cùng
1 web replica. Giờ dataset được serialize (pickle) vào Redis dùng CHUNG connection với
queue (api/queue.py): bất kỳ web replica nào cũng đọc/ghi được → có thể scale ngang.

  - Dev/test (không REDIS_URL): connection là fakeredis (in-process) → vẫn chạy, vẫn
    được smoke test phủ; hành vi giống prod.
  - Production (REDIS_URL): Redis thật, chia sẻ giữa mọi web replica.

Mỗi dataset = 1 key `"<prefix>:dataset:<id>"` chứa pickle của `Dataset`
(name, df, history undo-stack, file_cache, enc_mapping). TTL tự gia hạn mỗi lần truy cập.

LƯU Ý concurrency: apply_transform/undo dùng get-modify-set KHÔNG nguyên tử. Với luồng
1 user (upload→prep→run tuần tự, chờ response từng bước) thì an toàn kể cả khi mỗi
request rơi vào replica khác nhau. Chỉ rủi ro nếu CÙNG 1 dataset bị sửa ĐỒNG THỜI từ
2 nơi — chưa bảo vệ (có thể thêm WATCH/optimistic lock sau nếu cần).
"""
from __future__ import annotations

import pickle
import uuid
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd

from .config import settings
from .queue import get_connection


@dataclass
class Dataset:
    id: str
    name: str
    df: pd.DataFrame
    history: list = field(default_factory=list)        # list[(label, DataFrame)] — undo-stack
    file_cache: Optional[dict] = None                  # raw_bytes/engine/sheet_names (Excel)
    enc_mapping: dict = field(default_factory=dict)     # mapping encode gần nhất (cho label_encoder)


class RedisStore:
    """Lưu Dataset (pickle) vào Redis — chia sẻ giữa các web replica."""

    def __init__(self, connection, ttl: int, prefix: str = "dm"):
        self._conn = connection
        self._ttl = ttl
        self._prefix = prefix

    def _key(self, dataset_id: str) -> str:
        return f"{self._prefix}:dataset:{dataset_id}"

    def _save(self, ds: Dataset) -> None:
        self._conn.set(self._key(ds.id), pickle.dumps(ds), ex=self._ttl)

    # ── datasets ─────────────────────────────────────────────────────────────
    def add_dataset(self, name: str, df: pd.DataFrame, file_cache: Optional[dict] = None) -> Dataset:
        ds = Dataset(id=uuid.uuid4().hex[:12], name=name, df=df, file_cache=file_cache)
        self._save(ds)
        return ds

    def get_dataset(self, dataset_id: str) -> Dataset:
        blob = self._conn.get(self._key(dataset_id))
        if blob is None:
            raise KeyError(dataset_id)
        # gia hạn TTL cho dataset đang được dùng
        self._conn.expire(self._key(dataset_id), self._ttl)
        return pickle.loads(blob)

    def apply_transform(self, dataset_id: str, label: str, new_df: pd.DataFrame,
                        enc_mapping: Optional[dict] = None) -> Dataset:
        """Đẩy snapshot hiện tại vào history rồi thay df. Trả về Dataset đã cập nhật."""
        ds = self.get_dataset(dataset_id)
        ds.history.append((label, ds.df))
        ds.df = new_df
        if enc_mapping is not None:
            ds.enc_mapping = enc_mapping
        self._save(ds)
        return ds

    def undo(self, dataset_id: str) -> Dataset:
        ds = self.get_dataset(dataset_id)
        if ds.history:
            _label, prev = ds.history.pop()
            ds.df = prev
        self._save(ds)
        return ds


store = RedisStore(get_connection(), ttl=settings.dataset_ttl, prefix=settings.redis_key_prefix)
