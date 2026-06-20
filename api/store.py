"""
api.store — Lưu trạng thái dataset/run (DEV, in-memory, 1 process).

⚠️ BƯỚC 3 sẽ thay thế: dataset lớn → object storage (S3/MinIO), metadata/run →
Redis/DB, để (a) scale ngang nhiều replica và (b) đẩy ML sang worker. Hiện tại đây
là store đơn giản trong RAM của 1 process — đủ để chạy/kiểm thử kiến trúc API.

Thay cho cơ chế st.session_state của Streamlit:
  - Dataset.history = undo-stack (label, DataFrame)   ~ prep_transforms
  - Dataset.enc_mapping                                ~ enc_mapping[sheet]
  - Run.trained_model / split_data / figures           ~ _trained_models/_split_data/_run_figures
"""
from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd


@dataclass
class Dataset:
    id: str
    name: str
    df: pd.DataFrame
    history: list = field(default_factory=list)       # list[(label, DataFrame)] — undo-stack
    file_cache: Optional[dict] = None                 # raw_bytes/engine/sheet_names (Excel)
    enc_mapping: dict = field(default_factory=dict)    # mapping encode gần nhất (cho label_encoder)


@dataclass
class Run:
    id: str
    dataset_id: str
    task: str
    method: Optional[str]
    result: object                                     # core.ml.MLResult (giữ cả model trong RAM)


class Store:
    def __init__(self):
        self._datasets: dict[str, Dataset] = {}
        self._runs: dict[str, Run] = {}
        self._lock = threading.Lock()

    # ── datasets ─────────────────────────────────────────────────────────────
    def add_dataset(self, name: str, df: pd.DataFrame, file_cache: Optional[dict] = None) -> Dataset:
        ds = Dataset(id=uuid.uuid4().hex[:12], name=name, df=df, file_cache=file_cache)
        with self._lock:
            self._datasets[ds.id] = ds
        return ds

    def get_dataset(self, dataset_id: str) -> Dataset:
        with self._lock:
            ds = self._datasets.get(dataset_id)
        if ds is None:
            raise KeyError(dataset_id)
        return ds

    def apply_transform(self, dataset_id: str, label: str, new_df: pd.DataFrame,
                        enc_mapping: Optional[dict] = None) -> Dataset:
        """Đẩy snapshot hiện tại vào history rồi thay df (mô phỏng undo-stack)."""
        with self._lock:
            ds = self._datasets[dataset_id]
            ds.history.append((label, ds.df))
            ds.df = new_df
            if enc_mapping is not None:
                ds.enc_mapping = enc_mapping
        return ds

    def undo(self, dataset_id: str) -> Dataset:
        with self._lock:
            ds = self._datasets[dataset_id]
            if ds.history:
                _label, prev = ds.history.pop()
                ds.df = prev
        return ds

    # ── runs ─────────────────────────────────────────────────────────────────
    def add_run(self, dataset_id: str, task: str, method: Optional[str], result) -> Run:
        run = Run(id=uuid.uuid4().hex[:12], dataset_id=dataset_id, task=task, method=method, result=result)
        with self._lock:
            self._runs[run.id] = run
        return run

    def get_run(self, run_id: str) -> Run:
        with self._lock:
            run = self._runs.get(run_id)
        if run is None:
            raise KeyError(run_id)
        return run


store = Store()
