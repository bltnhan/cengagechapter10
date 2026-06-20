"""
Smoke test cho package `core` (Phương án B — tách khỏi Streamlit).

Mục tiêu:
  1) Chứng minh import `core` KHÔNG kéo theo streamlit (decoupling thật sự).
  2) Chạy thử mọi hàm prep/dataio/ml/excel trên dữ liệu tổng hợp → không exception,
     output có cấu trúc đúng.

Chạy:  ./.venv/Scripts/python.exe tests/smoke_core.py
"""
import io
import sys

import numpy as np
import pandas as pd

# ── (1) Import core và xác nhận KHÔNG có streamlit ───────────────────────────
assert "streamlit" not in sys.modules, "streamlit đã bị import TRƯỚC khi load core?!"
from core import dataio, prep, ml, ai, excel_export  # noqa: E402
assert "streamlit" not in sys.modules, "core đã kéo theo streamlit — VI PHẠM decoupling!"
print("[OK] import core — không có streamlit trong sys.modules")

PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("[OK] " if cond else "[FAIL] ") + name)


# ── Dữ liệu tổng hợp ─────────────────────────────────────────────────────────
rng = np.random.RandomState(0)
N = 240
clf_df = pd.DataFrame({
    "age": rng.randint(18, 70, N),
    "income": rng.normal(50000, 15000, N).round(2),
    "score": rng.normal(0.5, 0.2, N).round(3),
    "city": rng.choice(["Hanoi", "HCM", "Danang"], N),
})
# target nhị phân phụ thuộc feature (để model học được)
lin = (clf_df["age"] / 70 + clf_df["score"] + (clf_df["income"] / 100000))
clf_df["target"] = (lin > lin.median()).astype(int)

# dataset có vấn đề (missing, dup, outlier, text) cho prep
prob_df = clf_df.copy()
prob_df.loc[prob_df.sample(20, random_state=1).index, "income"] = np.nan
prob_df.loc[0, "income"] = 10_000_000          # outlier cực đại
prob_df = pd.concat([prob_df, prob_df.iloc[:5]], ignore_index=True)  # tạo duplicate

# dataset hồi quy (target liên tục)
reg_df = clf_df.copy()
reg_df["target"] = (clf_df["income"] * 0.5 + clf_df["age"] * 100 + rng.normal(0, 500, N)).round(2)

# dataset binned (integer) cho Naive Bayes → CategoricalNB
binned_df = pd.DataFrame({
    "f1": rng.randint(1, 6, N), "f2": rng.randint(1, 4, N), "f3": rng.randint(1, 5, N),
})
binned_df["target"] = ((binned_df["f1"] + binned_df["f2"]) > 5).astype(int)

# dataset giao dịch cho association
trans_df = pd.DataFrame({
    "i1": rng.choice(["bread", "milk", "beer", ""], N),
    "i2": rng.choice(["milk", "eggs", "beer", ""], N),
    "i3": rng.choice(["bread", "eggs", "chips", ""], N),
})

FEATURES = ["age", "income", "score", "city"]

# ── (2) dataio ───────────────────────────────────────────────────────────────
js = dataio.df_to_json(clf_df)
rt = dataio.json_to_df(js)
check("dataio.json round-trip giữ shape", rt.shape == clf_df.shape)
check("dataio.sanitize_df chạy", dataio.sanitize_df(prob_df).shape[0] == prob_df.shape[0])
enc = dataio.encode_df(clf_df[FEATURES])
check("dataio.encode_df ép text->số", enc["city"].dtype.kind in "if")
check("dataio.df_summary trả string", isinstance(dataio.df_summary(clf_df, "clf"), str))

# load_dataframe — CSV
csv_bytes = clf_df.to_csv(index=False).encode("utf-8")
lr_csv = dataio.load_dataframe(csv_bytes, "data.csv")
check("dataio.load_dataframe CSV", lr_csv.df.shape[1] == clf_df.shape[1] and lr_csv.file_cache is None)
# load_dataframe — Excel (2 sheet)
xbuf = io.BytesIO()
with pd.ExcelWriter(xbuf, engine="openpyxl") as w:
    clf_df.to_excel(w, sheet_name="Description", index=False)
    clf_df.to_excel(w, sheet_name="Data", index=False)
lr_xl = dataio.load_dataframe(xbuf.getvalue(), "data.xlsx")
check("dataio.load_dataframe Excel auto-chọn 'Data'", lr_xl.key.endswith("::Data") and lr_xl.file_cache is not None)
# load lỗi -> ValueError
try:
    dataio.load_dataframe(b"\x00\x01rubbish", "broken.xlsx")
    check("dataio.load_dataframe raise khi lỗi", False)
except ValueError:
    check("dataio.load_dataframe raise ValueError khi lỗi", True)

# ── (3) prep ─────────────────────────────────────────────────────────────────
probs = prep.detect_problems(prob_df)
ptypes = {p["type"] for p in probs}
check("prep.detect_problems thấy missing+duplicate+outlier+encoding",
      {"missing", "duplicate", "outlier", "encoding"} <= ptypes)
fm, _ = prep.fix_missing(prob_df)
check("prep.fix_missing hết NaN ở cột số", fm["income"].isnull().sum() == 0)
fd, _ = prep.fix_duplicates(prob_df)
check("prep.fix_duplicates giảm số dòng", len(fd) < len(prob_df))
fo, _ = prep.fix_outliers(prob_df)
check("prep.fix_outliers cap giá trị max", fo["income"].max() < 10_000_000)
ro, _ = prep.remove_outliers(prob_df.dropna(subset=["income"]))
check("prep.remove_outliers xóa dòng", len(ro) < len(prob_df))
fe_o, _, map_o = prep.fix_encode(clf_df, "ordinal")
check("prep.fix_encode ordinal có mapping", "city" in map_o and fe_o["city"].dtype.kind in "iu")
fe_n, _, _ = prep.fix_encode(clf_df, "nominal")
check("prep.fix_encode nominal tạo cột one-hot", any(c.startswith("city_") for c in fe_n.columns))
check("prep.suggest_target đoán 'target'", prep.suggest_target(clf_df) == "target")

