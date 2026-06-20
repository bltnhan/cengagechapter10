"""
Smoke test cho tầng FastAPI (api/) — dùng TestClient, KHÔNG cần server thật.

Chạy:  PYTHONPATH=. ./.venv/Scripts/python.exe tests/smoke_api.py
"""
import sys

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

# core/api KHÔNG được kéo theo streamlit
from api.main import app  # noqa: E402

assert "streamlit" not in sys.modules, "api kéo theo streamlit — VI PHẠM decoupling!"

client = TestClient(app)
PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("[OK] " if cond else "[FAIL] ") + name + (f"  {extra}" if extra and not cond else ""))


# ── dữ liệu CSV tổng hợp ──────────────────────────────────────────────────────
rng = np.random.RandomState(0)
N = 240
df = pd.DataFrame({
    "age": rng.randint(18, 70, N),
    "income": rng.normal(50000, 15000, N).round(2),
    "score": rng.normal(0.5, 0.2, N).round(3),
    "city": rng.choice(["Hanoi", "HCM", "Danang"], N),
})
lin = (df["age"] / 70 + df["score"] + df["income"] / 100000)
df["target"] = (lin > lin.median()).astype(int)
csv_bytes = df.to_csv(index=False).encode("utf-8")

# ── health ────────────────────────────────────────────────────────────────────
r = client.get("/health")
check("GET /health", r.status_code == 200 and r.json()["status"] == "ok")

# ── upload ────────────────────────────────────────────────────────────────────
r = client.post("/datasets", files={"file": ("data.csv", csv_bytes, "text/csv")},
                data={"header_row": "0"})
check("POST /datasets (upload)", r.status_code == 200, r.text)
body = r.json()
ds_id = body.get("dataset_id")
check("upload trả dataset_id + columns + suggested_target",
      bool(ds_id) and "target" in body["columns"] and body["suggested_target"] == "target")
check("upload có preview", "data" in body["preview"] and len(body["preview"]["data"]) > 0)

# ── get dataset ───────────────────────────────────────────────────────────────
r = client.get(f"/datasets/{ds_id}")
check("GET /datasets/{id}", r.status_code == 200 and r.json()["shape"] == [N, 5])
r = client.get("/datasets/nope")
check("GET dataset không tồn tại → 404", r.status_code == 404)

# ── problems ──────────────────────────────────────────────────────────────────
r = client.get(f"/datasets/{ds_id}/problems")
check("GET /problems", r.status_code == 200 and isinstance(r.json()["problems"], list))

# ── prep: encode 'city' ───────────────────────────────────────────────────────
r = client.post(f"/datasets/{ds_id}/prep", json={"op": "encode", "encode_type": "ordinal"})
check("POST /prep encode", r.status_code == 200 and "city" in r.json()["message"], r.text)
check("prep tăng history_len", r.json()["history_len"] == 1)

# ── run classification ────────────────────────────────────────────────────────
run_req = {"task": "classification", "method": "Random Forest",
           "target": "target", "features": ["age", "income", "score", "city"],
           "test_size": 0.3, "balance": "None"}
r = client.post(f"/datasets/{ds_id}/run", json=run_req)
check("POST /run classification", r.status_code == 200, r.text)
res = r.json()
run_id = res.get("run_id")
check("run trả metrics + run_id + has_model",
      bool(run_id) and res["metrics"]["Method"] == "Random Forest" and res["has_model"])
check("run trả figures base64",
      len(res["figures"]) >= 1 and all(f["png_base64"] for f in res["figures"]))
check("run trả tables (validation_metrics)", "validation_metrics" in res["tables"])
check("run notes là list dict{level,msg}",
      all(set(n) == {"level", "msg"} for n in res["notes"]))

# ── validation: thiếu target → 422 ────────────────────────────────────────────
r = client.post(f"/datasets/{ds_id}/run",
                json={"task": "classification", "method": "Random Forest", "features": ["age"]})
check("run thiếu target → 422", r.status_code == 422)

# ── export xlsx ───────────────────────────────────────────────────────────────
r = client.get(f"/runs/{run_id}/export.xlsx")
check("GET /runs/{id}/export.xlsx trả file .xlsx",
      r.status_code == 200 and r.content[:2] == b"PK" and "spreadsheetml" in r.headers.get("content-type", ""))

# ── regression / clustering / association ─────────────────────────────────────
reg_df = df.copy()
reg_df["target"] = (df["income"] * 0.5 + df["age"] * 100).round(2)
r = client.post("/datasets", files={"file": ("reg.csv", reg_df.to_csv(index=False).encode(), "text/csv")})
reg_id = r.json()["dataset_id"]
r = client.post(f"/datasets/{reg_id}/run", json={"task": "regression", "method": "Linear Regression",
                "target": "target", "features": ["age", "income", "score"]})
check("POST /run regression", r.status_code == 200 and "R²" in r.json()["metrics"], r.text)

r = client.post(f"/datasets/{ds_id}/run", json={"task": "clustering", "method": "K-Means Clustering",
                "features": ["age", "income", "score"], "n_clusters": 3})
check("POST /run clustering", r.status_code == 200 and r.json()["metrics"]["K"] == 3, r.text)

trans = pd.DataFrame({"i1": rng.choice(["bread", "milk", "beer", ""], N),
                      "i2": rng.choice(["milk", "eggs", "beer", ""], N)})
r = client.post("/datasets", files={"file": ("t.csv", trans.to_csv(index=False).encode(), "text/csv")})
t_id = r.json()["dataset_id"]
r = client.post(f"/datasets/{t_id}/run", json={"task": "association",
                "min_support": 0.05, "min_confidence": 0.1, "min_lift": 1.0})
check("POST /run association", r.status_code == 200, r.text)

# ── undo ──────────────────────────────────────────────────────────────────────
r = client.post(f"/datasets/{ds_id}/undo")
check("POST /undo giảm history_len", r.status_code == 200 and r.json()["history_len"] == 0)

# ── ai (không key, không gọi mạng) ────────────────────────────────────────────
r = client.post("/ai/ask", json={"prompt": "hello"})
check("POST /ai/ask báo thiếu key", r.status_code == 200 and "API Key" in r.json()["answer"])

# ── tổng kết ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"PASS: {len(PASS)}  |  FAIL: {len(FAIL)}")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("ALL API SMOKE TESTS PASSED ✅")
