"""api.serializers — biến output của core thành JSON-safe (DataFrame/numpy/PNG)."""
from __future__ import annotations

import base64
import json

import numpy as np
import pandas as pd


def _scalar(v):
    """numpy scalar → python scalar; còn lại giữ nguyên."""
    if isinstance(v, np.generic):
        return v.item()
    return v


def table_to_json(df: pd.DataFrame) -> dict:
    """DataFrame → {columns, data} (dùng to_json orient='split' để xử lý numpy/NaN)."""
    d = json.loads(df.to_json(orient="split"))
    return {"columns": d["columns"], "data": d["data"]}


def figure_to_json(fs) -> dict:
    """core.ml.FigureSpec → {label, save, png_base64}."""
    return {"label": fs.label, "save": fs.save,
            "png_base64": base64.b64encode(fs.png).decode("ascii")}


def mlresult_to_json(result, run_id: str) -> dict:
    """core.ml.MLResult → dict JSON-safe (KHÔNG kèm model object — model giữ ở store)."""
    tables = {}
    for name, val in (result.tables or {}).items():
        tables[name] = val if isinstance(val, str) else table_to_json(val)
    return {
        "run_id": run_id,
        "metrics": {k: _scalar(v) for k, v in (result.metrics or {}).items()},
        "notes": [{"level": lvl, "msg": msg} for (lvl, msg) in result.notes],
        "figures": [figure_to_json(f) for f in result.figures],
        "tables": tables,
        "has_model": result.trained_model is not None,
    }


def dataset_summary(ds, prep_module) -> dict:
    """Tóm tắt dataset cho client (shape, cột, dtype, preview, gợi ý target)."""
    df = ds.df
    return {
        "dataset_id": ds.id,
        "name": ds.name,
        "shape": list(df.shape),
        "columns": [str(c) for c in df.columns],
        "dtypes": {str(c): str(df[c].dtype) for c in df.columns},
        "sheet_names": (ds.file_cache or {}).get("sheet_names", []),
        "suggested_target": prep_module.suggest_target(df),
        "history_len": len(ds.history),
        "preview": table_to_json(df.head(20)),
    }
