"""
core.ml — Các runner ML thuần Python (không Streamlit).

Tách từ Streamlit.py:
  run_classification / run_regression / run_clustering / run_association
  (+ helper _dark_fig, fallback RandomOverSampler/SMOTE)

NGUYÊN TẮC TÁCH (Phương án B):
  - Logic tính toán (fit/predict/metrics) GIỮ NGUYÊN so với bản gốc.
  - Mọi `st.info/warning/success/error`  → thêm vào `MLResult.notes` dạng (level, msg).
  - Mọi `fig_to_st(fig, save_key=...)`    → thêm vào `MLResult.figures` dạng FigureSpec
    (PNG bytes; `save=True` nếu bản gốc truyền save_key → dùng để xuất Excel).
  - Mọi ghi `st.session_state[...]`        → TRẢ VỀ trong MLResult (trained_model /
    split_data / fi_table) để caller tự lưu.
  - Mọi bảng `st.dataframe/markdown(HTML)` → trả về DataFrame thô trong `MLResult.tables`
    (tầng UI tự render HTML/st.dataframe; tầng API tự serialize JSON).
  - `active_sheet` → tham số `sheet_name`. `enc_mapping` → tham số `label_encoder`.
"""
from __future__ import annotations

import io
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.cluster.hierarchy import dendrogram, linkage

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.naive_bayes import GaussianNB, CategoricalNB
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.metrics import (accuracy_score, classification_report,
                             mean_squared_error, r2_score, silhouette_score,
                             confusion_matrix, precision_score, recall_score,
                             f1_score, roc_auc_score, roc_curve)
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

from .dataio import encode_df

# ─── imbalanced-learn (fallback nếu không cài được) ──────────────────────────
try:
    from imblearn.over_sampling import RandomOverSampler, SMOTE
    _IMBLEARN_OK = True
except Exception:
    _IMBLEARN_OK = False

    class RandomOverSampler:
        """Fallback: random oversampling bằng numpy."""
        def __init__(self, random_state=42):
            self.random_state = random_state

        def fit_resample(self, X, y):
            rng = np.random.RandomState(self.random_state)
            classes, counts = np.unique(y, return_counts=True)
            max_count = counts.max()
            X_res, y_res = list(X), list(y)
            for cls, cnt in zip(classes, counts):
                if cnt < max_count:
                    idx = np.where(y == cls)[0]
                    extra = rng.choice(idx, max_count - cnt, replace=True)
                    X_res.extend(X[extra])
                    y_res.extend(y[extra])
            return np.array(X_res), np.array(y_res)

    class SMOTE:
        """Fallback: dùng RandomOverSampler khi imblearn không có."""
        def __init__(self, random_state=42):
            self._ros = RandomOverSampler(random_state=random_state)

        def fit_resample(self, X, y):
            return self._ros.fit_resample(X, y)


# ─────────────────────────────────────────────────────────────────────────────
# Kiểu trả về
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class FigureSpec:
    """Một biểu đồ đã render sẵn thành PNG bytes (sẵn sàng cho UI hoặc base64 API)."""
    label: str
    png: bytes
    save: bool = False   # True nếu bản gốc gọi fig_to_st(..., save_key=...) → đưa vào Excel export


@dataclass
class MLResult:
    """Kết quả thuần của một runner ML — không chứa bất kỳ tham chiếu Streamlit nào."""
    metrics: Optional[dict] = None
    notes: list = field(default_factory=list)        # list[(level, msg)]; level in info/warning/success/error
    figures: list = field(default_factory=list)      # list[FigureSpec]
    tables: dict = field(default_factory=dict)        # name -> DataFrame | str
    model: object = None
    trained_model: Optional[dict] = None             # nội dung cho _trained_models[method]
    split_data: Optional[dict] = None                # nội dung cho _split_data[method]
    fi_table: Optional[pd.DataFrame] = None          # feature importance
    extra: dict = field(default_factory=dict)         # X_te/y_te/y_pred (clf), df_out (clustering), display (assoc)


# ─────────────────────────────────────────────────────────────────────────────
# Helper vẽ figure (thay cho _dark_fig + _fig_to_png + fig_to_st)
# ─────────────────────────────────────────────────────────────────────────────
def _dark_fig(w=6, h=4):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor("#0d1117")
    ax.set_facecolor("#111827")
    ax.tick_params(colors="#9ca3af", labelcolor="#9ca3af")
    for sp in ax.spines.values():
        sp.set_edgecolor("#374151")
    return fig, ax


def _fig_to_png(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight",
                facecolor=fig.get_facecolor(), dpi=120)
    buf.seek(0)
    return buf.read()


def _emit(figures: list, fig, label: str, save: bool = False):
    """Chuyển figure → PNG bytes, đóng figure, thêm vào danh sách. Thay cho fig_to_st."""
    figures.append(FigureSpec(label=label, png=_fig_to_png(fig), save=save))
    plt.close(fig)


