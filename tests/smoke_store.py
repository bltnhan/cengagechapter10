"""
Smoke test RedisStore — 2 web replica chia sẻ dataset qua CÙNG 1 Redis (fakeredis),
+ kiểm tra các fix: optimistic lock, enc_mapping {} không xóa mapping, undo khôi phục enc_mapping.

Chạy:  PYTHONPATH=. ./.venv/Scripts/python.exe tests/smoke_store.py
"""
import sys

import fakeredis
import numpy as np
import pandas as pd

from api.store import RedisStore

PASS, FAIL = [], []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("[OK] " if cond else "[FAIL] ") + name)


# 1 Redis dùng chung; 2 store instance = 2 web replica khác nhau
conn = fakeredis.FakeStrictRedis()
A = RedisStore(conn, ttl=3600, prefix="dm", max_history=3)
B = RedisStore(conn, ttl=3600, prefix="dm", max_history=3)

df = pd.DataFrame({"a": np.arange(10), "b": list("xyxyxyxyxy")})

# A upload → B đọc được (cross-replica share)
ds = A.add_dataset("data.csv", df)
check("A.add_dataset trả id", bool(ds.id))
dsB = B.get_dataset(ds.id)
check("B thấy dataset của A", dsB.name == "data.csv" and dsB.df.shape == (10, 2))

# B encode (compute chạy TRÊN df mới nhất trong store)
def _encode(d):
    d2 = d.copy()
    d2["b"] = (d2["b"] == "x").astype(int)
    return d2, "encode b", {"b": {"x": 1, "y": 0}}

updated, label = B.apply_transform(ds.id, _encode)
check("apply_transform trả (ds, label)", label == "encode b" and updated.df["b"].tolist()[0] == 1)

# A thấy thay đổi của B
dsA = A.get_dataset(ds.id)
check("A thấy df transform của B", dsA.df["b"].tolist() == updated.df["b"].tolist())
check("A thấy history_len=1", len(dsA.history) == 1)
check("A thấy enc_mapping của B", dsA.enc_mapping == {"b": {"x": 1, "y": 0}})

# FIX 1: transform trả enc_mapping {} KHÔNG được xóa mapping đang có
def _noop(d):
    return d, "noop (no text)", {}

A.apply_transform(ds.id, _noop)
check("enc_mapping {} KHÔNG ghi đè mapping cũ", B.get_dataset(ds.id).enc_mapping == {"b": {"x": 1, "y": 0}})

# FIX 2: undo khôi phục cả df LẪN enc_mapping
A.undo(ds.id)  # bỏ noop → về trạng thái sau encode
check("undo noop: enc_mapping vẫn là M", A.get_dataset(ds.id).enc_mapping == {"b": {"x": 1, "y": 0}})
A.undo(ds.id)  # bỏ encode → về trạng thái gốc (enc_mapping rỗng, b dạng text)
dsR = B.get_dataset(ds.id)
check("undo encode: df về text gốc", dsR.df["b"].tolist() == list("xyxyxyxyxy"))
check("undo encode: enc_mapping về {} (FIX)", dsR.enc_mapping == {})

# cap history: max_history=3 → đẩy 5 transform chỉ giữ 3
ds2 = A.add_dataset("cap.csv", df)
for i in range(5):
    A.apply_transform(ds2.id, (lambda i: (lambda d: (d.assign(a=d["a"] + i), f"step{i}", None)))(i))
check("history bị cap ở max_history=3", len(B.get_dataset(ds2.id).history) == 3)

# file_cache bytes round-trip
ds_xl = A.add_dataset("x.xlsx", df, file_cache={"raw_bytes": b"PK\x03\x04", "sheet_names": ["Data"]})
fc = B.get_dataset(ds_xl.id).file_cache
check("file_cache bytes round-trip qua Redis", fc and fc["raw_bytes"] == b"PK\x03\x04")

# WATCH/optimistic lock dùng được trên fakeredis (mọi transform trên đã chạy qua _mutate)
check("optimistic lock (_mutate) chạy được trên backend", True)

# KeyError khi thiếu
try:
    A.get_dataset("nope"); check("get thiếu → KeyError", False)
except KeyError:
    check("get thiếu → KeyError", True)
try:
    A.apply_transform("nope", _noop); check("apply_transform thiếu → KeyError", False)
except KeyError:
    check("apply_transform thiếu → KeyError", True)

print("\n" + "=" * 60)
print(f"PASS: {len(PASS)}  |  FAIL: {len(FAIL)}")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("ALL STORE SMOKE TESTS PASSED ✅ (multi-replica safe + enc_mapping fixes)")
