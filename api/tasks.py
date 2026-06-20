"""
api.tasks — Hàm chạy bởi RQ worker (BƯỚC 3).

`execute_run` phải là hàm cấp module (worker resolve theo dotted path
'api.tasks.execute_run') và mọi tham số/kết quả phải picklable:
  - tham số: task (str), df (DataFrame), params (dict thuần)
  - kết quả: core.ml.MLResult (chứa model sklearn + DataFrame + PNG bytes — đều picklable)

Lỗi trong runner (vd bug NB binned → ValueError) sẽ KHÔNG bị nuốt: RQ đánh dấu job
'failed' và lưu traceback vào exc_info; API trả status=failed + error.
"""
from __future__ import annotations

import pandas as pd

from core import ml


def execute_run(task: str, df: pd.DataFrame, params: dict):
    if task == "classification":
        return ml.run_classification(
            params["method"], df, params["target"], params["features"],
            params["test_size"], params["balance"],
            split_seed=params["split_seed"], oversample_order=params["oversample_order"],
            hyperparams=params.get("hyperparams"),
            sheet_name=params.get("sheet_name", ""), label_encoder=params.get("label_encoder"))
    if task == "regression":
        return ml.run_regression(
            params["method"], df, params["target"], params["features"],
            params["test_size"], split_seed=params["split_seed"],
            sheet_name=params.get("sheet_name", ""))
    if task == "clustering":
        return ml.run_clustering(
            params["method"], df, params["features"], params["n_clusters"],
            sheet_name=params.get("sheet_name", ""))
    if task == "association":
        return ml.run_association(
            df, params["min_support"], params["min_confidence"], params["min_lift"],
            sheet_name=params.get("sheet_name", ""))
    raise ValueError(f"task không hợp lệ: {task}")