def _metrics_table_df(n_correct, n_total, specificity, sensitivity, precision, f1, auc_val=None) -> pd.DataFrame:
    """Bảng metrics (Solver Analytics format) dạng DataFrame — KHÔNG render HTML."""
    _pct = 100 * n_correct / n_total if n_total > 0 else 0
    _rows = [("Accuracy (#correct)", n_correct), ("Accuracy (%correct)", round(_pct, 5)),
             ("Specificity", round(specificity, 7)), ("Sensitivity (Recall)", round(sensitivity, 7)),
             ("Precision", round(precision, 7)), ("F1 score", round(f1, 7))]
    if auc_val:
        _rows.append(("AUC (ROC)", round(auc_val, 5)))
    return pd.DataFrame(_rows, columns=["Metric", "Value"])


# ─────────────────────────────────────────────────────────────────────────────
# CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────
def run_classification(method, df, target, features, test_size, balance,
                       split_seed=42, oversample_order="split_first", hyperparams=None,
                       sheet_name: str = "", label_encoder: Optional[dict] = None) -> MLResult:
    if hyperparams is None:
        hyperparams = {}
    res = MLResult()
    notes = res.notes
    figures = res.figures

    df_enc = encode_df(df[features + [target]].dropna())
    scaler = StandardScaler()
    X = scaler.fit_transform(df_enc[features].values)
    y = df_enc[target].values

    def _do_oversample(Xa, ya, method_name):
        if method_name == "Random Oversampling":
            Xa, ya = RandomOverSampler(random_state=42).fit_resample(Xa, ya)
            notes.append(("info", f"✅ Random Oversampling applied: {len(ya):,} samples"))
        elif method_name == "SMOTE":
            try:
                Xa, ya = SMOTE(random_state=42).fit_resample(Xa, ya)
                notes.append(("info", f"✅ SMOTE applied: {len(ya):,} samples"))
            except Exception as e:
                notes.append(("warning", f"SMOTE skipped: {e}"))
        return Xa, ya

    if balance != "None" and oversample_order == "oversample_first":
        X, y = _do_oversample(X, y, balance)
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=test_size, random_state=split_seed)
    else:
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=test_size, random_state=split_seed)
        if balance != "None":
            X_tr, y_tr = _do_oversample(X_tr, y_tr, balance)

    _hp = hyperparams

    def _p(k, default):
        return _hp.get(k, default)

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight="balanced",
            C=_p("C", 1.0), penalty=_p("penalty", "l2"),
            solver=_p("solver", "lbfgs") if _p("penalty", "l2") != "l1" else "liblinear"),
        "Linear Discriminant Analysis (LDA)": LinearDiscriminantAnalysis(
            solver=_p("solver", "svd"),
            shrinkage="auto" if _p("shrinkage", "None") == "auto" and _p("solver", "svd") != "svd" else None),
        "K-Nearest Neighbors (KNN)": KNeighborsClassifier(
            n_neighbors=int(_p("n_neighbors", 3)), weights=_p("weights", "uniform"), metric=_p("metric", "minkowski")),
        "Classification Trees": DecisionTreeClassifier(
            max_depth=int(_p("max_depth", 5)), class_weight="balanced",
            min_samples_leaf=int(_p("min_samples_leaf", 1)), criterion=_p("criterion", "gini")),
        "Naive Bayes": GaussianNB(),  # may be overridden below
        "Support Vector Machine (SVM)": SVC(probability=True,
            C=_p("C", 1.0), kernel=_p("kernel", "rbf"), gamma=_p("gamma", "scale")),
        "Random Forest": RandomForestClassifier(
            n_estimators=int(_p("n_estimators", 100)), random_state=42, class_weight="balanced",
            max_depth=int(_p("max_depth", 0)) if int(_p("max_depth", 0)) > 0 else None,
            min_samples_leaf=int(_p("min_samples_leaf", 1))),
        "Neural Networks (MLP)": MLPClassifier(max_iter=500, random_state=42,
            hidden_layer_sizes=_p("hidden_layer_sizes", (100,)),
            activation=_p("activation", "relu"),
            learning_rate_init=_p("learning_rate_init", 0.001)),
    }
    # Auto-detect: CategoricalNB nếu features là integer (binned), GaussianNB nếu continuous
    #
    # ⚠️ BUG GỐC (giữ nguyên hành vi từ Streamlit.py): khi _is_binned=True, khối dưới
    # tạo & fit CategoricalNB trên _X_cat (đã clip về >=0), nhưng sau đó đường chung
    # `mdl.fit(X_tr, y_tr)` bên dưới RE-FIT chính model đó trên X_tr ĐÃ StandardScale
    # (có giá trị âm) → CategoricalNB.fit raise ValueError("Negative values...").
    # Ở bản gốc lỗi này bị nuốt bởi try/except trong vòng lặp chạy method
    # (Streamlit.py:2892). Để extraction TRUNG THÀNH, ta KHÔNG sửa ở đây — sẽ xử lý
    # ở bước refactor logic sau (vd: dùng _X_cat/_X_cat_te xuyên suốt thay vì X_tr/X_te).
    if method == "Naive Bayes":
        _alpha_nb = _p("laplace_alpha", 1.0)
        _is_binned = all(pd.api.types.is_integer_dtype(df_enc[c]) or
                         (pd.api.types.is_float_dtype(df_enc[c]) and df_enc[c].dropna().apply(float.is_integer).all())
                         for c in features)
        if _is_binned:
            try:
                _X_cat = (scaler.inverse_transform(X_tr) if hasattr(scaler, "inverse_transform") else X_tr).astype(int)
                _X_cat_te = (scaler.inverse_transform(X_te) if hasattr(scaler, "inverse_transform") else X_te).astype(int)
                _X_cat = np.clip(_X_cat - _X_cat.min(axis=0), 0, None)
                _X_cat_te = np.clip(_X_cat_te - _X_cat.min(axis=0), 0, None)
                _nb_cat = CategoricalNB(alpha=_alpha_nb)
                _nb_cat.fit(_X_cat, y_tr)
                models["Naive Bayes"] = _nb_cat
                notes.append(("info", f"Naive Bayes: dung CategoricalNB (data da bin, alpha={_alpha_nb})"))
            except Exception as _e:
                notes.append(("warning", f"CategoricalNB fallback to GaussianNB: {_e}"))
                models["Naive Bayes"] = GaussianNB(var_smoothing=1e-9)
        else:
            models["Naive Bayes"] = GaussianNB(var_smoothing=float(_p("var_smoothing", 1e-9)))
            notes.append(("info", "Naive Bayes: dung GaussianNB (du lieu continuous)"))

    # Auto-adjust for class imbalance
    _classes, _counts = np.unique(y_tr, return_counts=True)
    _imbalance_ratio = _counts.max() / _counts.min() if len(_counts) > 1 else 1
    if method == "Naive Bayes" and _imbalance_ratio > 3:
        _n_cls = len(_classes)
        models["Naive Bayes"] = GaussianNB(priors=[1 / _n_cls] * _n_cls)
        notes.append(("info", f"Naive Bayes: dùng prior cân bằng (1/{_n_cls} mỗi class) vì data mất cân bằng {_imbalance_ratio:.1f}:1"))

    if _imbalance_ratio > 5:
        notes.append(("warning", f"Canh bao: Data mat can bang {_imbalance_ratio:.1f}:1 (class {_classes[np.argmin(_counts)]}: {_counts.min()} mau). Nen dung Class Balancing de tang Sensitivity."))

    mdl = models[method]
    mdl.fit(X_tr, y_tr)
    y_pred = mdl.predict(X_te)
    acc = accuracy_score(y_te, y_pred)
    is_bin = len(np.unique(y)) == 2
    avg = "binary" if is_bin else "weighted"
    prec = precision_score(y_te, y_pred, average=avg, zero_division=0)
    rec = recall_score(y_te, y_pred, average=avg, zero_division=0)
    f1 = f1_score(y_te, y_pred, average=avg, zero_division=0)
    cm = confusion_matrix(y_te, y_pred)
    val_spec = cm[0, 0] / (cm[0, 0] + cm[0, 1]) if cm[0, 0] + cm[0, 1] > 0 else 0
    try:
        auc = roc_auc_score(y_te, mdl.predict_proba(X_te)[:, 1] if is_bin else mdl.predict_proba(X_te),
                            multi_class="ovr" if not is_bin else "raise",
                            average="weighted" if not is_bin else None)
    except Exception:
        auc = None
    # Training metrics
    y_tr_pred = mdl.predict(X_tr)
    tr_acc = accuracy_score(y_tr, y_tr_pred)
    tr_cm = confusion_matrix(y_tr, y_tr_pred)
    tr_sens = tr_cm[1, 1] / (tr_cm[1, 0] + tr_cm[1, 1]) if (tr_cm[1, 0] + tr_cm[1, 1]) > 0 else 0
    tr_spec = tr_cm[0, 0] / (tr_cm[0, 0] + tr_cm[0, 1]) if (tr_cm[0, 0] + tr_cm[0, 1]) > 0 else 0
    tr_f1 = f1_score(y_tr, y_tr_pred, average=avg, zero_division=0)
    val_spec = cm[0, 0] / (cm[0, 0] + cm[0, 1]) if cm[0, 0] + cm[0, 1] > 0 else 0

    metrics = {"Method": method, "Sheet": sheet_name,
               "Train_Accuracy": f"{tr_acc:.4f}", "Train_Sensitivity": f"{tr_sens:.4f}",
               "Train_Specificity": f"{tr_spec:.4f}", "Train_F1": f"{tr_f1:.4f}",
               "Val_Accuracy": f"{acc:.4f}", "Val_Sensitivity": f"{rec:.4f}",
               "Val_Specificity": f"{val_spec:.4f}", "Precision": f"{prec:.4f}",
               "F1-Score": f"{f1:.4f}", "AUC": f"{auc:.4f}" if auc else "N/A",
               "Accuracy": f"{acc:.4f}", "Recall": f"{rec:.4f}",
               "Train rows": len(X_tr), "Validation rows": len(X_te)}

    def _render_cm(cm_arr, title, save_label):
        fig, ax = _dark_fig(4.5, 3.8)
        sns.heatmap(cm_arr, annot=False, fmt="d", cmap="Blues", ax=ax, linewidths=.5, linecolor="#374151")
        for _i in range(cm_arr.shape[0]):
            for _j in range(cm_arr.shape[1]):
                ax.text(_j + 0.5, _i + 0.5, str(cm_arr[_i, _j]), ha="center", va="center",
                        fontsize=13, fontweight="bold", color="black")
        ax.set_title(title, color="#e5e7eb", fontsize=11)
        ax.set_xlabel("Predicted", color="#9ca3af")
        ax.set_ylabel("Actual", color="#9ca3af")
        _emit(figures, fig, save_label, save=True)

    def _render_roc(fpr_arr, tpr_arr, auc_v, title, save_label):
        fig, ax = _dark_fig(4.5, 3.8)
        ax.plot(fpr_arr, tpr_arr, color="#3b82f6", lw=2, label=f"AUC={auc_v:.4f}" if auc_v else "Fitted")
        ax.plot([0, 1], [0, 1], "r--", lw=1, label="Random")
        ax.plot([0, 0, 1], [0, 1, 1], "g:", lw=1, label="Optimum")
        ax.set_xlabel("1-Specificity (FPR)", color="#9ca3af")
        ax.set_ylabel("Sensitivity (TPR)", color="#9ca3af")
        ax.set_title(title, color="#e5e7eb", fontsize=11)
        ax.legend(facecolor="#111827", labelcolor="#9ca3af", fontsize=9)
        _emit(figures, fig, save_label, save=True)

    # ── TRAINING ────────────────────────────────────────────────────────────
    _tr_correct = int(np.diag(tr_cm).sum())
    res.tables["training_metrics"] = _metrics_table_df(
        _tr_correct, len(y_tr), tr_spec, tr_sens,
        precision_score(y_tr, y_tr_pred, zero_division=0), tr_f1)
    _tr_err = []
    for _cls in sorted(set(y_tr)):
        _mask = (y_tr == _cls)
        _ne = int((y_tr_pred[_mask] != _cls).sum())
        _tr_err.append({"Class": int(_cls), "# Cases": int(_mask.sum()), "# Errors": _ne,
                        "% Error": round(100 * _ne / _mask.sum(), 5)})
    _ov = int((y_tr_pred != y_tr).sum())
    _tr_err.append({"Class": "Overall", "# Cases": len(y_tr), "# Errors": _ov,
                    "% Error": round(100 * _ov / len(y_tr), 5)})
    res.tables["training_error"] = pd.DataFrame(_tr_err)
    _render_cm(tr_cm, "Training Confusion Matrix", method + "_tr_cm")
    if is_bin and hasattr(mdl, "predict_proba"):
        try:
            _fpr_tr, _tpr_tr, _ = roc_curve(y_tr, mdl.predict_proba(X_tr)[:, 1])
            _auc_tr = roc_auc_score(y_tr, mdl.predict_proba(X_tr)[:, 1])
            _render_roc(_fpr_tr, _tpr_tr, _auc_tr, f"ROC Curve — Training (AUC={_auc_tr:.4f})", method + "_tr_roc")
        except Exception:
            pass

    # ── VALIDATION ──────────────────────────────────────────────────────────
    _val_correct = int(np.diag(cm).sum())
    res.tables["validation_metrics"] = _metrics_table_df(_val_correct, len(y_te), val_spec, rec, prec, f1, auc)
    _val_err = []
    for _cls in sorted(set(y_te)):
        _mask = (y_te == _cls)
        _ne = int((y_pred[_mask] != _cls).sum())
        _val_err.append({"Class": int(_cls), "# Cases": int(_mask.sum()), "# Errors": _ne,
                         "% Error": round(100 * _ne / _mask.sum(), 5)})
    _ove = int((y_pred != y_te).sum())
    _val_err.append({"Class": "Overall", "# Cases": len(y_te), "# Errors": _ove,
                     "% Error": round(100 * _ove / len(y_te), 5)})
    res.tables["validation_error"] = pd.DataFrame(_val_err)
    _render_cm(cm, "Validation Confusion Matrix", method + "_val_cm")
    if is_bin and hasattr(mdl, "predict_proba"):
        _proba_te = mdl.predict_proba(X_te)
        try:
            _fpr, _tpr, _ = roc_curve(y_te, _proba_te[:, 1])
            _render_roc(_fpr, _tpr, auc, f"ROC Curve — Validation (AUC={auc:.4f})" if auc else "ROC Curve — Validation", method + "_val_roc")
        except Exception:
            pass
        try:
            _prob1 = _proba_te[:, 1]
            _sidx = _prob1.argsort()[::-1]
            _n = len(y_te)
            _gr = y_te.mean()
            _dec_rows = []
            for _d in range(1, 11):
                _s = int((_d - 1) * _n / 10)
                _e = int(_d * _n / 10)
                _idx_d = _sidx[_s:_e]
                _md = y_te[_idx_d].mean()
                _std = y_te[_idx_d].std()
                _dec_rows.append({"Decile": _d, "Mean": round(_md, 6), "Std.Dev.": round(_std, 6),
                                  "Min.": int(y_te[_idx_d].min()), "Max.": int(y_te[_idx_d].max()),
                                  "Lift (Decile/Global)": round(_md / _gr, 4) if _gr > 0 else 0})
            res.tables["decile"] = pd.DataFrame(_dec_rows)
        except Exception:
            pass
        _prob_df = pd.DataFrame({"Record": [f"Record {i + 1}" for i in range(min(20, len(y_te)))],
                                 "Actual": y_te[:20], "Predicted": y_pred[:20],
                                 "PostProb: 0": _proba_te[:20, 0].round(6), "PostProb: 1": _proba_te[:20, 1].round(6)})
        res.tables["posterior"] = _prob_df

    res.tables["classification_report"] = classification_report(y_te, y_pred)

    if hasattr(mdl, "feature_importances_") or hasattr(mdl, "coef_"):
        if hasattr(mdl, "feature_importances_"):
            fi = pd.Series(mdl.feature_importances_, index=features).sort_values(ascending=False)
        else:
            fi = pd.Series(np.abs(mdl.coef_[0] if mdl.coef_.ndim > 1 else mdl.coef_), index=features).sort_values(ascending=False)
        _top_n = min(len(fi), 20)
        fig3, ax3 = _dark_fig(7, max(3, min(14, _top_n * .4)))
        fi.head(_top_n).plot(kind="barh", ax=ax3, color="#3b82f6")
        ax3.set_title(f"Top {_top_n} Important Features", color="#e5e7eb")
        ax3.invert_yaxis()
        plt.tight_layout()
        _emit(figures, fig3, method, save=True)
        fi_df = fi.head(_top_n).reset_index()
        fi_df.columns = ["Feature", "Importance"]
        fi_df["Importance"] = fi_df["Importance"].round(4)
        res.fi_table = fi_df
        res.tables["feature_importance"] = fi_df

    if method == "Classification Trees":
        res.tables["tree_rules"] = export_text(mdl, feature_names=features, max_depth=4)

    # Trained model metadata (thay cho st.session_state['_trained_models'])
    res.trained_model = {
        "model": mdl, "scaler": scaler, "features": features, "target": target,
        "type": "classification", "classes": list(np.unique(y)),
        "label_encoder": label_encoder or {},
    }

    # Score tables (thay cho st.session_state['_split_data'])
    try:
        _tr_c = int(np.diag(tr_cm).sum())
        _val_c = int(np.diag(cm).sum())
        _tr_p2 = precision_score(y_tr, y_tr_pred, zero_division=0)

        def _safe_cm_val(matrix, r, c):
            try:
                return int(matrix[r, c])
            except Exception:
                return 0

        def _safe_class_n(y_arr, cls):
            try:
                return int(sum(y_arr == cls))
            except Exception:
                return 0

        _tr_score = pd.DataFrame([
            ["Confusion Matrix", "", ""],
            ["Actual/Predicted", "0", "1"],
            ["0", _safe_cm_val(tr_cm, 0, 0), _safe_cm_val(tr_cm, 0, 1)],
            ["1", _safe_cm_val(tr_cm, 1, 0), _safe_cm_val(tr_cm, 1, 1)],
            ["", "", ""],
            ["Error Report", "", ""],
            ["Class", "# Cases", "# Errors"],
            ["0", _safe_class_n(y_tr, 0), _safe_cm_val(tr_cm, 0, 1)],
            ["1", _safe_class_n(y_tr, 1), _safe_cm_val(tr_cm, 1, 0)],
            ["Overall", len(y_tr), int((y_tr_pred != y_tr).sum())],
            ["", "", ""],
            ["Metrics", "Value", ""],
            ["Accuracy (#correct)", _tr_c, ""],
            ["Accuracy (%correct)", round(100 * _tr_c / max(1, len(y_tr)), 5), ""],
            ["Specificity", round(tr_spec, 6), ""],
            ["Sensitivity (Recall)", round(tr_sens, 6), ""],
            ["Precision", round(_tr_p2, 6), ""],
            ["F1 score", round(tr_f1, 6), ""],
        ])
        _proba_s = mdl.predict_proba(X_te) if hasattr(mdl, "predict_proba") else None
        _val_score = pd.DataFrame([
            ["Confusion Matrix", "", ""],
            ["Actual/Predicted", "0", "1"],
            ["0", _safe_cm_val(cm, 0, 0), _safe_cm_val(cm, 0, 1)],
            ["1", _safe_cm_val(cm, 1, 0), _safe_cm_val(cm, 1, 1)],
            ["", "", ""],
            ["Error Report", "", ""],
            ["Class", "# Cases", "# Errors"],
            ["0", _safe_class_n(y_te, 0), _safe_cm_val(cm, 0, 1)],
            ["1", _safe_class_n(y_te, 1), _safe_cm_val(cm, 1, 0)],
            ["Overall", len(y_te), int((y_pred != y_te).sum())],
            ["", "", ""],
            ["Metrics", "Value", "Definition"],
            ["Accuracy (#correct)", _val_c, ""],
            ["Accuracy (%correct)", round(100 * _val_c / max(1, len(y_te)), 5), ""],
            ["Specificity", round(val_spec, 6), "TN/(TN+FP)"],
            ["Sensitivity (Recall)", round(rec, 6), "TP/(TP+FN)"],
            ["Precision", round(prec, 6), "TP/(TP+FP)"],
            ["F1 score", round(f1, 6), "2*P*R/(P+R)"],
            ["AUC (ROC)", round(auc, 5) if auc else "N/A", "Area Under ROC Curve"],
        ])
        _det_rows = []
        for _ri in range(min(len(y_te), 100)):
            _pp0 = round(float(_proba_s[_ri, 0]), 6) if _proba_s is not None else ""
            _pp1 = round(float(_proba_s[_ri, 1]), 6) if _proba_s is not None else ""
            _det_rows.append([f"Record {_ri + 1}", int(y_te[_ri]), int(y_pred[_ri]), _pp0, _pp1])
        _det_df = pd.DataFrame(_det_rows, columns=["Record ID", "Actual", "Predicted", "PostProb: 0", "PostProb: 1"]) if _det_rows else pd.DataFrame()
        _decile_exp = []
        if _proba_s is not None:
            try:
                _p1 = _proba_s[:, 1]
                _si = _p1.argsort()[::-1]
                _n2 = len(y_te)
                _gr2 = y_te.mean()
                for _d in range(1, 11):
                    _yd = y_te[_si[int((_d - 1) * _n2 / 10):int(_d * _n2 / 10)]]
                    _decile_exp.append([f"Decile {_d}", round(float(_yd.mean()), 6), round(float(_yd.std()), 6),
                                        int(_yd.min()), int(_yd.max()), _d, round(float(_yd.mean()) / _gr2, 4) if _gr2 > 0 else 0])
            except Exception:
                pass
        _lift_df = pd.DataFrame(_decile_exp, columns=["Decile", "Mean", "Std.Dev.", "Min.", "Max.", "ID", "Lift"]) if _decile_exp else pd.DataFrame()
        res.split_data = {
            "training_score": _tr_score, "validation_score": _val_score,
            "lift": _lift_df, "validation_details": _det_df,
            "features": features, "target": target, "type": "classification",
        }
    except Exception:
        res.split_data = {
            "training_score": pd.DataFrame([["Accuracy", round(acc, 4)], ["F1", round(f1, 4)]]),
            "validation_score": pd.DataFrame([["Accuracy", round(acc, 4)], ["F1", round(f1, 4)], ["AUC", round(auc, 4) if auc else "N/A"]]),
            "lift": pd.DataFrame(), "validation_details": pd.DataFrame(),
            "features": features, "target": target, "type": "classification",
        }

    res.metrics = metrics
    res.model = mdl
    res.extra = {"X_te": X_te, "y_te": y_te, "y_pred": y_pred}
    return res


