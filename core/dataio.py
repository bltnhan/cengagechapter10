"""
core.dataio — Nạp / làm sạch / mã hoá dữ liệu (thuần Python, không Streamlit).

Tách từ Streamlit.py:
  _df_to_json / _json_to_df / _sanitize_df / _pick_best_sheet /
  load_sheet / load_file / df_summary / encode_df

Khác biệt so với bản gốc trong Streamlit.py:
  - `load_dataframe()` thay cho `load_file()`: nhận `bytes` + `filename` (thay vì
    đối tượng UploadedFile của Streamlit), KHÔNG ghi vào st.session_state, và
    RAISE lỗi thay vì gọi st.error. Thông tin để đổi sheet (raw_bytes/engine/...)
    được TRẢ VỀ trong `file_cache` để caller tự lưu.
"""
from __future__ import annotations

import io
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder


# ─────────────────────────────────────────────────────────────────────────────
# JSON round-trip (giữ nguyên định dạng orient="split" như bản gốc)
# ─────────────────────────────────────────────────────────────────────────────
def df_to_json(df: pd.DataFrame) -> str:
    buf = io.StringIO()
    df.to_json(buf, orient="split")
    return buf.getvalue()


def json_to_df(s: str) -> pd.DataFrame:
    return pd.read_json(io.StringIO(s), orient="split")


# ─────────────────────────────────────────────────────────────────────────────
# Sanitize: ép mọi cột về dtype "an toàn" (PyArrow-compatible)
# ─────────────────────────────────────────────────────────────────────────────
def sanitize_df(df: pd.DataFrame) -> pd.DataFrame:
    """Convert tất cả column về dtype PyArrow-compatible. Không điều kiện."""
    df = df.copy()
    df.columns = [str(c) for c in df.columns]
    for col in df.columns:
        try:
            dtype = df[col].dtype
            # Extension types → unwrap về object trước
            if pd.api.types.is_extension_array_dtype(dtype):
                df[col] = df[col].astype(object)
                dtype = df[col].dtype
            # Object → str vô điều kiện (handles str+int+float mixed)
            if dtype == object:
                df[col] = df[col].fillna("").astype(str)
                df[col] = df[col].replace("nan", "").replace("<NA>", "")
            # Non-standard float → float64
            elif pd.api.types.is_float_dtype(dtype) and dtype != np.float64:
                df[col] = df[col].astype(np.float64)
            # Non-standard int → int64
            elif pd.api.types.is_integer_dtype(dtype) and dtype != np.int64:
                df[col] = df[col].astype(np.int64)
        except Exception:
            try:
                df[col] = df[col].fillna("").astype(str)
            except Exception:
                df[col] = ""
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Excel sheet selection + loading
# ─────────────────────────────────────────────────────────────────────────────
def pick_best_sheet(sheet_names):
    """Chọn sheet tốt nhất: ưu tiên 'Data', bỏ qua 'Description'."""
    skip = {"description", "instructions", "notes", "readme", "info", "about", "legend"}
    preferred = {"data", "sheet1", "serving data", "dataset", "raw data", "input", "main", "records"}
    for s in sheet_names:
        if s.lower() in preferred:
            return s
    for s in sheet_names:
        if s.lower() not in skip:
            return s
    return sheet_names[0]


def load_sheet(raw_bytes: bytes, sheet_name: str, engine_xl: str, header_row: int = 0) -> pd.DataFrame:
    """Đọc 1 sheet cụ thể từ bytes, trả về DataFrame đã sanitize."""
    df = pd.read_excel(io.BytesIO(raw_bytes), sheet_name=sheet_name,
                       header=header_row, engine=engine_xl)
    return sanitize_df(df)


