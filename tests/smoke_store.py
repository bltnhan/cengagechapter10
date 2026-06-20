"""
Smoke test RedisStore — mô phỏng 2 web replica chia sẻ dataset qua CÙNG 1 Redis.

Mục tiêu: chứng minh upload ở "replica A" thì "replica B" đọc/sửa được → web scale
nhiều replica an toàn. Dùng fakeredis (không cần Redis server).

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
replicaA = RedisStore(conn, ttl=3600, prefix="dm")
replicaB = RedisStore(conn, ttl=3600, prefix="dm")

df = pd.DataFrame({"a": np.arange(10), "b": list("xyxyxyxyxy")})

# replica A upload
ds = replicaA.add_dataset("data.csv", df)
check("A.add_dataset trả id", bool(ds.id))

# replica B đọc được dataset do A tạo  ← điểm mấu chốt cho scale ngang
dsB = replicaB.get_dataset(ds.id)
check("B.get_dataset thấy dataset của A", dsB.name == "data.csv" and dsB.df.shape == (10, 2))
check("B đọc đúng nội dung df", dsB.df["a"].tolist() == list(range(10)))

# replica B prep (encode) → A thấy thay đổi + history + enc_mapping
df2 = df.copy()
df2["b"] = (df2["b"] == "x").astype(int)
updated = replicaB.apply_transform(ds.id, "encode b", df2, enc_mapping={"b": {"x": 1, "y": 0}})
check("B.apply_transform trả Dataset đã cập nhật", updated.df["b"].tolist() == df2["b"].tolist())

dsA2 = replicaA.get_dataset(ds.id)
check("A thấy df đã transform của B", dsA2.df["b"].tolist() == df2["b"].tolist())
check("A thấy history_len=1", len(dsA2.history) == 1)
check("A thấy enc_mapping của B", dsA2.enc_mapping == {"b": {"x": 1, "y": 0}})

# replica A undo → B thấy quay lại
replicaA.undo(ds.id)
dsB2 = replicaB.get_dataset(ds.id)
check("B thấy undo của A (df về cũ)", dsB2.df["b"].tolist() == df["b"].tolist())
check("history rỗng sau undo", len(dsB2.history) == 0)

# file_cache (bytes) round-trip qua pickle/redis
ds_xl = replicaA.add_dataset("x.xlsx", df, file_cache={"raw_bytes": b"\x50\x4b\x03\x04", "engine": "openpyxl", "sheet_names": ["Data"]})
fc = replicaB.get_dataset(ds_xl.id).file_cache
check("file_cache bytes round-trip qua Redis", fc and fc["raw_bytes"] == b"\x50\x4b\x03\x04" and fc["sheet_names"] == ["Data"])

# dataset không tồn tại → KeyError
try:
    replicaA.get_dataset("nope")
    check("get_dataset thiếu → KeyError", False)
except KeyError:
    check("get_dataset thiếu → KeyError", True)

# key Redis đúng namespace
keys = sorted(k.decode() for k in conn.keys("dm:dataset:*"))
check("key Redis đúng prefix dm:dataset:*", len(keys) == 2 and all(k.startswith("dm:dataset:") for k in keys))

print("\n" + "=" * 60)
print(f"PASS: {len(PASS)}  |  FAIL: {len(FAIL)}")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("ALL STORE SMOKE TESTS PASSED ✅ (web multi-replica safe)")
