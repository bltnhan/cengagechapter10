"""
core.eda — Generate Exploratory Data Analysis charts as PNG bytes (pure Python).

Extracted from Streamlit.py:render_eda_section() — same matplotlib logic,
but returns dict of PNG bytes instead of calling st.pyplot.
"""
from __future__ import annotations

import io
from typing import Optional

import numpy as np
import pandas as pd

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns


def _fig_to_png(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight",
                facecolor=fig.get_facecolor(), dpi=120)
    buf.seek(0)
    data = buf.read()
    plt.close(fig)
    return data


def _dark_fig(w=6, h=4):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor("#0d1117")
    ax.set_facecolor("#111827")
    ax.tick_params(colors="#9ca3af", labelcolor="#9ca3af")
    for sp in ax.spines.values():
        sp.set_edgecolor("#374151")
    return fig, ax


# ─── Column profile ─────────────────────────────────────────────────────────
def column_profile(df: pd.DataFrame) -> list[dict]:
    """Per-column statistics — type, missing, unique, stats, sample."""
    profile = []
    for col in df.columns:
        miss = int(df[col].isnull().sum())
        miss_p = f"{df[col].isnull().mean():.1%}"
        uniq = int(df[col].nunique())
        sample = str(df[col].dropna().iloc[0]) if df[col].dropna().shape[0] > 0 else ""
        if pd.api.types.is_numeric_dtype(df[col]):
            stats = f"min={df[col].min():.3g} / mean={df[col].mean():.3g} / max={df[col].max():.3g}"
        else:
            top = df[col].value_counts().head(3).index.tolist()
            stats = ", ".join([str(v) for v in top])
        profile.append({
            "column": col, "dtype": str(df[col].dtype),
            "missing": miss, "missing_pct": miss_p, "unique": uniq,
            "stats": stats, "sample": sample[:40],
        })
    return profile


# ─── Distribution charts ────────────────────────────────────────────────────
def distribution_charts(df: pd.DataFrame) -> Optional[bytes]:
    """Histogram grid for numeric columns + bar chart grid for categorical."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not num_cols:
        return None
    cols_p = num_cols[:12]
    n_c = 3
    n_r = max(1, int(np.ceil(len(cols_p) / n_c)))
    fig, axes = plt.subplots(n_r, n_c, figsize=(14, n_r * 3))
    fig.patch.set_facecolor("#0d1117")
    axf = axes.flatten() if n_r * n_c > 1 else [axes]
    for i, col in enumerate(cols_p):
        ax = axf[i]
        ax.set_facecolor("#111827")
        for sp in ax.spines.values():
            sp.set_edgecolor("#374151")
        ax.tick_params(colors="#6b7280", labelsize=7)
        data = df[col].dropna()
        n_bins = min(30, max(10, int(len(data) ** 0.5)))
        ax.hist(data, bins=n_bins, color="#3b82f6", alpha=0.75, edgecolor="#1e40af")
        ax.axvline(data.mean(), color="#f472b6", lw=1.5, linestyle="--")
        ax.set_title(col[:22], color="#e5e7eb", fontsize=8, fontweight="600")
        ax.set_ylabel("Count", color="#6b7280", fontsize=7)
    for j in range(len(cols_p), len(axf)):
        axf[j].set_visible(False)
    plt.tight_layout(pad=1.5)
    return _fig_to_png(fig)


def categorical_charts(df: pd.DataFrame) -> Optional[bytes]:
    """Horizontal bar charts for categorical columns."""
    cat_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()
    cat_p = [c for c in cat_cols if df[c].nunique() <= 30][:6]
    if not cat_p:
        return None
    n_c = min(3, len(cat_p))
    n_r = max(1, int(np.ceil(len(cat_p) / n_c)))
    fig, axes = plt.subplots(n_r, n_c, figsize=(14, n_r * 3.2))
    fig.patch.set_facecolor("#0d1117")
    axf = axes.flatten() if n_r * n_c > 1 else [axes]
    for i, col in enumerate(cat_p):
        ax = axf[i]
        ax.set_facecolor("#111827")
        for sp in ax.spines.values():
            sp.set_edgecolor("#374151")
        vc = df[col].value_counts().head(15)
        colors = plt.cm.Set2(np.linspace(0, 0.8, len(vc)))
        ax.barh(range(len(vc)), vc.values, color=colors, alpha=0.85)
        ax.set_yticks(range(len(vc)))
        ax.set_yticklabels([str(v)[:20] for v in vc.index], fontsize=7, color="#9ca3af")
        ax.tick_params(colors="#6b7280", labelsize=7)
        ax.set_title(col[:22], color="#e5e7eb", fontsize=8, fontweight="600")
        ax.invert_yaxis()
    for j in range(len(cat_p), len(axf)):
        axf[j].set_visible(False)
    plt.tight_layout(pad=1.5)
    return _fig_to_png(fig)


# ─── Correlation heatmap ────────────────────────────────────────────────────
def correlation_heatmap(df: pd.DataFrame) -> Optional[bytes]:
    """Lower-triangle correlation heatmap for numeric columns."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols) < 2:
        return None
    corr = df[num_cols].corr()
    sz = max(6, min(14, len(num_cols) * 0.6))
    fig, ax = plt.subplots(figsize=(sz, sz * 0.85))
    fig.patch.set_facecolor("#0d1117")
    ax.set_facecolor("#111827")
    mask = np.zeros_like(corr, dtype=bool)
    mask[np.triu_indices_from(mask)] = True
    sns.heatmap(corr, mask=mask, annot=len(num_cols) <= 15, fmt=".2f",
                cmap="RdBu_r", center=0, ax=ax, linewidths=0.3,
                linecolor="#1f2937", annot_kws={"size": 7, "color": "white"},
                cbar_kws={"shrink": 0.6})
    ax.set_title("Feature Correlation Matrix (lower triangle)", color="#e5e7eb", pad=10)
    ax.tick_params(colors="#9ca3af", labelsize=8, rotation=45)
    plt.tight_layout()
    return _fig_to_png(fig)