# ─────────────────────────────────────────────────────────────────────────────
# REGRESSION
# ─────────────────────────────────────────────────────────────────────────────
def run_regression(method, df, target, features, test_size, split_seed=42, sheet_name: str = "") -> MLResult:
    res = MLResult()
    notes = res.notes
    figures = res.figures

    df_enc = encode_df(df[features + [target]].dropna())
    scaler_r = StandardScaler()
    X = scaler_r.fit_transform(df_enc[features].values)
    y = df_enc[target].values
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=test_size, random_state=split_seed)
    mdl = LinearRegression() if method == "Linear Regression" else MLPRegressor(max_iter=500, random_state=42)
    mdl.fit(X_tr, y_tr)
    y_pred = mdl.predict(X_te)
    mse = mean_squared_error(y_te, y_pred)
    r2 = r2_score(y_te, y_pred)
    residuals = y_te - y_pred
    metrics = {"Method": method, "Sheet": sheet_name,
               "R²": f"{r2:.4f}", "RMSE": f"{np.sqrt(mse):.4f}",
               "Train rows": len(X_tr), "Validation rows": len(X_te)}
    if r2 >= .7:
        notes.append(("success", f"R²={r2:.4f} — Good fit ({r2:.1%} variance explained)."))
    elif r2 >= .4:
        notes.append(("warning", f"R²={r2:.4f} — Moderate. Consider adding features."))
    else:
        notes.append(("error", f"R²={r2:.4f} — Weak fit."))

    fig, ax = _dark_fig(5, 4)
    ax.scatter(y_te, y_pred, alpha=.5, color="#3b82f6", s=20)
    mn, mx = min(y_te.min(), y_pred.min()), max(y_te.max(), y_pred.max())
    ax.plot([mn, mx], [mn, mx], "r--", lw=1.5)
    ax.set_xlabel("Actual", color="#9ca3af")
    ax.set_ylabel("Predicted", color="#9ca3af")
    ax.set_title("Actual vs Predicted", color="#e5e7eb")
    _emit(figures, fig, method, save=True)

    fig2, ax2 = _dark_fig(5, 4)
    ax2.scatter(y_pred, residuals, alpha=.5, color="#a78bfa", s=20)
    ax2.axhline(0, color="#ef4444", linestyle="--", lw=1.5)
    ax2.set_xlabel("Predicted", color="#9ca3af")
    ax2.set_ylabel("Residual", color="#9ca3af")
    ax2.set_title("Residual Plot", color="#e5e7eb")
    _emit(figures, fig2, "Residual Plot", save=False)

    res.trained_model = {"model": mdl, "scaler": scaler_r, "features": features, "target": target, "type": "regression"}
    _reg_score_tr = pd.DataFrame([["Metrics", "Train Value"], ["R2", round(r2_score(y_tr, mdl.predict(X_tr)), 4)],
                                  ["RMSE", round(float(np.sqrt(mean_squared_error(y_tr, mdl.predict(X_tr)))), 4)], ["Train rows", len(X_tr)]])
    _reg_score_val = pd.DataFrame([["Metrics", "Validation Value"], ["R2", round(r2, 4)],
                                   ["RMSE", round(float(np.sqrt(mse)), 4)], ["Validation rows", len(X_te)]])
    _reg_det = pd.DataFrame({"Record": [f"Record {i + 1}" for i in range(len(y_te))],
                             "Actual": y_te, "Predicted": y_pred.round(4), "Residual": residuals.round(4)})
    res.split_data = {"training_score": _reg_score_tr, "validation_score": _reg_score_val,
                      "validation_details": _reg_det, "lift": pd.DataFrame(),
                      "features": features, "target": target, "type": "regression"}
    res.metrics = metrics
    res.model = mdl
    res.extra = {"X_te": X_te, "y_te": y_te, "y_pred": y_pred}
    return res