# ── (4) ml.run_classification (nhiều method để quét nhánh) ────────────────────
clf_methods = ["Logistic Regression", "Random Forest", "K-Nearest Neighbors (KNN)",
               "Classification Trees", "Support Vector Machine (SVM)", "Neural Networks (MLP)",
               "Linear Discriminant Analysis (LDA)"]
clf_results = {}
for m in clf_methods:
    r = ml.run_classification(m, clf_df, "target", FEATURES, test_size=0.3, balance="None", sheet_name="clf")
    clf_results[m] = r
    ok = (isinstance(r.metrics, dict) and r.metrics["Method"] == m
          and r.model is not None and r.trained_model is not None and r.split_data is not None
          and len(r.figures) >= 1 and all(isinstance(f.png, (bytes, bytearray)) and len(f.png) > 100 for f in r.figures)
          and "validation_metrics" in r.tables and "classification_report" in r.tables)
    check(f"ml.run_classification[{m}]", ok)

# Naive Bayes — đường CONTINUOUS (GaussianNB) phải chạy OK
r_nb = ml.run_classification("Naive Bayes", clf_df, "target", FEATURES,
                             test_size=0.3, balance="None", sheet_name="clf")
check("ml.run_classification[Naive Bayes continuous→GaussianNB]",
      isinstance(r_nb.metrics, dict) and len(r_nb.figures) >= 1)
check("ml.run_classification notes là list[(level,msg)]",
      all(isinstance(t, tuple) and len(t) == 2 for t in r_nb.notes))

# Naive Bayes — đường BINNED tái hiện BUG GỐC (CategoricalNB re-fit trên data scaled âm).
# Faithful extraction ⇒ phải raise ValueError giống Streamlit.py (bị nuốt bởi try/except
# trong vòng chạy method ở bản gốc).
try:
    ml.run_classification("Naive Bayes", binned_df, "target", ["f1", "f2", "f3"],
                          test_size=0.3, balance="None", sheet_name="binned")
    check("ml NB binned tái hiện bug gốc (raise ValueError)", False)
except ValueError:
    check("ml NB binned tái hiện bug gốc (raise ValueError)", True)

# Balance = SMOTE (kiểm tra nhánh oversample)
r_sm = ml.run_classification("Random Forest", clf_df, "target", FEATURES,
                             test_size=0.3, balance="SMOTE", sheet_name="clf")
check("ml.run_classification balance=SMOTE chạy", isinstance(r_sm.metrics, dict))

# feature importance / tree rules
check("ml RandomForest có fi_table", clf_results["Random Forest"].fi_table is not None)
check("ml Trees có tree_rules", "tree_rules" in clf_results["Classification Trees"].tables)

# ── (5) ml.run_regression ────────────────────────────────────────────────────
for m in ["Linear Regression", "Neural Networks Regression (MLP)"]:
    rr = ml.run_regression(m, reg_df, "target", FEATURES, test_size=0.3, sheet_name="reg")
    ok = (isinstance(rr.metrics, dict) and "R²" in rr.metrics and "RMSE" in rr.metrics
          and len(rr.figures) == 2 and rr.trained_model is not None and rr.split_data is not None)
    check(f"ml.run_regression[{m}]", ok)

# ── (6) ml.run_clustering ────────────────────────────────────────────────────
for m in ["K-Means Clustering", "Hierarchical Clustering"]:
    rc = ml.run_clustering(m, clf_df, ["age", "income", "score"], n_clusters=3, sheet_name="clu")
    ok = (isinstance(rc.metrics, dict) and "Cluster" in rc.extra["df_out"].columns
          and len(rc.figures) >= 2)
    check(f"ml.run_clustering[{m}]", ok)

# ── (7) ml.run_association ───────────────────────────────────────────────────
ra = ml.run_association(trans_df, min_support=0.05, min_confidence=0.1, min_lift=1.0, sheet_name="assoc")
check("ml.run_association trả MLResult", isinstance(ra, ml.MLResult))
# có thể tìm thấy rule hoặc không (tùy data) — chỉ cần không exception và có note
check("ml.run_association có notes", len(ra.notes) >= 1)

# ── (8) excel_export ─────────────────────────────────────────────────────────
res_for_xl = {
    "TrainScore_LR": clf_results["Logistic Regression"].split_data["training_score"],
    "ValScore_LR": clf_results["Logistic Regression"].split_data["validation_score"],
}
# Mirror cấu trúc _run_figures gốc: key = save_key (FigureSpec.label), MỖI key 1 PNG.
figs_for_xl = {f.label: [f.png] for f in clf_results["Logistic Regression"].figures if f.save}
xls = excel_export.export_to_excel(res_for_xl, figs_for_xl)
check("excel_export.export_to_excel trả bytes .xlsx", isinstance(xls, (bytes, bytearray)) and xls[:2] == b"PK")

# ── (9) ai (không gọi mạng) ──────────────────────────────────────────────────
msg = ai.ask_ai("hello", gemini_key="", openrouter_key="")
check("ai.ask_ai báo thiếu key (không gọi mạng)", isinstance(msg, str) and "API Key" in msg)

# ── Tổng kết ─────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"PASS: {len(PASS)}  |  FAIL: {len(FAIL)}")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("ALL CORE SMOKE TESTS PASSED ✅")