def strong_correlations(df: pd.DataFrame, threshold: float = 0.75) -> list[dict]:
    """Return pairs with |correlation| >= threshold."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols) < 2:
        return []
    corr = df[num_cols].corr()
    pairs = []
    for i in range(len(corr)):
        for j in range(i + 1, len(corr)):
            val = corr.iloc[i, j]
            if abs(val) >= threshold:
                pairs.append({
                    "feature_a": corr.columns[i], "feature_b": corr.columns[j],
                    "correlation": round(float(val), 3),
                    "strength": "strong_90" if abs(val) >= 0.9 else "moderate_75",
                })
    return pairs


# ─── Missing values chart ───────────────────────────────────────────────────
def missing_chart(df: pd.DataFrame) -> Optional[bytes]:
    """Bar chart of missing percentages by column."""
    miss = df.isnull().sum()
    miss = miss[miss > 0].sort_values(ascending=False)
    if miss.empty:
        return None
    fig, ax = _dark_fig(9, max(3, len(miss) * 0.4))
    pcts = miss / len(df) * 100
    colors = ["#ef4444" if p > 30 else "#f59e0b" if p > 10 else "#3b82f6" for p in pcts]
    ax.barh(range(len(miss)), pcts.values, color=colors, alpha=0.85)
    ax.set_yticks(range(len(miss)))
    ax.set_yticklabels(miss.index.tolist(), color="#9ca3af", fontsize=8)
    ax.set_xlabel("Missing %", color="#9ca3af")
    ax.set_title("Missing Values by Column", color="#e5e7eb")
    ax.axvline(30, color="#ef4444", linestyle="--", lw=1, alpha=0.5, label="30% threshold")
    ax.legend(facecolor="#111827", labelcolor="#9ca3af", fontsize=8)
    ax.invert_yaxis()
    plt.tight_layout()
    return _fig_to_png(fig)


# ─── Outlier box plots ──────────────────────────────────────────────────────
def outlier_boxplots(df: pd.DataFrame) -> Optional[bytes]:
    """Box plots for numeric columns showing outliers."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not num_cols:
        return None
    box_cols = num_cols[:10]
    n_c = min(4, len(box_cols))
    n_r = max(1, int(np.ceil(len(box_cols) / n_c)))
    fig, axes = plt.subplots(n_r, n_c, figsize=(13, n_r * 3))
    fig.patch.set_facecolor("#0d1117")
    axf = axes.flatten() if n_r * n_c > 1 else [axes]
    for i, col in enumerate(box_cols):
        ax = axf[i]
        ax.set_facecolor("#111827")
        for sp in ax.spines.values():
            sp.set_edgecolor("#374151")
        ax.boxplot(df[col].dropna(), patch_artist=True,
                   boxprops=dict(facecolor="#1d4ed8", color="#60a5fa"),
                   whiskerprops=dict(color="#60a5fa"),
                   capprops=dict(color="#60a5fa"),
                   medianprops=dict(color="#f472b6", lw=2),
                   flierprops=dict(markerfacecolor="#ef4444", markersize=4, marker="o"))
        ax.set_title(col[:18], color="#e5e7eb", fontsize=8, fontweight="600")
        ax.tick_params(colors="#6b7280", labelsize=7)
    for j in range(len(box_cols), len(axf)):
        axf[j].set_visible(False)
    plt.tight_layout(pad=1.5)
    return _fig_to_png(fig)


# ─── All-in-one EDA ─────────────────────────────────────────────────────────
def generate_eda(df: pd.DataFrame) -> dict:
    """Generate all EDA artifacts. Returns dict of PNG bytes (or None)."""
    return {
        "profile": column_profile(df),
        "distributions": distribution_charts(df),
        "categorical": categorical_charts(df),
        "correlation_heatmap": correlation_heatmap(df),
        "strong_correlations": strong_correlations(df),
        "missing_chart": missing_chart(df),
        "outlier_boxplots": outlier_boxplots(df),
    }