# ─────────────────────────────────────────────────────────────────────────────
# CLUSTERING
# ─────────────────────────────────────────────────────────────────────────────
def run_clustering(method, df, features, n_clusters, sheet_name: str = "") -> MLResult:
    res = MLResult()
    notes = res.notes
    figures = res.figures

    df_enc = encode_df(df[features].dropna())
    X = StandardScaler().fit_transform(df_enc.values)
    if method == "K-Means Clustering":
        mdl = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = mdl.fit_predict(X)
        k_range = range(2, min(11, len(X)))
        inertias = []
        for k in k_range:
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            km.fit(X)
            inertias.append(km.inertia_)
        fig, ax = _dark_fig(6, 3)
        ax.plot(list(k_range), inertias, "o-", color="#3b82f6", lw=2)
        ax.axvline(n_clusters, color="#f472b6", linestyle="--", lw=1.5, label=f"K={n_clusters}")
        ax.set_title("Elbow Curve", color="#e5e7eb")
        ax.set_xlabel("K", color="#9ca3af")
        ax.set_ylabel("Inertia", color="#9ca3af")
        ax.legend(facecolor="#111827", labelcolor="#9ca3af")
        _emit(figures, fig, "Elbow Curve", save=False)
    else:
        mdl = AgglomerativeClustering(n_clusters=n_clusters)
        labels = mdl.fit_predict(X)
        linked = linkage(X[:min(200, len(X))], method="ward")
        fig, ax = _dark_fig(8, 4)
        dendrogram(linked, ax=ax, color_threshold=0, above_threshold_color="#3b82f6", leaf_font_size=6)
        ax.set_title("Dendrogram (sample 200)", color="#e5e7eb")
        plt.tight_layout()
        _emit(figures, fig, "Dendrogram", save=False)
    try:
        sil = silhouette_score(X, labels)
        if sil > .7:
            notes.append(("success", f"Excellent separation (Silhouette={sil:.4f})"))
        elif sil > .5:
            notes.append(("info", f"Good separation (Silhouette={sil:.4f})"))
        elif sil > .25:
            notes.append(("warning", "Moderate separation — try different K"))
        else:
            notes.append(("error", "Weak clusters — consider different K or features"))
    except Exception:
        sil = None
    n_comp = min(2, X.shape[1])
    pca = PCA(n_components=n_comp, random_state=42)
    X_2d = pca.fit_transform(X)
    var_exp = pca.explained_variance_ratio_.sum() * 100
    fig2, ax2 = _dark_fig(7, 5)
    pal = plt.cm.tab10.colors
    for c in np.unique(labels):
        mask = labels == c
        ax2.scatter(X_2d[mask, 0], X_2d[mask, 1] if n_comp > 1 else np.zeros(mask.sum()),
                    color=pal[c % 10], label=f"Cluster {c}", alpha=.7, s=25)
    ax2.legend(facecolor="#111827", labelcolor="#9ca3af", fontsize=8)
    ax2.set_title(f"PCA 2D ({var_exp:.1f}% variance)", color="#e5e7eb")
    ax2.set_xlabel("PC1", color="#9ca3af")
    ax2.set_ylabel("PC2", color="#9ca3af")
    plt.tight_layout()
    _emit(figures, fig2, "Cluster Scatter (PCA 2D)", save=False)
    df_out = df[features].copy()
    df_out["Cluster"] = labels
    metrics = {"Method": method, "Sheet": sheet_name,
               "K": n_clusters, "Silhouette": f"{sil:.4f}" if sil else "N/A", "Rows": len(df_out)}
    res.metrics = metrics
    res.model = mdl
    res.extra = {"df_out": df_out, "labels": labels, "silhouette": sil}
    return res


