"""
core.prep — Phát hiện & xử lý vấn đề dữ liệu (thuần Python, không Streamlit).

Tách từ Streamlit.py:
  detect_problems / fix_missing / fix_duplicates / fix_outliers /
  remove_outliers / fix_encode / suggest_target

Khác biệt so với bản gốc:
  - Bỏ decorator `@st.cache_data` (caching sẽ do tầng ngoài lo — vd Redis trong
    kiến trúc FastAPI + worker). Logic tính toán GIỮ NGUYÊN.
  - Nhận/trả `pd.DataFrame` trực tiếp thay vì chuỗi JSON (df_json). Nếu cần dùng
    với chuỗi JSON, dùng core.dataio.json_to_df / df_to_json để bọc.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder


def detect_problems(df: pd.DataFrame) -> list:
    """Trả về danh sách các vấn đề dữ liệu (missing/outlier/encoding/duplicate/scale)."""
    n = len(df)
    problems = []
    for col in df.columns:
        pct = df[col].isnull().mean()
        if pct > 0:
            dtype = "numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical"
            problems.append({"col": col, "type": "missing", "sev": "err" if pct > .3 else "warn",
                             "msg": f'Column "{col}" — {pct:.1%} missing ({int(pct * n)} rows)',
                             "fix": f"Fill with {'mean' if dtype == 'numeric' else 'mode'}", "dtype": dtype})
    for col in df.select_dtypes(include=[np.number]).columns:
        q1, q3 = df[col].quantile(.25), df[col].quantile(.75)
        iqr = q3 - q1
        if iqr > 0:
            n_out = ((df[col] < q1 - 3 * iqr) | (df[col] > q3 + 3 * iqr)).sum()
            if n_out > 0:
                problems.append({"col": col, "type": "outlier", "sev": "warn",
                                 "msg": f'Column "{col}" — {n_out} extreme outliers ({n_out / n:.1%})',
                                 "fix": "Cap to 3×IQR (Winsorize)", "dtype": "numeric"})
    for col in df.select_dtypes(include=["object", "string"]).columns:
        problems.append({"col": col, "type": "encoding", "sev": "info",
                         "msg": f'Column "{col}" is text — needs encoding for ML', "fix": "Label Encoding", "dtype": "cat"})
    dups = df.duplicated().sum()
    if dups > 0:
        problems.append({"col": "ALL", "type": "duplicate", "sev": "warn",
                         "msg": f"{dups} duplicate rows ({dups / n:.1%})", "fix": "Remove duplicates", "dtype": "row"})
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols) > 1:
        rng = df[num_cols].max() - df[num_cols].min()
        if rng.max() > 0 and (rng.max() / (rng.min() + 1e-9)) > 100:
            problems.append({"col": "NUMERIC", "type": "scale", "sev": "info",
                             "msg": "Numeric columns have very different scales — scaling recommended",
                             "fix": "StandardScaler (auto-applied at training)", "dtype": "numeric"})
    if not problems:
        problems.append({"col": "", "type": "ok", "sev": "ok",
                         "msg": "No major data problems detected — dataset looks clean!", "fix": "", "dtype": ""})
    return problems


def fix_missing(df: pd.DataFrame):
    """Điền missing: numeric→mean, categorical→mode. Trả về (df_mới, message)."""
    df = df.copy()
    before = df.isnull().sum().sum()
    for col in df.columns:
        if df[col].isnull().any():
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].mean())
            else:
                m = df[col].mode()
                df[col] = df[col].fillna(m[0] if len(m) else "Unknown")
    return df, f"Fixed {before - df.isnull().sum().sum()} missing values."


def fix_duplicates(df: pd.DataFrame):
    """Xóa dòng trùng lặp. Trả về (df_mới, message)."""
    before = len(df)
    df = df.drop_duplicates()
    return df, f"Removed {before - len(df)} duplicates. {len(df):,} rows remain."


def fix_outliers(df: pd.DataFrame):
    """Cap outlier: giới hạn giá trị tại ngưỡng 3×IQR, không xóa dòng."""
    df = df.copy()
    capped = 0
    for col in df.select_dtypes(include=[np.number]).columns:
        q1, q3 = df[col].quantile(.25), df[col].quantile(.75)
        iqr = q3 - q1
        if iqr > 0:
            lo, hi = q1 - 3 * iqr, q3 + 3 * iqr
            capped += ((df[col] < lo) | (df[col] > hi)).sum()
            df[col] = df[col].clip(lower=lo, upper=hi)
    return df, f"Capped {capped} extreme outlier values (3×IQR) — dòng vẫn được giữ lại, chỉ đổi giá trị."


def remove_outliers(df: pd.DataFrame):
    """Clean outlier: xóa hẳn các dòng có ít nhất 1 cột vượt ngưỡng 3×IQR."""
    df = df.copy()
    before = len(df)
    mask = pd.Series([True] * before, index=df.index)
    for col in df.select_dtypes(include=[np.number]).columns:
        q1, q3 = df[col].quantile(.25), df[col].quantile(.75)
        iqr = q3 - q1
        if iqr > 0:
            lo, hi = q1 - 3 * iqr, q3 + 3 * iqr
            mask = mask & (df[col] >= lo) & (df[col] <= hi)
    df = df[mask].reset_index(drop=True)
    removed = before - len(df)
    return df, f"Đã xóa {removed} dòng chứa outlier ({removed / before:.1%}). Còn lại {len(df):,} dòng."


def fix_encode(df: pd.DataFrame, encode_type: str = "ordinal", ordinal_orders: Optional[dict] = None):
    """
    encode_type: 'ordinal' = Label Encoding (0,1,2...)
                 'nominal' = One-Hot Encoding (tạo cột dummy)
    ordinal_orders: dict {col: [val1, val2, ...]} để encode theo thứ tự tùy chỉnh

    Trả về (df_mới, message, mapping).
    """
    df = df.copy()
    text_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()
    if not text_cols:
        return df, "No text columns to encode.", {}
    mapping = {}

    if encode_type == "nominal":
        # One-Hot Encoding — tạo cột dummy, bỏ cột gốc
        df = pd.get_dummies(df, columns=text_cols, drop_first=False, dtype=int)
        new_cols = [c for c in df.columns if any(c.startswith(t + "_") for t in text_cols)]
        mapping = {col: {"type": "one-hot", "new_cols": [c for c in new_cols if c.startswith(col + "_")]} for col in text_cols}
        msg = f"One-Hot Encoded {len(text_cols)} col(s) → {len(new_cols)} new columns: {', '.join(text_cols)}."
    else:
        # Label / Ordinal Encoding
        le = LabelEncoder()
        for col in text_cols:
            if ordinal_orders and col in ordinal_orders:
                # Thứ tự tùy chỉnh
                order = ordinal_orders[col]
                order_map = {str(v): i for i, v in enumerate(order)}
                df[col] = df[col].astype(str).map(order_map).fillna(-1).astype(int)
                mapping[col] = {str(v): i for i, v in enumerate(order)}
            else:
                le.fit(df[col].astype(str))
                mapping[col] = {str(c): int(i) for i, c in enumerate(le.classes_)}
                df[col] = le.transform(df[col].astype(str))
        msg = f"Label-encoded {len(text_cols)} column(s): {', '.join(text_cols)}."

    return df, msg, mapping


def suggest_target(df: pd.DataFrame):
    """Đoán cột target dựa trên tên cột; fallback về cột cuối nếu ít giá trị duy nhất."""
    kws = ["label", "target", "class", "churn", "default", "outcome", "result", "status",
           "output", "dependent", "response", "predict", "category", "nhãn"]
    for col in df.columns:
        if any(k in col.lower().replace(" ", "_") for k in kws):
            return col
    last = df.columns[-1]
    return last if df[last].nunique() <= 20 else None