@dataclass
class LoadResult:
    """Kết quả nạp 1 file. `file_cache` chỉ có với Excel (để đổi sheet sau)."""
    key: str                                  # khóa hiển thị: "file.csv" hoặc "file.xlsx::Sheet1"
    df: pd.DataFrame
    sheet_names: list = field(default_factory=list)   # danh sách sheet (Excel only)
    file_cache: Optional[dict] = None         # {raw_bytes, engine, sheet_names, current_sheet}


def load_dataframe(file_bytes: bytes, filename: str,
                   header_row: int = 0, sheet_name: Optional[str] = None) -> LoadResult:
    """
    Phiên bản thuần của `load_file()` trong Streamlit.py.

    Args:
        file_bytes : nội dung file (bytes) — thay cho UploadedFile.
        filename   : tên file (để suy ra định dạng + engine).
        header_row : dòng header (0-based).
        sheet_name : tên sheet Excel muốn đọc (None = tự chọn tốt nhất).

    Returns:
        LoadResult.

    Raises:
        ValueError nếu không đọc được file (thay cho st.error ở bản gốc).
    """
    name = filename
    try:
        if name.endswith((".csv", ".txt")):
            sep = "," if name.endswith(".csv") else None
            df = pd.read_csv(io.BytesIO(file_bytes), sep=sep, header=header_row,
                             engine="python" if name.endswith(".txt") else "c")
            return LoadResult(key=name, df=sanitize_df(df))

        elif name.endswith((".xlsx", ".xls", ".xlsm")):
            raw_bytes = file_bytes
            engine_xl = "xlrd" if name.endswith(".xls") else "openpyxl"
            xf = pd.ExcelFile(io.BytesIO(raw_bytes), engine=engine_xl)
            all_sheet_names = xf.sheet_names

            chosen = sheet_name if (sheet_name and sheet_name in all_sheet_names) \
                else pick_best_sheet(all_sheet_names)

            df = load_sheet(raw_bytes, chosen, engine_xl, header_row)
            key = f"{name}::{chosen}"
            file_cache = {
                "raw_bytes": raw_bytes, "engine": engine_xl,
                "sheet_names": all_sheet_names, "current_sheet": chosen,
            }
            return LoadResult(key=key, df=df, sheet_names=all_sheet_names, file_cache=file_cache)

        elif name.endswith(".json"):
            return LoadResult(key=name, df=sanitize_df(pd.read_json(io.BytesIO(file_bytes))))

        else:
            df = pd.read_csv(io.BytesIO(file_bytes), sep=None, engine="python")
            return LoadResult(key=name, df=sanitize_df(df))

    except Exception as e:
        raise ValueError(f"Lỗi đọc {name}: {e}") from e


# ─────────────────────────────────────────────────────────────────────────────
# Summaries + encoding
# ─────────────────────────────────────────────────────────────────────────────
def df_summary(df: pd.DataFrame, name: str = "") -> str:
    lines = [f"File: {name}" if name else ""]
    lines.append(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
    lines.append(f"Columns: {', '.join(df.columns.tolist())}")
    lines.append(f"Missing: {df.isnull().sum().sum()} total ({df.isnull().mean().mean():.1%})")
    lines.append(f"Dtypes: {dict(df.dtypes.value_counts())}")
    lines.append("Sample stats:")
    lines.append(df.describe(include="all").to_string())
    return "\n".join(lines)


def encode_df(df: pd.DataFrame) -> pd.DataFrame:
    """Encode text columns. Nếu cột string là số (từ binning) → giữ nguyên giá trị
    số thay vì label encode theo thứ tự alphabet."""
    df = df.copy()
    le = LabelEncoder()
    for col in df.select_dtypes(include=["object", "string"]).columns:
        # Thử convert về số trước (binned columns có giá trị "1","2",...,"20")
        try:
            numeric_vals = pd.to_numeric(df[col], errors="raise")
            df[col] = numeric_vals.astype(float)
        except (ValueError, TypeError):
            # Không phải số → dùng LabelEncoder bình thường
            df[col] = le.fit_transform(df[col].astype(str))
    return df