# ─────────────────────────────────────────────────────────────────────────────
# ASSOCIATION RULES
# ─────────────────────────────────────────────────────────────────────────────
def run_association(df, min_support, min_confidence, min_lift, sheet_name: str = "") -> MLResult:
    res = MLResult()
    notes = res.notes
    figures = res.figures

    records = []
    for _, row in df.iterrows():
        items = [str(v).strip() for v in row.dropna().values if str(v).strip()]
        if items:
            records.append(items)
    if not records:
        notes.append(("error", "Could not parse transactional data."))
        res.extra = {"display": None}
        return res
    te = TransactionEncoder()
    te_arr = te.fit_transform(records)
    df_bool = pd.DataFrame(te_arr, columns=te.columns_)
    freq = apriori(df_bool, min_support=min_support, use_colnames=True)
    if freq.empty:
        notes.append(("warning", "No frequent itemsets. Lower min support."))
        res.extra = {"display": None}
        return res
    rules = association_rules(freq, metric="lift", min_threshold=min_lift)
    rules = rules[rules["confidence"] >= min_confidence].sort_values("lift", ascending=False)
    notes.append(("success", f"Found {len(rules)} rules from {len(freq)} frequent itemsets."))
    display = rules[["antecedents", "consequents", "support", "confidence", "lift"]].head(20).copy()
    display["antecedents"] = display["antecedents"].apply(lambda x: ", ".join(list(x)))
    display["consequents"] = display["consequents"].apply(lambda x: ", ".join(list(x)))
    res.tables["rules"] = display
    if not rules.empty:
        fig, ax = _dark_fig(7, 4)
        sc = ax.scatter(rules["support"], rules["confidence"], c=rules["lift"], cmap="plasma", alpha=.8, s=60)
        plt.colorbar(sc, ax=ax, label="Lift")
        ax.set_xlabel("Support", color="#9ca3af")
        ax.set_ylabel("Confidence", color="#9ca3af")
        ax.set_title("Support vs Confidence (color=Lift)", color="#e5e7eb")
        _emit(figures, fig, "Support vs Confidence", save=False)
    metrics = {"Method": "Association Rules", "Sheet": sheet_name,
               "Rules found": len(rules), "Min Support": min_support,
               "Min Confidence": min_confidence, "Min Lift": min_lift}
    res.metrics = metrics
    res.extra = {"display": display}
    return res
