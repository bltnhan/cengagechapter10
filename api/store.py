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
from typing import Callable, Optional

import pandas as pd
from redis.exceptions import WatchError

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
    """Lưu Dataset (pickle) vào Redis — chia sẻ giữa các web replica.

    Mutation (apply_transform/undo) dùng WATCH/MULTI (optimistic lock) + retry để an
    toàn khi nhiều replica sửa CÙNG dataset: hàm `compute` chạy TRÊN df mới nhất bên
    trong vùng khóa, nên không bị lost-update lẫn compute-from-stale.
    """

    def __init__(self, connection, ttl: int, prefix: str = "dm", max_history: int = 50, retries: int = 8):
        self._conn = connection
        self._ttl = ttl
        self._prefix = prefix
        self._max_history = max_history
        self._retries = retries

    def _key(self, dataset_id: str) -> str:
        return f"{self._prefix}:dataset:{dataset_id}"

    # ── datasets ─────────────────────────────────────────────────────────────
    def add_dataset(self, name: str, df: pd.DataFrame, file_cache: Optional[dict] = None) -> Dataset:
        ds = Dataset(id=uuid.uuid4().hex[:12], name=name, df=df, file_cache=file_cache)
        self._conn.set(self._key(ds.id), pickle.dumps(ds), ex=self._ttl)
        return ds

    def get_dataset(self, dataset_id: str) -> Dataset:
        blob = self._conn.get(self._key(dataset_id))
        if blob is None:
            raise KeyError(dataset_id)
        self._conn.expire(self._key(dataset_id), self._ttl)  # gia hạn TTL khi dùng
        return pickle.loads(blob)

    def _mutate(self, dataset_id: str, fn: "Callable[[Dataset], object]"):
        """get-modify-set nguyên tử qua WATCH/MULTI. fn(ds) sửa ds tại chỗ, trả aux.
        Trả về (ds_đã_cập_nhật, aux)."""
        key = self._key(dataset_id)
        with self._conn.pipeline() as pipe:
            for _ in range(self._retries):
                try:
                    pipe.watch(key)
                    blob = pipe.get(key)
                    if blob is None:
                        pipe.reset()
                        raise KeyError(dataset_id)
                    ds = pickle.loads(blob)
                    aux = fn(ds)                       # compute + mutate trên df MỚI NHẤT
                    pipe.multi()
                    pipe.set(key, pickle.dumps(ds), ex=self._ttl)
                    pipe.execute()
                    return ds, aux
                except WatchError:
                    continue                            # có replica khác vừa ghi → thử lại
        raise RuntimeError(f"store contention: không cập nhật được dataset {dataset_id}")

    def apply_transform(self, dataset_id: str, compute: "Callable[[pd.DataFrame], tuple]") -> tuple:
        """compute(df) -> (new_df, label, enc_mapping|None). Chạy trong khóa. Trả (ds, label)."""
        def fn(ds: Dataset):
            new_df, label, enc = compute(ds.df)
            # lưu cả enc_mapping cũ vào history để undo khôi phục đúng
            ds.history.append((label, ds.df, ds.enc_mapping))
            if len(ds.history) > self._max_history:
                del ds.history[:-self._max_history]
            ds.df = new_df
            if enc:                                     # chỉ ghi khi có mapping THẬT ({} không xóa mapping cũ)
                ds.enc_mapping = enc
            return label
        return self._mutate(dataset_id, fn)

    def undo(self, dataset_id: str) -> Dataset:
        def fn(ds: Dataset):
            if ds.history:
                entry = ds.history.pop()
                ds.df = entry[1]
                ds.enc_mapping = entry[2] if len(entry) > 2 else {}  # khôi phục cả enc_mapping
            return None
        ds, _ = self._mutate(dataset_id, fn)
        return ds


store = RedisStore(get_connection(), ttl=settings.dataset_ttl, prefix=settings.redis_key_prefix,
                   max_history=settings.dataset_max_history)
