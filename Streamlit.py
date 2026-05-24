import streamlit as st
import pandas as pd
import numpy as np
import io
import json
import re as _re
import warnings
from collections import Counter
warnings.filterwarnings('ignore')

st.set_page_config(page_title="DataMine AI", page_icon="🧬", layout="wide",
                   initial_sidebar_state="expanded")

# ═══════════════════════════════════════════════════════════════════════════════
# CSS
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

html,body,[class*="css"]{font-family:'Inter',sans-serif;}
.stApp{background:#0a0e1a;color:#f1f5f9;}
.main .block-container{padding:1.2rem 2rem;max-width:1400px;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:#111827;}
::-webkit-scrollbar-thumb{background:#374151;border-radius:3px;}

[data-testid="stSidebar"]{background:#0d1120!important;border-right:1px solid #1f2937;}
h1,h2,h3,h4{color:#f9fafb!important;font-family:'Inter',sans-serif!important;}
[data-testid="stMetricValue"]{color:#f9fafb!important;font-weight:700!important;}
[data-testid="stMetricLabel"]{color:#9ca3af!important;}
.stDataFrame td,.stDataFrame th{color:#e5e7eb!important;background:#111827!important;font-size:.82rem!important;}
.stSelectbox div[data-baseweb="select"],.stMultiSelect div[data-baseweb="select"]{background:#111827!important;color:#f1f5f9!important;border-color:#374151!important;}
div[data-baseweb="option"]{background:#111827!important;color:#f1f5f9!important;}
div[data-baseweb="popover"]{background:#111827!important;border:1px solid #374151!important;}
.stTextInput input,.stTextArea textarea{color:#f1f5f9!important;background:#111827!important;border-color:#374151!important;}
button[data-baseweb="tab"]{color:#9ca3af!important;font-family:'Inter',sans-serif!important;}
button[data-baseweb="tab"][aria-selected="true"]{color:#60a5fa!important;}
[data-testid="stFileUploadDropzone"]{background:#111827!important;border:2px dashed #374151!important;border-radius:12px!important;}
[data-testid="stFileUploadDropzone"]:hover{border-color:#3b82f6!important;}
[data-baseweb="tab-list"]{background:#111827!important;border-radius:8px!important;padding:4px!important;border:1px solid #1f2937!important;}
[data-baseweb="tab"][aria-selected="true"]{background:#1d4ed8!important;}
details{background:#111827!important;border:1px solid #1f2937!important;border-radius:10px!important;}
summary{color:#9ca3af!important;}
.stInfo{background:rgba(59,130,246,.08)!important;border-left-color:#3b82f6!important;}
.stSuccess{background:rgba(16,185,129,.08)!important;border-left-color:#10b981!important;}
.stWarning{background:rgba(245,158,11,.08)!important;border-left-color:#f59e0b!important;}
.stError{background:rgba(239,68,68,.08)!important;border-left-color:#ef4444!important;}

.stButton>button{background:linear-gradient(135deg,#2563eb,#3b82f6)!important;color:white!important;
  border:none!important;border-radius:8px!important;font-family:'Inter',sans-serif!important;
  font-weight:600!important;padding:.45rem 1.3rem!important;transition:all .2s!important;}
.stButton>button:hover{opacity:.85!important;}
.stDownloadButton>button{background:linear-gradient(135deg,#065f46,#10b981)!important;}

.app-header{display:flex;align-items:center;gap:14px;padding:0 0 1.2rem 0;margin-bottom:.8rem;border-bottom:1px solid #1f2937;}
.app-logo{font-size:1.6rem;width:44px;height:44px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);
  border-radius:11px;display:flex;align-items:center;justify-content:center;}
.app-title{font-size:1.45rem;font-weight:700;color:#f9fafb;letter-spacing:-.02em;}
.app-sub{font-size:.78rem;color:#6b7280;margin-top:1px;}
.version-badge{margin-left:auto;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:white;
  font-size:.68rem;font-weight:700;padding:3px 11px;border-radius:20px;letter-spacing:.05em;}

.stepper{display:flex;align-items:center;background:#111827;border:1px solid #1f2937;
  border-radius:14px;padding:14px 24px;margin-bottom:1.5rem;}
.step-item{display:flex;flex-direction:column;align-items:center;gap:5px;flex:0 0 auto;}
.step-circle{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:.78rem;font-weight:700;transition:all .3s;}
.sc-p{background:#1f2937;color:#4b5563;border:2px solid #374151;}
.sc-a{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;border:2px solid #3b82f6;box-shadow:0 0 14px rgba(59,130,246,.4);}
.sc-d{background:linear-gradient(135deg,#065f46,#10b981);color:#fff;border:2px solid #10b981;}
.step-lbl{font-size:.68rem;font-weight:600;letter-spacing:.03em;white-space:nowrap;}
.sl-p{color:#4b5563;}.sl-a{color:#60a5fa;}.sl-d{color:#34d399;}
.step-conn{flex:1;height:2px;margin:0 6px;margin-bottom:18px;border-radius:1px;}
.sc-conn-d{background:linear-gradient(90deg,#10b981,#059669);}
.sc-conn-p{background:#1f2937;}

.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1rem;}
.stat-card{background:#111827;border:1px solid #1f2937;border-radius:11px;padding:14px 18px;}
.stat-val{font-size:1.5rem;font-weight:700;font-family:'JetBrains Mono',monospace;}
.stat-lbl{font-size:.72rem;color:#6b7280;margin-top:3px;letter-spacing:.04em;text-transform:uppercase;}
.sv-blue{color:#60a5fa;}.sv-green{color:#34d399;}.sv-red{color:#f87171;}.sv-amber{color:#fbbf24;}.sv-gray{color:#9ca3af;}

.sec-hdr{display:flex;align-items:center;gap:10px;margin:1.4rem 0 .9rem;padding-bottom:9px;border-bottom:1px solid #1f2937;}
.sec-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.9rem;}
.si-blue{background:rgba(59,130,246,.15);}.si-green{background:rgba(16,185,129,.15);}
.si-purple{background:rgba(124,58,237,.15);}.si-amber{background:rgba(245,158,11,.15);}
.sec-title{font-size:.92rem;font-weight:700;color:#f1f5f9;}
.sec-sub{font-size:.72rem;color:#6b7280;margin-left:auto;}

.card{background:#111827;border:1px solid #1f2937;border-radius:11px;padding:16px 18px;margin-bottom:10px;}

.prob-row{display:flex;align-items:flex-start;gap:8px;padding:8px 11px;border-radius:8px;margin-bottom:5px;background:#0f1629;border:1px solid #1f2937;}
.prob-chip{padding:2px 8px;border-radius:5px;font-size:.67rem;font-weight:700;letter-spacing:.06em;white-space:nowrap;font-family:'JetBrains Mono',monospace;}
.pc-err{background:rgba(239,68,68,.2);color:#f87171;}
.pc-warn{background:rgba(245,158,11,.2);color:#fbbf24;}
.pc-info{background:rgba(59,130,246,.2);color:#60a5fa;}
.pc-ok{background:rgba(16,185,129,.2);color:#34d399;}
.prob-txt{font-size:.81rem;color:#d1d5db;flex:1;}
.prob-fix{font-size:.72rem;color:#6b7280;font-style:italic;}

.method-card{background:#111827;border:1px solid #1f2937;border-radius:10px;padding:11px 13px;margin-bottom:4px;}
.method-card.sel{border-color:#3b82f6;background:#0f1f3d;}
.method-name{font-size:.83rem;font-weight:600;color:#f1f5f9;}
.method-vn{font-size:.7rem;color:#6b7280;margin-top:1px;}
.method-desc{font-size:.71rem;color:#9ca3af;margin-top:5px;line-height:1.4;}
.mbadge{display:inline-block;padding:1px 7px;border-radius:4px;font-size:.65rem;font-weight:700;margin-bottom:3px;}
.mb-clf{background:rgba(59,130,246,.2);color:#60a5fa;}
.mb-pred{background:rgba(124,58,237,.2);color:#a78bfa;}
.mb-clus{background:rgba(16,185,129,.2);color:#34d399;}
.mb-assoc{background:rgba(239,68,68,.2);color:#f87171;}
.mb-bal{background:rgba(245,158,11,.2);color:#fbbf24;}

.ai-box{background:#0d1829;border:1px solid #1e3a5f;border-radius:12px;padding:16px 18px;margin:10px 0;}
.ai-hdr{font-size:.78rem;font-weight:700;color:#60a5fa;margin-bottom:10px;display:flex;align-items:center;gap:7px;}
.ai-text{color:#d1d5db;font-size:.85rem;line-height:1.8;white-space:pre-wrap;word-break:break-word;}
.ai-dot{width:7px;height:7px;background:#3b82f6;border-radius:50%;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}

.log-item{background:rgba(16,185,129,.05);border-left:3px solid #10b981;padding:5px 11px;border-radius:0 6px 6px 0;margin-bottom:4px;font-size:.79rem;color:#d1d5db;}
.log-item b{color:#34d399;}
.diff-before{background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.25);border-radius:9px;padding:10px 14px;}
.diff-after{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.25);border-radius:9px;padding:10px 14px;}
.diff-label{font-size:.75rem;font-weight:700;margin-bottom:6px;}
.dl-red{color:#f87171;}.dl-green{color:#34d399;}

.sb-step{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:8px;margin-bottom:2px;}
.sb-step-a{background:rgba(59,130,246,.12);}
.sb-num{width:20px;height:20px;border-radius:50%;font-size:.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;}
.sn-done{background:rgba(16,185,129,.2);color:#34d399;}
.sn-active{background:rgba(59,130,246,.2);color:#60a5fa;}
.sn-pend{background:#1f2937;color:#4b5563;}
.sb-txt{font-size:.8rem;font-weight:500;}
.sbt-a{color:#93c5fd;}.sbt-d{color:#6ee7b7;}.sbt-p{color:#4b5563;}

.chart-title{font-size:.82rem;font-weight:600;color:#e5e7eb;margin-bottom:4px;}
.chart-cap{font-size:.71rem;color:#6b7280;margin-top:3px;font-style:italic;}

.welcome{background:linear-gradient(135deg,#0f1f3d,#150f2d);border:1px solid #1e3a5f;border-radius:14px;padding:28px 32px;margin-bottom:1.5rem;}
.welcome h2{font-size:1.6rem!important;background:linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px!important;}
.welcome p{color:#9ca3af;font-size:.88rem;line-height:1.7;}
.step-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:16px;}
.step-list-item{background:rgba(255,255,255,.03);border:1px solid #1f2937;border-radius:9px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;}
.sli-num{font-size:.75rem;font-weight:700;color:#60a5fa;font-family:'JetBrains Mono',monospace;background:rgba(59,130,246,.1);border-radius:5px;padding:2px 7px;white-space:nowrap;}
.sli-text{font-size:.8rem;color:#9ca3af;line-height:1.5;}
.sli-text b{color:#e5e7eb;display:block;margin-bottom:2px;}

/* ── Smart Advisor ── */
.quiz-card{background:#0f1629;border:1px solid #1e3a5f;border-radius:11px;padding:14px 18px;margin-bottom:10px;}
.quiz-q{font-size:.87rem;font-weight:600;color:#f1f5f9;margin-bottom:8px;}
.quiz-hint{font-size:.72rem;color:#6b7280;margin-top:-5px;margin-bottom:9px;}
.decision-path{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:8px 0;padding:9px 12px;background:#0a0e1a;border-radius:8px;border:1px solid #1f2937;}
.dp-node{padding:3px 9px;border-radius:5px;font-size:.71rem;font-weight:600;}
.dp-blue{background:rgba(59,130,246,.15);color:#60a5fa;}.dp-green{background:rgba(16,185,129,.15);color:#34d399;}
.dp-purple{background:rgba(124,58,237,.15);color:#a78bfa;}.dp-amber{background:rgba(245,158,11,.15);color:#fbbf24;}
.dp-arrow{color:#374151;font-size:.8rem;}
.rec-item{display:flex;align-items:flex-start;gap:9px;padding:8px 10px;border-radius:8px;margin-bottom:5px;}
.ri-prereq{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);}
.ri-primary{background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.22);}
.ri-alt{background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.18);}
.ri-opt{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.15);}
.rec-badge{padding:2px 8px;border-radius:5px;font-size:.64rem;font-weight:700;white-space:nowrap;flex-shrink:0;}
.rb-pre{background:rgba(245,158,11,.2);color:#fbbf24;}.rb-pri{background:rgba(59,130,246,.2);color:#60a5fa;}
.rb-alt{background:rgba(124,58,237,.2);color:#a78bfa;}.rb-opt{background:rgba(16,185,129,.2);color:#34d399;}
.rec-name{font-size:.83rem;font-weight:600;color:#f1f5f9;}
.rec-why{font-size:.72rem;color:#9ca3af;margin-top:2px;line-height:1.4;}

/* ── Category cards ── */
.cat-card{border-radius:11px;padding:14px 16px;margin-bottom:8px;}

/* ── Fitness Report ── */
.fitness-card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px 18px;}
.fitness-grade{font-size:2.2rem;font-weight:900;font-family:'JetBrains Mono',monospace;line-height:1;}
.fg-A{color:#34d399;}.fg-B{color:#60a5fa;}.fg-C{color:#fbbf24;}.fg-D{color:#f87171;}
.fitness-method{font-size:.85rem;font-weight:700;color:#f1f5f9;margin:4px 0 2px;}
.fitness-score{font-size:.77rem;color:#6b7280;margin-bottom:8px;font-family:'JetBrains Mono',monospace;}
.fitness-verdict{font-size:.77rem;padding:5px 10px;border-radius:6px;margin-bottom:8px;font-weight:600;}
.fv-A{background:rgba(16,185,129,.1);color:#34d399;border:1px solid rgba(16,185,129,.25);}
.fv-B{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.25);}
.fv-C{background:rgba(245,158,11,.1);color:#fbbf24;border:1px solid rgba(245,158,11,.25);}
.fv-D{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.25);}
.fitness-bar-wrap{background:#1f2937;border-radius:4px;height:5px;margin:5px 0 8px;}
.fitness-bar{border-radius:4px;height:5px;transition:width .5s ease;}
.fb-A{background:linear-gradient(90deg,#10b981,#34d399);}
.fb-B{background:linear-gradient(90deg,#2563eb,#60a5fa);}
.fb-C{background:linear-gradient(90deg,#d97706,#fbbf24);}
.fb-D{background:linear-gradient(90deg,#dc2626,#f87171);}
.fitness-advice{font-size:.75rem;color:#9ca3af;line-height:1.55;}
</style>
""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# ML IMPORTS
# ═══════════════════════════════════════════════════════════════════════════════
import google.generativeai as genai
import requests as _requests
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.naive_bayes import GaussianNB
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
from imblearn.over_sampling import RandomOverSampler, SMOTE
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.cluster.hierarchy import dendrogram, linkage

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════
_DEFAULT_GEMINI_KEY = ""
_GEMINI_CANDIDATES  = ["gemini-2.5-flash","gemini-2.0-flash","gemini-2.0-flash-lite"]
_OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
_OPENROUTER_MODELS  = ["openrouter/auto","google/gemma-3-27b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","qwen/qwq-32b:free"]

METHODS = {
    "Logistic Regression":{"group":"classification","badge":"mb-clf","vn":"Phân loại cơ bản",
        "desc":"Probabilistic S-curve classifier. Interpretable coefficients. Great baseline."},
    "Linear Discriminant Analysis (LDA)":{"group":"classification","badge":"mb-clf","vn":"Phân tích biệt thức",
        "desc":"Maximises class separation. Works best with equal class covariance."},
    "K-Nearest Neighbors (KNN)":{"group":"classification","badge":"mb-clf","vn":"Phân loại láng giềng",
        "desc":"Labels from K closest samples. Non-parametric, interpretable."},
    "Classification Trees":{"group":"classification","badge":"mb-clf","vn":"Cây quyết định",
        "desc":"Builds IF-THEN rules to split data. Human-readable output."},
    "Naive Bayes":{"group":"classification","badge":"mb-clf","vn":"Dự báo xác suất",
        "desc":"Bayes theorem with independence assumption. Very fast on sparse data."},
    "Support Vector Machine (SVM)":{"group":"classification","badge":"mb-clf","vn":"Phân loại biên giới",
        "desc":"Maximum-margin hyperplane. Powerful in high-dimensional spaces."},
    "Random Forest":{"group":"classification","badge":"mb-clf","vn":"Rừng ngẫu nhiên",
        "desc":"Ensemble of 100 trees. Robust, accurate, feature importance ranking."},
    "Neural Networks (MLP)":{"group":"classification","badge":"mb-clf","vn":"Mạng nơ-ron",
        "desc":"Multi-layer perceptron for complex non-linear patterns."},
    "Linear Regression":{"group":"prediction","badge":"mb-pred","vn":"Hồi quy tuyến tính",
        "desc":"Linear relationship between features and continuous target."},
    "Neural Networks Regression (MLP)":{"group":"prediction","badge":"mb-pred","vn":"Mạng nơ-ron hồi quy",
        "desc":"MLP for continuous value prediction via non-linear transformations."},
    "Association Rules (Apriori)":{"group":"association","badge":"mb-assoc","vn":"Luật kết hợp",
        "desc":"IF-THEN patterns in transactional data. Support, confidence, lift."},
    "K-Means Clustering":{"group":"association","badge":"mb-clus","vn":"Phân cụm K-Means",
        "desc":"Groups data into K clusters by minimising intra-cluster variance."},
    "Hierarchical Clustering":{"group":"association","badge":"mb-clus","vn":"Phân cụm phân cấp",
        "desc":"Dendrogram of nested clusters. No K needed upfront."},
    "Random Oversampling":{"group":"balancing","badge":"mb-bal","vn":"Cân bằng ngẫu nhiên",
        "desc":"Replicates minority samples to fix class imbalance."},
    "SMOTE":{"group":"balancing","badge":"mb-bal","vn":"Cân bằng tổng hợp",
        "desc":"Synthetic minority samples by interpolation between existing ones."},
}
GROUP_META = {
    "classification":{"label":"Classification","color":"#60a5fa","icon":"🔵"},
    "prediction":    {"label":"Prediction / Regression","color":"#a78bfa","icon":"🟣"},
    "association":   {"label":"Clustering & Association","color":"#f472b6","icon":"🔴"},
    "balancing":     {"label":"Class Balancing","color":"#fbbf24","icon":"🟡"},
}

# ═══════════════════════════════════════════════════════════════════════════════
# BACKEND HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def _df_to_json(df):
    buf=io.StringIO(); df.to_json(buf,orient="split"); return buf.getvalue()

def _json_to_df(s):
    return pd.read_json(io.StringIO(s),orient="split")

def load_file(uploaded):
    name=uploaded.name; sheets={}
    try:
        if name.endswith(".csv"):
            sheets[name]=pd.read_csv(uploaded)
        elif name.endswith((".xlsx",".xls")):
            xf=pd.ExcelFile(uploaded)
            for s in xf.sheet_names:
                df=pd.read_excel(xf,sheet_name=s)
                if not df.empty: sheets[f"{name}::{s}"]=df
        elif name.endswith(".json"):
            sheets[name]=pd.read_json(uploaded)
        elif name.endswith(".txt"):
            sheets[name]=pd.read_csv(uploaded,sep=None,engine="python")
        else:
            sheets[name]=pd.read_csv(uploaded)
    except Exception as e:
        st.error(f"Error loading {name}: {e}")
    return sheets

def df_summary(df,name=""):
    lines=[f"File: {name}" if name else ""]
    lines.append(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
    lines.append(f"Columns: {', '.join(df.columns.tolist())}")
    lines.append(f"Missing: {df.isnull().sum().sum()} total ({df.isnull().mean().mean():.1%})")
    lines.append(f"Dtypes: {dict(df.dtypes.value_counts())}")
    lines.append("Sample stats:"); lines.append(df.describe(include="all").to_string())
    return "\n".join(lines)

def encode_df(df):
    df=df.copy(); le=LabelEncoder()
    for col in df.select_dtypes(include=["object","string"]).columns:
        df[col]=le.fit_transform(df[col].astype(str))
    return df

def fig_to_st(fig): st.pyplot(fig); plt.close(fig)

def _clean_ai(text):
    t=_re.sub(r"\*{1,3}(.*?)\*{1,3}",r"\1",text)
    t=_re.sub(r"^#+\s*","",t,flags=_re.MULTILINE)
    t=_re.sub(r"^[-•]\s+","  ",t,flags=_re.MULTILINE)
    t=_re.sub(r"`{1,3}","",t); t=_re.sub(r"\n{3,}","\n\n",t)
    return t.strip()

def _safe_html(s): return s.replace("<","&lt;").replace(">","&gt;")

def render_ai_box(text,label="🤖 AI Analysis"):
    clean=_clean_ai(text)
    st.markdown(
        f'<div class="ai-box"><div class="ai-hdr"><div class="ai-dot"></div>{label}</div>'
        f'<div class="ai-text">{_safe_html(clean)}</div></div>',
        unsafe_allow_html=True)

def _get_keys():
    # Pull from sidebar input first, fall back to Streamlit Cloud secrets
    g=st.session_state.get("gemini_key","").strip()
    o=st.session_state.get("openrouter_key","").strip()
    if not g:
        try: g=st.secrets.get("GEMINI_KEY","")
        except Exception: g=""
    if not o:
        try: o=st.secrets.get("OPENROUTER_KEY","")
        except Exception: o=""
    return g or _DEFAULT_GEMINI_KEY,o

def _call_openrouter(prompt,or_key):
    if not or_key: return ""
    headers={"Authorization":f"Bearer {or_key}","Content-Type":"application/json",
             "HTTP-Referer":"https://datamine-ai.streamlit.app","X-Title":"DataMine AI"}
    for model in _OPENROUTER_MODELS:
        try:
            resp=_requests.post(_OPENROUTER_URL,headers=headers,
                json={"model":model,"messages":[{"role":"user","content":prompt}],
                      "max_tokens":2000,"temperature":0.7},timeout=120)
            if resp.status_code==401: return "__OR_FAIL__: Invalid key."
            data=resp.json()
            if "choices" in data and data["choices"]:
                return data["choices"][0]["message"]["content"]
        except Exception: continue
    return ""

def ask_ai(prompt):
    gemini_key,or_key=_get_keys()
    for model_name in _GEMINI_CANDIDATES:
        try:
            genai.configure(api_key=gemini_key)
            mdl=genai.GenerativeModel(model_name)
            resp=mdl.generate_content(prompt)
            return resp.text
        except Exception: continue
    if or_key:
        result=_call_openrouter(prompt,or_key)
        if result and not result.startswith("__OR_FAIL__"): return result
    return "⚠️ No AI key set or all models failed. Paste a Gemini or OpenRouter key in the sidebar."

# ═══════════════════════════════════════════════════════════════════════════════
# DATA PREP
# ═══════════════════════════════════════════════════════════════════════════════
@st.cache_data(show_spinner=False)
def detect_problems(df_json):
    df=_json_to_df(df_json); n=len(df); problems=[]
    for col in df.columns:
        pct=df[col].isnull().mean()
        if pct>0:
            dtype="numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical"
            problems.append({"col":col,"type":"missing","sev":"err" if pct>.3 else "warn",
                "msg":f'Column "{col}" — {pct:.1%} missing ({int(pct*n)} rows)',
                "fix":f"Fill with {'mean' if dtype=='numeric' else 'mode'}","dtype":dtype})
    for col in df.select_dtypes(include=[np.number]).columns:
        q1,q3=df[col].quantile(.25),df[col].quantile(.75); iqr=q3-q1
        if iqr>0:
            n_out=((df[col]<q1-3*iqr)|(df[col]>q3+3*iqr)).sum()
            if n_out>0:
                problems.append({"col":col,"type":"outlier","sev":"warn",
                    "msg":f'Column "{col}" — {n_out} extreme outliers ({n_out/n:.1%})',
                    "fix":"Cap to 3×IQR (Winsorize)","dtype":"numeric"})
    for col in df.select_dtypes(include=["object","string"]).columns:
        problems.append({"col":col,"type":"encoding","sev":"info",
            "msg":f'Column "{col}" is text — needs encoding for ML',"fix":"Label Encoding","dtype":"cat"})
    dups=df.duplicated().sum()
    if dups>0:
        problems.append({"col":"ALL","type":"duplicate","sev":"warn",
            "msg":f"{dups} duplicate rows ({dups/n:.1%})","fix":"Remove duplicates","dtype":"row"})
    num_cols=df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols)>1:
        rng=df[num_cols].max()-df[num_cols].min()
        if rng.max()>0 and (rng.max()/(rng.min()+1e-9))>100:
            problems.append({"col":"NUMERIC","type":"scale","sev":"info",
                "msg":"Numeric columns have very different scales — scaling recommended",
                "fix":"StandardScaler (auto-applied at training)","dtype":"numeric"})
    if not problems:
        problems.append({"col":"","type":"ok","sev":"ok",
            "msg":"No major data problems detected — dataset looks clean!","fix":"","dtype":""})
    return problems

@st.cache_data(show_spinner=False)
def fix_missing(df_json):
    df=_json_to_df(df_json); before=df.isnull().sum().sum()
    for col in df.columns:
        if df[col].isnull().any():
            if pd.api.types.is_numeric_dtype(df[col]): df[col]=df[col].fillna(df[col].mean())
            else:
                m=df[col].mode(); df[col]=df[col].fillna(m[0] if len(m) else "Unknown")
    return _df_to_json(df),f"Fixed {before-df.isnull().sum().sum()} missing values."

@st.cache_data(show_spinner=False)
def fix_duplicates(df_json):
    df=_json_to_df(df_json); before=len(df); df=df.drop_duplicates()
    return _df_to_json(df),f"Removed {before-len(df)} duplicates. {len(df):,} rows remain."

@st.cache_data(show_spinner=False)
def fix_outliers(df_json):
    df=_json_to_df(df_json); capped=0
    for col in df.select_dtypes(include=[np.number]).columns:
        q1,q3=df[col].quantile(.25),df[col].quantile(.75); iqr=q3-q1
        if iqr>0:
            lo,hi=q1-3*iqr,q3+3*iqr
            capped+=((df[col]<lo)|(df[col]>hi)).sum(); df[col]=df[col].clip(lower=lo,upper=hi)
    return _df_to_json(df),f"Capped {capped} extreme outlier values (3×IQR)."

@st.cache_data(show_spinner=False)
def fix_encode(df_json):
    df=_json_to_df(df_json)
    text_cols=df.select_dtypes(include=["object","string"]).columns.tolist()
    if not text_cols: return _df_to_json(df),"No text columns to encode.",{}
    mapping={}; le=LabelEncoder()
    for col in text_cols:
        le.fit(df[col].astype(str))
        mapping[col]={str(c):int(i) for i,c in enumerate(le.classes_)}
        df[col]=le.transform(df[col].astype(str))
    return _df_to_json(df),f"Label-encoded {len(text_cols)} column(s): {', '.join(text_cols)}.",mapping

def suggest_target(df):
    kws=["label","target","class","churn","default","outcome","result","status",
         "output","dependent","response","predict","category","nhãn"]
    for col in df.columns:
        if any(k in col.lower().replace(" ","_") for k in kws): return col
    last=df.columns[-1]
    return last if df[last].nunique()<=20 else None

# ═══════════════════════════════════════════════════════════════════════════════
# ML RUNNERS
# ═══════════════════════════════════════════════════════════════════════════════
def _dark_fig(w=6,h=4):
    fig,ax=plt.subplots(figsize=(w,h))
    fig.patch.set_facecolor('#0d1117'); ax.set_facecolor('#111827')
    ax.tick_params(colors='#9ca3af',labelcolor='#9ca3af')
    for sp in ax.spines.values(): sp.set_edgecolor('#374151')
    return fig,ax

def run_classification(method,df,target,features,test_size,balance):
    df_enc=encode_df(df[features+[target]].dropna())
    X=StandardScaler().fit_transform(df_enc[features].values); y=df_enc[target].values
    if balance=="Random Oversampling":
        X,y=RandomOverSampler(random_state=42).fit_resample(X,y); st.info("✅ Applied Random Oversampling.")
    elif balance=="SMOTE":
        try: X,y=SMOTE(random_state=42).fit_resample(X,y); st.info("✅ Applied SMOTE.")
        except Exception as e: st.warning(f"SMOTE skipped: {e}")
    X_tr,X_te,y_tr,y_te=train_test_split(X,y,test_size=test_size,random_state=42)
    models={
        "Logistic Regression":LogisticRegression(max_iter=1000),
        "Linear Discriminant Analysis (LDA)":LinearDiscriminantAnalysis(),
        "K-Nearest Neighbors (KNN)":KNeighborsClassifier(),
        "Classification Trees":DecisionTreeClassifier(max_depth=5),
        "Naive Bayes":GaussianNB(),
        "Support Vector Machine (SVM)":SVC(probability=True),
        "Random Forest":RandomForestClassifier(n_estimators=100,random_state=42),
        "Neural Networks (MLP)":MLPClassifier(max_iter=500,random_state=42),
    }
    mdl=models[method]; mdl.fit(X_tr,y_tr); y_pred=mdl.predict(X_te)
    acc=accuracy_score(y_te,y_pred); is_bin=len(np.unique(y))==2; avg="binary" if is_bin else "weighted"
    prec=precision_score(y_te,y_pred,average=avg,zero_division=0)
    rec=recall_score(y_te,y_pred,average=avg,zero_division=0)
    f1=f1_score(y_te,y_pred,average=avg,zero_division=0)
    try:
        auc=roc_auc_score(y_te,mdl.predict_proba(X_te)[:,1] if is_bin else mdl.predict_proba(X_te),
            multi_class="ovr" if not is_bin else "raise",average="weighted" if not is_bin else None)
    except Exception: auc=None
    metrics={"Method":method,"Sheet":st.session_state.get("active_sheet",""),
             "Accuracy":f"{acc:.4f}","Precision":f"{prec:.4f}","Recall":f"{rec:.4f}",
             "F1-Score":f"{f1:.4f}","AUC":f"{auc:.4f}" if auc else "N/A",
             "Train rows":len(X_tr),"Test rows":len(X_te)}
    c1,c2,c3,c4=st.columns(4)
    c1.metric("Accuracy",f"{acc:.2%}"); c2.metric("F1",f"{f1:.4f}")
    c3.metric("AUC",f"{auc:.4f}" if auc else "N/A"); c4.metric("Precision",f"{prec:.4f}")
    with st.expander("📋 Full classification report",expanded=False):
        st.text(classification_report(y_te,y_pred))
    col_a,col_b=st.columns(2)
    with col_a:
        st.markdown('<div class="chart-title">Confusion Matrix</div>',unsafe_allow_html=True)
        fig,ax=_dark_fig(5,4)
        sns.heatmap(confusion_matrix(y_te,y_pred),annot=True,fmt='d',cmap='Blues',ax=ax,
                    linewidths=.5,linecolor='#374151',annot_kws={"color":"#fff","size":12})
        ax.set_title("Confusion Matrix",color='#e5e7eb')
        ax.set_xlabel("Predicted",color='#9ca3af'); ax.set_ylabel("Actual",color='#9ca3af')
        fig_to_st(fig)
        st.markdown('<div class="chart-cap">Large diagonal = correct predictions. Off-diagonal = errors.</div>',unsafe_allow_html=True)
    with col_b:
        if is_bin and hasattr(mdl,"predict_proba"):
            st.markdown('<div class="chart-title">ROC Curve</div>',unsafe_allow_html=True)
            try:
                fpr,tpr,_=roc_curve(y_te,mdl.predict_proba(X_te)[:,1])
                fig2,ax2=_dark_fig(5,4)
                ax2.plot(fpr,tpr,color='#3b82f6',lw=2,label=f"AUC={auc:.3f}" if auc else "ROC")
                ax2.plot([0,1],[0,1],'r--',lw=1,label="Random")
                ax2.set_xlabel("FPR",color='#9ca3af'); ax2.set_ylabel("TPR",color='#9ca3af')
                ax2.set_title("ROC Curve",color='#e5e7eb')
                ax2.legend(facecolor='#111827',labelcolor='#9ca3af'); fig_to_st(fig2)
                st.markdown('<div class="chart-cap">Curve near top-left = strong model. Near diagonal = weak.</div>',unsafe_allow_html=True)
            except Exception: pass
    if hasattr(mdl,"feature_importances_") or hasattr(mdl,"coef_"):
        st.markdown('<div class="chart-title">Feature Importance</div>',unsafe_allow_html=True)
        if hasattr(mdl,"feature_importances_"):
            fi=pd.Series(mdl.feature_importances_,index=features).sort_values(ascending=False)
        else:
            fi=pd.Series(np.abs(mdl.coef_[0] if mdl.coef_.ndim>1 else mdl.coef_),index=features).sort_values(ascending=False)
        fig3,ax3=_dark_fig(7,max(3,min(12,len(fi))*.35))
        fi.head(15).plot(kind='barh',ax=ax3,color='#3b82f6')
        ax3.set_title("Top 15 Features",color='#e5e7eb'); ax3.invert_yaxis()
        plt.tight_layout(); fig_to_st(fig3)
    if method=="Classification Trees":
        with st.expander("🌿 Decision Tree Rules",expanded=False):
            st.code(export_text(mdl,feature_names=features,max_depth=4),language="")
    return metrics,mdl,X_te,y_te,y_pred

def run_regression(method,df,target,features,test_size):
    df_enc=encode_df(df[features+[target]].dropna())
    X=StandardScaler().fit_transform(df_enc[features].values); y=df_enc[target].values
    X_tr,X_te,y_tr,y_te=train_test_split(X,y,test_size=test_size,random_state=42)
    mdl=LinearRegression() if method=="Linear Regression" else MLPRegressor(max_iter=500,random_state=42)
    mdl.fit(X_tr,y_tr); y_pred=mdl.predict(X_te)
    mse=mean_squared_error(y_te,y_pred); r2=r2_score(y_te,y_pred); residuals=y_te-y_pred
    metrics={"Method":method,"Sheet":st.session_state.get("active_sheet",""),
             "R²":f"{r2:.4f}","RMSE":f"{np.sqrt(mse):.4f}","Train rows":len(X_tr),"Test rows":len(X_te)}
    c1,c2=st.columns(2); c1.metric("R² Score",f"{r2:.4f}"); c2.metric("RMSE",f"{np.sqrt(mse):.4f}")
    if r2>=.7: st.success(f"R²={r2:.4f} — Good fit ({r2:.1%} variance explained).")
    elif r2>=.4: st.warning(f"R²={r2:.4f} — Moderate. Consider adding features.")
    else: st.error(f"R²={r2:.4f} — Weak fit.")
    col_a,col_b=st.columns(2)
    with col_a:
        st.markdown('<div class="chart-title">Actual vs Predicted</div>',unsafe_allow_html=True)
        fig,ax=_dark_fig(5,4)
        ax.scatter(y_te,y_pred,alpha=.5,color='#3b82f6',s=20)
        mn,mx=min(y_te.min(),y_pred.min()),max(y_te.max(),y_pred.max())
        ax.plot([mn,mx],[mn,mx],'r--',lw=1.5)
        ax.set_xlabel("Actual",color='#9ca3af'); ax.set_ylabel("Predicted",color='#9ca3af')
        ax.set_title("Actual vs Predicted",color='#e5e7eb'); fig_to_st(fig)
    with col_b:
        st.markdown('<div class="chart-title">Residual Plot</div>',unsafe_allow_html=True)
        fig2,ax2=_dark_fig(5,4)
        ax2.scatter(y_pred,residuals,alpha=.5,color='#a78bfa',s=20)
        ax2.axhline(0,color='#ef4444',linestyle='--',lw=1.5)
        ax2.set_xlabel("Predicted",color='#9ca3af'); ax2.set_ylabel("Residual",color='#9ca3af')
        ax2.set_title("Residual Plot",color='#e5e7eb'); fig_to_st(fig2)
    return metrics

def run_clustering(method,df,features,n_clusters):
    df_enc=encode_df(df[features].dropna()); X=StandardScaler().fit_transform(df_enc.values)
    if method=="K-Means Clustering":
        mdl=KMeans(n_clusters=n_clusters,random_state=42,n_init=10); labels=mdl.fit_predict(X)
        k_range=range(2,min(11,len(X))); inertias=[]
        for k in k_range:
            km=KMeans(n_clusters=k,random_state=42,n_init=10); km.fit(X); inertias.append(km.inertia_)
        st.markdown('<div class="chart-title">Elbow Curve</div>',unsafe_allow_html=True)
        fig,ax=_dark_fig(6,3)
        ax.plot(list(k_range),inertias,'o-',color='#3b82f6',lw=2)
        ax.axvline(n_clusters,color='#f472b6',linestyle='--',lw=1.5,label=f"K={n_clusters}")
        ax.set_title("Elbow Curve",color='#e5e7eb'); ax.set_xlabel("K",color='#9ca3af'); ax.set_ylabel("Inertia",color='#9ca3af')
        ax.legend(facecolor='#111827',labelcolor='#9ca3af'); fig_to_st(fig)
    else:
        mdl=AgglomerativeClustering(n_clusters=n_clusters); labels=mdl.fit_predict(X)
        st.markdown('<div class="chart-title">Dendrogram</div>',unsafe_allow_html=True)
        linked=linkage(X[:min(200,len(X))],method='ward')
        fig,ax=_dark_fig(8,4)
        dendrogram(linked,ax=ax,color_threshold=0,above_threshold_color='#3b82f6',leaf_font_size=6)
        ax.set_title("Dendrogram (sample 200)",color='#e5e7eb'); plt.tight_layout(); fig_to_st(fig)
    try:
        sil=silhouette_score(X,labels); st.metric("Silhouette Score",f"{sil:.4f}")
        if sil>.7: st.success(f"Excellent separation (Silhouette={sil:.4f})")
        elif sil>.5: st.info(f"Good separation (Silhouette={sil:.4f})")
        elif sil>.25: st.warning("Moderate separation — try different K")
        else: st.error("Weak clusters — consider different K or features")
    except Exception: sil=None
    st.markdown('<div class="chart-title">Cluster Scatter (PCA 2D)</div>',unsafe_allow_html=True)
    n_comp=min(2,X.shape[1]); pca=PCA(n_components=n_comp,random_state=42); X_2d=pca.fit_transform(X)
    var_exp=pca.explained_variance_ratio_.sum()*100
    fig2,ax2=_dark_fig(7,5); pal=plt.cm.tab10.colors
    for c in np.unique(labels):
        mask=labels==c
        ax2.scatter(X_2d[mask,0],X_2d[mask,1] if n_comp>1 else np.zeros(mask.sum()),
                    color=pal[c%10],label=f"Cluster {c}",alpha=.7,s=25)
    ax2.legend(facecolor='#111827',labelcolor='#9ca3af',fontsize=8)
    ax2.set_title(f"PCA 2D ({var_exp:.1f}% variance)",color='#e5e7eb')
    ax2.set_xlabel("PC1",color='#9ca3af'); ax2.set_ylabel("PC2",color='#9ca3af')
    plt.tight_layout(); fig_to_st(fig2)
    df_out=df[features].copy(); df_out["Cluster"]=labels
    metrics={"Method":method,"Sheet":st.session_state.get("active_sheet",""),
             "K":n_clusters,"Silhouette":f"{sil:.4f}" if sil else "N/A","Rows":len(df_out)}
    return metrics,df_out

def run_association(df,min_support,min_confidence,min_lift):
    records=[]
    for _,row in df.iterrows():
        items=[str(v).strip() for v in row.dropna().values if str(v).strip()]
        if items: records.append(items)
    if not records: st.error("Could not parse transactional data."); return None,None
    te=TransactionEncoder(); te_arr=te.fit_transform(records)
    df_bool=pd.DataFrame(te_arr,columns=te.columns_)
    freq=apriori(df_bool,min_support=min_support,use_colnames=True)
    if freq.empty: st.warning("No frequent itemsets. Lower min support."); return None,None
    rules=association_rules(freq,metric="lift",min_threshold=min_lift)
    rules=rules[rules["confidence"]>=min_confidence].sort_values("lift",ascending=False)
    st.success(f"Found {len(rules)} rules from {len(freq)} frequent itemsets.")
    display=rules[["antecedents","consequents","support","confidence","lift"]].head(20).copy()
    display["antecedents"]=display["antecedents"].apply(lambda x:", ".join(list(x)))
    display["consequents"]=display["consequents"].apply(lambda x:", ".join(list(x)))
    st.dataframe(display,use_container_width=True)
    if not rules.empty:
        fig,ax=_dark_fig(7,4)
        sc=ax.scatter(rules["support"],rules["confidence"],c=rules["lift"],cmap="plasma",alpha=.8,s=60)
        plt.colorbar(sc,ax=ax,label="Lift")
        ax.set_xlabel("Support",color='#9ca3af'); ax.set_ylabel("Confidence",color='#9ca3af')
        ax.set_title("Support vs Confidence (color=Lift)",color='#e5e7eb'); fig_to_st(fig)
    metrics={"Method":"Association Rules","Sheet":st.session_state.get("active_sheet",""),
             "Rules found":len(rules),"Min Support":min_support,"Min Confidence":min_confidence,"Min Lift":min_lift}
    return metrics,display

def export_to_excel(results_dict):
    buf=io.BytesIO()
    with pd.ExcelWriter(buf,engine="openpyxl") as writer:
        for name,df in results_dict.items():
            df.to_excel(writer,sheet_name=str(name)[:31],index=False)
    return buf.getvalue()

# ═══════════════════════════════════════════════════════════════════════════════
# EDA PROFILING
# ═══════════════════════════════════════════════════════════════════════════════
def render_eda_section(df):
    num_cols=df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols=df.select_dtypes(include=["object","string"]).columns.tolist()
    tab_ov,tab_dist,tab_corr,tab_miss=st.tabs(["📋 Overview","📊 Distributions","🔗 Correlations","⚠️ Missing & Outliers"])

    with tab_ov:
        profile=[]
        for col in df.columns:
            miss=df[col].isnull().sum(); miss_p=f"{df[col].isnull().mean():.1%}"; uniq=df[col].nunique()
            sample=str(df[col].dropna().iloc[0]) if df[col].dropna().shape[0]>0 else ""
            if pd.api.types.is_numeric_dtype(df[col]):
                stats=f"min={df[col].min():.3g} / mean={df[col].mean():.3g} / max={df[col].max():.3g}"
            else:
                stats=", ".join([str(v) for v in df[col].value_counts().head(3).index.tolist()])
            profile.append({"Column":col,"Type":str(df[col].dtype),"Missing":miss,"Missing%":miss_p,
                            "Unique":uniq,"Stats / Top Values":stats,"Sample":sample[:40]})
        st.dataframe(pd.DataFrame(profile),use_container_width=True,height=min(600,40*len(df.columns)+50))

    with tab_dist:
        if not num_cols: st.info("No numeric columns for distribution charts.")
        else:
            cols_p=num_cols[:12]; n_c=3; n_r=int(np.ceil(len(cols_p)/n_c))
            fig,axes=plt.subplots(n_r,n_c,figsize=(14,n_r*3)); fig.patch.set_facecolor('#0d1117')
            axf=axes.flatten() if n_r*n_c>1 else [axes]
            for i,col in enumerate(cols_p):
                ax=axf[i]; ax.set_facecolor('#111827')
                for sp in ax.spines.values(): sp.set_edgecolor('#374151')
                ax.tick_params(colors='#6b7280',labelsize=7)
                data=df[col].dropna(); n_bins=min(30,max(10,int(len(data)**0.5)))
                ax.hist(data,bins=n_bins,color='#3b82f6',alpha=.75,edgecolor='#1e40af')
                ax.axvline(data.mean(),color='#f472b6',lw=1.5,linestyle='--')
                ax.set_title(col[:22],color='#e5e7eb',fontsize=8,fontweight='600')
                ax.set_ylabel("Count",color='#6b7280',fontsize=7)
            for j in range(len(cols_p),len(axf)): axf[j].set_visible(False)
            plt.tight_layout(pad=1.5); fig_to_st(fig)
            st.markdown('<div class="chart-cap">Pink line = column mean. Shows value distribution per numeric column.</div>',unsafe_allow_html=True)
        if cat_cols:
            st.markdown("---")
            st.markdown('<div class="chart-title">Categorical Frequencies</div>',unsafe_allow_html=True)
            cat_p=[c for c in cat_cols if df[c].nunique()<=30][:6]
            if cat_p:
                n_c2=min(3,len(cat_p)); n_r2=int(np.ceil(len(cat_p)/n_c2))
                fig2,axes2=plt.subplots(n_r2,n_c2,figsize=(14,n_r2*3.2)); fig2.patch.set_facecolor('#0d1117')
                axf2=axes2.flatten() if n_r2*n_c2>1 else [axes2]
                for i,col in enumerate(cat_p):
                    ax2=axf2[i]; ax2.set_facecolor('#111827')
                    for sp in ax2.spines.values(): sp.set_edgecolor('#374151')
                    vc=df[col].value_counts().head(15); colors=plt.cm.Set2(np.linspace(0,.8,len(vc)))
                    ax2.barh(range(len(vc)),vc.values,color=colors,alpha=.85)
                    ax2.set_yticks(range(len(vc)))
                    ax2.set_yticklabels([str(v)[:20] for v in vc.index],fontsize=7,color='#9ca3af')
                    ax2.tick_params(colors='#6b7280',labelsize=7)
                    ax2.set_title(col[:22],color='#e5e7eb',fontsize=8,fontweight='600'); ax2.invert_yaxis()
                for j in range(len(cat_p),len(axf2)): axf2[j].set_visible(False)
                plt.tight_layout(pad=1.5); fig_to_st(fig2)

    with tab_corr:
        if len(num_cols)<2: st.info("Need at least 2 numeric columns for correlation analysis.")
        else:
            corr=df[num_cols].corr(); sz=max(6,min(14,len(num_cols)*.6))
            fig,ax=plt.subplots(figsize=(sz,sz*.85)); fig.patch.set_facecolor('#0d1117'); ax.set_facecolor('#111827')
            mask=np.zeros_like(corr,dtype=bool); mask[np.triu_indices_from(mask)]=True
            sns.heatmap(corr,mask=mask,annot=len(num_cols)<=15,fmt=".2f",cmap='RdBu_r',center=0,ax=ax,
                        linewidths=.3,linecolor='#1f2937',annot_kws={"size":7,"color":"white"},
                        cbar_kws={"shrink":.6})
            ax.set_title("Feature Correlation Matrix (lower triangle)",color='#e5e7eb',pad=10)
            ax.tick_params(colors='#9ca3af',labelsize=8,rotation=45)
            plt.tight_layout(); fig_to_st(fig)
            st.markdown('<div class="chart-cap">Red=positive · Blue=negative · White=no correlation. Values >0.8 may indicate redundant features.</div>',unsafe_allow_html=True)
            strong=[]
            for i in range(len(corr)):
                for j in range(i+1,len(corr)):
                    val=corr.iloc[i,j]
                    if abs(val)>=.75:
                        strong.append({"Feature A":corr.columns[i],"Feature B":corr.columns[j],
                                       "Correlation":f"{val:.3f}","Strength":"🔴 Strong (≥0.9)" if abs(val)>=.9 else "🟡 Moderate-Strong"})
            if strong:
                st.markdown("**⚡ Highly correlated pairs (|r| ≥ 0.75):**")
                st.dataframe(pd.DataFrame(strong),use_container_width=True)

    with tab_miss:
        miss=df.isnull().sum(); miss=miss[miss>0].sort_values(ascending=False)
        if miss.empty: st.success("✅ No missing values found in this dataset.")
        else:
            fig,ax=_dark_fig(9,max(3,len(miss)*.4)); pcts=(miss/len(df)*100)
            colors=['#ef4444' if p>30 else '#f59e0b' if p>10 else '#3b82f6' for p in pcts]
            ax.barh(range(len(miss)),pcts.values,color=colors,alpha=.85)
            ax.set_yticks(range(len(miss))); ax.set_yticklabels(miss.index.tolist(),color='#9ca3af',fontsize=8)
            ax.set_xlabel("Missing %",color='#9ca3af'); ax.set_title("Missing Values by Column",color='#e5e7eb')
            ax.axvline(30,color='#ef4444',linestyle='--',lw=1,alpha=.5,label="30% threshold")
            ax.legend(facecolor='#111827',labelcolor='#9ca3af',fontsize=8)
            ax.invert_yaxis(); plt.tight_layout(); fig_to_st(fig)
            st.markdown('<div class="chart-cap">Red=>30% critical · Amber=10-30% moderate · Blue=<10% manageable.</div>',unsafe_allow_html=True)
        if num_cols:
            st.markdown("---")
            st.markdown('<div class="chart-title">Outlier Box Plots</div>',unsafe_allow_html=True)
            box_cols=num_cols[:10]; n_c3=min(4,len(box_cols)); n_r3=int(np.ceil(len(box_cols)/n_c3))
            fig2,axes2=plt.subplots(n_r3,n_c3,figsize=(13,n_r3*3)); fig2.patch.set_facecolor('#0d1117')
            axf3=axes2.flatten() if n_r3*n_c3>1 else [axes2]
            for i,col in enumerate(box_cols):
                ax3=axf3[i]; ax3.set_facecolor('#111827')
                for sp in ax3.spines.values(): sp.set_edgecolor('#374151')
                ax3.boxplot(df[col].dropna(),patch_artist=True,
                    boxprops=dict(facecolor='#1d4ed8',color='#60a5fa'),
                    whiskerprops=dict(color='#60a5fa'),capprops=dict(color='#60a5fa'),
                    medianprops=dict(color='#f472b6',lw=2),
                    flierprops=dict(markerfacecolor='#ef4444',markersize=4,marker='o'))
                ax3.set_title(col[:18],color='#e5e7eb',fontsize=8,fontweight='600')
                ax3.tick_params(colors='#6b7280',labelsize=7)
            for j in range(len(box_cols),len(axf3)): axf3[j].set_visible(False)
            plt.tight_layout(pad=1.5); fig_to_st(fig2)
            st.markdown('<div class="chart-cap">Pink=median · Dots beyond whiskers=outliers · Wide spread=high variance.</div>',unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# SMART ALGORITHM ADVISOR
# ═══════════════════════════════════════════════════════════════════════════════
ALGO_CATEGORIES = {
    "supervised_clf": {
        "title":"Supervised Learning — Classification",
        "icon":"🎯","color":"#60a5fa","bg":"rgba(59,130,246,.08)","border":"rgba(59,130,246,.25)",
        "desc":"Bạn có target variable dạng category. Model học từ dữ liệu có nhãn để phân loại.",
        "when":"Dự đoán: churn/no-churn, fraud/normal, loại sản phẩm, risk level, etc.",
    },
    "supervised_reg": {
        "title":"Supervised Learning — Regression",
        "icon":"📈","color":"#a78bfa","bg":"rgba(124,58,237,.08)","border":"rgba(124,58,237,.25)",
        "desc":"Bạn có target variable dạng số liên tục. Model học để dự báo giá trị.",
        "when":"Dự báo: giá, doanh thu, nhiệt độ, số lượng, chi phí, etc.",
    },
    "unsupervised_clus": {
        "title":"Unsupervised Learning — Clustering",
        "icon":"🔮","color":"#34d399","bg":"rgba(16,185,129,.08)","border":"rgba(16,185,129,.25)",
        "desc":"Không có target. Model tự tìm nhóm tự nhiên ẩn trong dữ liệu.",
        "when":"Phân khúc khách hàng, phân nhóm sản phẩm, anomaly detection.",
    },
    "unsupervised_assoc": {
        "title":"Unsupervised Learning — Association Rules",
        "icon":"🔗","color":"#f472b6","bg":"rgba(244,114,182,.08)","border":"rgba(244,114,182,.25)",
        "desc":"Tìm pattern đồng xuất hiện trong dữ liệu giao dịch.",
        "when":"Market basket, cross-sell, maintenance co-occurrence, log pattern.",
    },
}

# Rule table: (goal_type, size, interpretability) → [(method, tier, why)]
_R = {
    ("clf","small","high"):[
        ("Classification Trees","primary","Dataset nhỏ + cần giải thích → cây quyết định IF/THEN tốt nhất"),
        ("Logistic Regression","alt","Hệ số dễ diễn giải, phù hợp report cho management"),
        ("Naive Bayes","opt","Rất nhanh, tốt làm baseline cho tập nhỏ"),
    ],
    ("clf","small","low"):[
        ("Random Forest","primary","Ensemble mạnh dù tập nhỏ — tránh overfit tốt hơn single tree"),
        ("K-Nearest Neighbors (KNN)","alt","Non-parametric, không cần giả định phân phối"),
        ("Classification Trees","opt","Backup khi cần diễn giải"),
    ],
    ("clf","medium","high"):[
        ("Classification Trees","primary","Dễ trình bày IF/THEN cho business stakeholders"),
        ("Logistic Regression","alt","Coefficient = tác động trực tiếp của từng feature"),
        ("Linear Discriminant Analysis (LDA)","opt","Tốt khi các class có phân phối normal"),
    ],
    ("clf","medium","low"):[
        ("Random Forest","primary","Best overall cho tập trung bình — robust & accurate"),
        ("Support Vector Machine (SVM)","alt","Mạnh với nhiều features, tốt với margin rõ ràng"),
        ("Neural Networks (MLP)","opt","Nếu pattern phức tạp phi tuyến tính"),
    ],
    ("clf","large","high"):[
        ("Logistic Regression","primary","Scale tốt với tập lớn, hệ số rõ ràng"),
        ("Classification Trees","alt","Vẫn interpretable với tập lớn nếu giới hạn depth"),
        ("Linear Discriminant Analysis (LDA)","opt","Nếu features numeric và normal-distributed"),
    ],
    ("clf","large","low"):[
        ("Random Forest","primary","Best overall cho tập lớn — ổn định, chính xác"),
        ("Neural Networks (MLP)","alt","Khai thác pattern phi tuyến phức tạp"),
        ("Support Vector Machine (SVM)","opt","Nếu features high-dimensional"),
    ],
    ("reg","small","high"):[
        ("Linear Regression","primary","Interpretable nhất — coefficient = tác động trực tiếp"),
        ("Neural Networks Regression (MLP)","opt","Chỉ thử nếu linear không fit tốt (R²<0.5)"),
    ],
    ("reg","small","low"):[
        ("Linear Regression","primary","Baseline tốt, dễ validate với tập nhỏ"),
        ("Neural Networks Regression (MLP)","alt","Nếu relationship rõ ràng là phi tuyến"),
    ],
    ("reg","medium","high"):[
        ("Linear Regression","primary","Tốt nhất cho interpretability"),
        ("Neural Networks Regression (MLP)","alt","Thử nếu R² < 0.6 với linear"),
    ],
    ("reg","medium","low"):[
        ("Neural Networks Regression (MLP)","primary","Tốt hơn linear cho pattern phức tạp"),
        ("Linear Regression","alt","Baseline để so sánh"),
    ],
    ("reg","large","high"):[
        ("Linear Regression","primary","Scale tốt với tập lớn, dễ deploy"),
        ("Neural Networks Regression (MLP)","alt","Nếu có non-linearity rõ ràng"),
    ],
    ("reg","large","low"):[
        ("Neural Networks Regression (MLP)","primary","Tốt nhất cho tập lớn phi tuyến"),
        ("Linear Regression","alt","Benchmark cơ bản luôn cần chạy"),
    ],
    ("clus","any","any"):[
        ("K-Means Clustering","primary","Nhanh, scalable, dễ interpret — luôn bắt đầu đây"),
        ("Hierarchical Clustering","alt","Không cần chỉ định K trước, xem dendrogram để chọn"),
    ],
    ("assoc","any","any"):[
        ("Association Rules (Apriori)","primary","Tìm IF-THEN patterns trong dữ liệu giao dịch"),
    ],
}

def get_recommendations(df, goal_type, interp, is_imbalanced):
    n=len(df)
    size="small" if n<500 else ("medium" if n<10000 else "large")
    if goal_type=="clf":
        cat="supervised_clf"
        key=("clf",size,interp)
        recs=_R.get(key,_R[("clf","medium",interp)])
        prereqs=[]
        if is_imbalanced=="yes":
            prereqs=[
                ("SMOTE","prereq","⚠️ Class imbalance → chạy trước khi classification để tránh bias"),
                ("Random Oversampling","prereq","Alternative đơn giản hơn SMOTE cho tập nhỏ"),
            ]
        return cat, prereqs+recs, size, n
    elif goal_type=="reg":
        cat="supervised_reg"
        key=("reg",size,interp)
        recs=_R.get(key,_R[("reg","medium",interp)])
        return cat, recs, size, n
    elif goal_type=="clus":
        return "unsupervised_clus", _R[("clus","any","any")], size, n
    else:
        return "unsupervised_assoc", _R[("assoc","any","any")], size, n


def render_algo_advisor(df):
    st.markdown(
        '<div style="background:linear-gradient(135deg,#0f1f3d,#0d1120);border:1px solid #1e3a5f;'
        'border-radius:12px;padding:14px 18px;margin-bottom:14px;">'
        '<div style="font-size:.93rem;font-weight:700;color:#60a5fa;margin-bottom:3px">🎯 Smart Algorithm Advisor</div>'
        '<div style="font-size:.78rem;color:#6b7280">Trả lời 4 câu hỏi → hệ thống gợi ý thuật toán phù hợp nhất cho dữ liệu của bạn.</div>'
        '</div>', unsafe_allow_html=True)

    n_rows=len(df); num_cols=df.select_dtypes(include=[np.number]).columns.tolist()

    # Q1 — Goal
    st.markdown('<div class="quiz-card"><div class="quiz-q">1️⃣  Mục tiêu phân tích của bạn là gì?</div>'
                '<div class="quiz-hint">Bạn muốn dự đoán kết quả cụ thể hay khám phá cấu trúc ẩn trong dữ liệu?</div>',
                unsafe_allow_html=True)
    q1=st.radio("q1",["🎯  Dự đoán một kết quả (classification / regression)",
                       "🔮  Phân nhóm / tìm cụm tự nhiên (clustering)",
                       "🔗  Tìm items thường đi cùng nhau (association rules)"],
                key="adv_q1",label_visibility="collapsed")
    st.markdown('</div>',unsafe_allow_html=True)
    goal_type="clf" if "Dự đoán" in q1 else ("clus" if "Phân nhóm" in q1 else "assoc")

    # Q2 — Target type (supervised only)
    if goal_type=="clf":
        st.markdown('<div class="quiz-card"><div class="quiz-q">2️⃣  Target variable (kết quả cần dự đoán) thuộc loại nào?</div>',
                    unsafe_allow_html=True)
        q2=st.radio("q2",["📌  Category / nhãn rời rạc (Yes/No, Loại A/B/C, Churn/No-Churn)",
                           "📊  Số liên tục (giá tiền, doanh thu, nhiệt độ, số lượng)"],
                    key="adv_q2",label_visibility="collapsed")
        st.markdown('</div>',unsafe_allow_html=True)
        goal_type="clf" if "Category" in q2 else "reg"

    # Q3 — Class balance (classification only)
    is_imbalanced="no"
    if goal_type=="clf":
        # Auto-hint from last column
        last_col=df.columns[-1]
        if df[last_col].nunique()<=10:
            vc=df[last_col].value_counts(normalize=True)
            auto_hint=f" (Cột cuối '{last_col}': {', '.join(f'{v:.0%} {k}' for k,v in vc.items()[:3])})"
        else: auto_hint=""
        st.markdown(f'<div class="quiz-card"><div class="quiz-q">3️⃣  Phân phối các class trong dữ liệu như thế nào?{auto_hint}</div>'
                    '<div class="quiz-hint">Ví dụ: 95% "No Churn" và 5% "Churn" → mất cân bằng nghiêm trọng</div>',
                    unsafe_allow_html=True)
        q3=st.radio("q3",["⚖️  Tương đối cân bằng (không class nào chiếm >80%)",
                           "⚠️  Mất cân bằng — một class chiếm đa số áp đảo",
                           "❓  Chưa biết"],
                    key="adv_q3",label_visibility="collapsed")
        st.markdown('</div>',unsafe_allow_html=True)
        is_imbalanced="yes" if "Mất cân bằng" in q3 else "no"

    # Q4 — Interpretability
    st.markdown('<div class="quiz-card"><div class="quiz-q">4️⃣  Mức độ cần giải thích kết quả (interpretability)?</div>'
                '<div class="quiz-hint">Management hoặc audit có cần hiểu tại sao model đưa ra quyết định đó không?</div>',
                unsafe_allow_html=True)
    q4=st.radio("q4",["🔍  Cao — cần giải thích rõ ràng cho management / audit / compliance",
                       "⚡  Thấp — chỉ cần độ chính xác cao nhất (black-box OK)"],
                key="adv_q4",label_visibility="collapsed")
    st.markdown('</div>',unsafe_allow_html=True)
    interp="high" if "Cao" in q4 else "low"

    # --- Generate ---
    cat_key,recs,size,n=get_recommendations(df,goal_type,interp,is_imbalanced)
    cat_info=ALGO_CATEGORIES[cat_key]

    st.markdown("---")

    # Decision path breadcrumb
    path_nodes=[]
    if goal_type in ("clf","reg"):
        path_nodes.append(('<span class="dp-node dp-blue">Supervised</span>',''))
        if goal_type=="clf":
            path_nodes.append(('<span class="dp-arrow">→</span><span class="dp-node dp-blue">Classification</span>',''))
        else:
            path_nodes.append(('<span class="dp-arrow">→</span><span class="dp-node dp-purple">Regression</span>',''))
    elif goal_type=="clus":
        path_nodes.append(('<span class="dp-node dp-green">Unsupervised</span>',''))
        path_nodes.append(('<span class="dp-arrow">→</span><span class="dp-node dp-green">Clustering</span>',''))
    else:
        path_nodes.append(('<span class="dp-node dp-green">Unsupervised</span>',''))
        path_nodes.append(('<span class="dp-arrow">→</span><span class="dp-node dp-purple">Association</span>',''))
    size_map={"small":f"Small &lt;500 ({n_rows:,} rows)","medium":f"Medium ({n_rows:,} rows)","large":f"Large ({n_rows:,} rows)"}
    path_nodes.append(f'<span class="dp-arrow">→</span><span class="dp-node dp-blue">{size_map.get(size,"")} </span>')
    path_nodes.append(f'<span class="dp-arrow">→</span><span class="dp-node dp-{"amber" if interp=="high" else "green"}">{"High interpretability" if interp=="high" else "High accuracy"}</span>')
    if is_imbalanced=="yes":
        path_nodes.append('<span class="dp-arrow">→</span><span class="dp-node dp-amber">⚠️ Imbalanced classes</span>')

    st.markdown(
        '<div style="font-size:.68rem;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Decision Path</div>'
        '<div class="decision-path">'+"".join(p if isinstance(p,str) else p[0] for p in path_nodes)+'</div>',
        unsafe_allow_html=True)

    # Category highlight card
    st.markdown(
        f'<div style="background:{cat_info["bg"]};border:1px solid {cat_info["border"]};border-radius:11px;padding:13px 16px;margin:10px 0;">'
        f'<div style="display:flex;align-items:center;gap:9px;margin-bottom:5px">'
        f'<span style="font-size:1.15rem">{cat_info["icon"]}</span>'
        f'<span style="font-size:.9rem;font-weight:700;color:{cat_info["color"]}">{cat_info["title"]}</span>'
        f'</div>'
        f'<div style="font-size:.77rem;color:#9ca3af">{cat_info["desc"]}</div>'
        f'<div style="font-size:.72rem;color:#6b7280;margin-top:4px">📌 {cat_info["when"]}</div>'
        f'</div>', unsafe_allow_html=True)

    # Algorithm recommendations
    tier_cfg={
        "prereq":("rb-pre","⚠️ Prerequisite","ri-prereq"),
        "primary":("rb-pri","⭐ Primary","ri-primary"),
        "alt":("rb-alt","🔵 Alternative","ri-alt"),
        "opt":("rb-opt","🟢 Optional","ri-opt"),
    }
    st.markdown('<div style="font-size:.68rem;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.07em;margin:10px 0 6px">Recommended Algorithms</div>',unsafe_allow_html=True)

    rec_methods=[]
    for mname,tier,why in recs:
        bc,label,rc=tier_cfg.get(tier,tier_cfg["opt"])
        st.markdown(
            f'<div class="rec-item {rc}">'
            f'<span class="rec-badge {bc}">{label}</span>'
            f'<div><div class="rec-name">{mname}</div><div class="rec-why">{why}</div></div>'
            f'</div>', unsafe_allow_html=True)
        if mname in METHODS: rec_methods.append(mname)

    # Apply button
    st.markdown("<br>",unsafe_allow_html=True)
    ca,cb,_=st.columns([1,1,3])
    with ca:
        if st.button("✅ Apply Recommended",type="primary",key="apply_rec"):
            valid=[m for m in rec_methods if m in METHODS]
            st.session_state["selected_methods"]=valid
            st.session_state["rec_applied"]=True
            st.rerun()
    with cb:
        if st.button("🗑️ Clear",key="clr_rec"):
            st.session_state["selected_methods"]=[]; st.session_state["rec_applied"]=False; st.rerun()

    if st.session_state.get("rec_applied") and st.session_state.get("selected_methods"):
        sel=st.session_state["selected_methods"]
        chips=" ".join(f'<span style="background:rgba(59,130,246,.15);color:#60a5fa;padding:2px 9px;border-radius:4px;font-size:.73rem">{m}</span>' for m in sel)
        st.markdown(f'<div style="margin-top:6px;padding:8px 12px;background:#0d1829;border:1px solid #1e3a5f;border-radius:8px;font-size:.78rem;color:#6b7280">✅ Applied: {chips}<br><span style="color:#4b5563;font-size:.71rem">Scroll to "Run ML Models" tab → configure columns → click Run</span></div>',unsafe_allow_html=True)


def render_fitness_report(results, df, goal=""):
    sec_hdr("🏅","Model Fitness Report","amber",subtitle="Grade A–D  ·  Verdict  ·  Actionable Advice")

    def _grade_clf(f1):
        try: f=float(f1)
        except: return "D",0
        if f>=.90: return "A",f
        if f>=.75: return "B",f
        if f>=.60: return "C",f
        return "D",f

    def _grade_reg(r2):
        try: r=float(r2)
        except: return "D",0
        if r>=.80: return "A",r
        if r>=.60: return "B",r
        if r>=.40: return "C",r
        return "D",r

    def _grade_clus(sil):
        try: s=float(sil)
        except: return "D",0
        if s>=.70: return "A",s
        if s>=.50: return "B",s
        if s>=.25: return "C",s
        return "D",s

    verdict_map={
        "A":("✅ Highly suitable — ready for deployment consideration","fv-A"),
        "B":("✅ Suitable — good performance, minor improvements possible","fv-B"),
        "C":("⚠️ Moderate — use with caution; try feature engineering or more data","fv-C"),
        "D":("❌ Not recommended — poor fit; review data quality & feature selection","fv-D"),
    }
    advice_clf={
        "A":"F1 và Accuracy cao. Kiểm tra overfitting bằng cross-validation. Validate trên holdout set trước khi deploy.",
        "B":"Kết quả tốt nhưng còn dư địa. Thử: thêm features, tune hyperparameters, hoặc SMOTE nếu class imbalanced.",
        "C":"Hiệu suất trung bình. Kiểm tra: (1) data quality, (2) class imbalance, (3) feature relevance. Thử Random Forest hoặc thêm features.",
        "D":"Model kém. Nguyên nhân thường: data thiếu chất lượng, features không relevant, hoặc sai loại model. Review lại Step 2 Prep Data.",
    }
    advice_reg={
        "A":"R² tốt — model giải thích được phần lớn variance. Kiểm tra residuals có pattern không. Validate trên out-of-time data.",
        "B":"Fit tốt. Thử thêm interaction terms, polynomial features, hoặc loại bỏ outliers để cải thiện thêm.",
        "C":"Fit yếu. Có thể relationship phi tuyến → thử Neural Networks MLP. Hoặc cần feature engineering.",
        "D":"R² rất thấp — model không giải thích được biến động. Xem xét lại target variable và feature selection.",
    }
    advice_clus={
        "A":"Clusters rõ ràng và tách biệt. Validate với domain expert. Đặt tên cluster theo business meaning.",
        "B":"Separation tốt. Thử K khác nhau hoặc feature selection để cải thiện Silhouette score.",
        "C":"Clusters chồng lấn. Thử: chuẩn hóa features, loại outliers, hoặc thay đổi số K.",
        "D":"Không tìm được clusters rõ ràng. Data có thể không có cấu trúc nhóm tự nhiên — cân nhắc Association Rules.",
    }

    cards=[]
    for r in results:
        method=r.get("Method","Unknown")
        if "F1-Score" in r:
            grade,score=_grade_clf(r.get("F1-Score"))
            score_lbl=f"F1={r.get('F1-Score','?')}  Acc={r.get('Accuracy','?')}  AUC={r.get('AUC','?')}"
            advice=advice_clf[grade]
        elif "R²" in r:
            grade,score=_grade_reg(r.get("R²"))
            score_lbl=f"R²={r.get('R²','?')}  RMSE={r.get('RMSE','?')}"
            advice=advice_reg[grade]
        elif "Silhouette" in r:
            grade,score=_grade_clus(r.get("Silhouette","0"))
            score_lbl=f"Silhouette={r.get('Silhouette','?')}  K={r.get('K','?')}"
            advice=advice_clus[grade]
        else:
            grade,score,score_lbl,advice="C",0.5,"See run output above","Review metrics above."
        verdict_txt,verdict_cls=verdict_map[grade]
        bar_pct=int(min(max(score,0),1)*100)
        cards.append({"method":method,"grade":grade,"score_lbl":score_lbl,
                      "verdict_txt":verdict_txt,"verdict_cls":verdict_cls,"advice":advice,"bar_pct":bar_pct})

    n_c=min(len(cards),3); cols=st.columns(n_c) if n_c>1 else [st.container()]
    for i,card in enumerate(cards):
        with cols[i%n_c] if n_c>1 else cols[0]:
            st.markdown(
                f'<div class="fitness-card">'
                f'<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:3px">'
                f'<div class="fitness-grade fg-{card["grade"]}">{card["grade"]}</div>'
                f'<div><div class="fitness-method">{card["method"]}</div>'
                f'<div class="fitness-score">{card["score_lbl"]}</div></div></div>'
                f'<div class="fitness-bar-wrap"><div class="fitness-bar fb-{card["grade"]}" style="width:{card["bar_pct"]}%"></div></div>'
                f'<div class="fitness-verdict {card["verdict_cls"]}">{card["verdict_txt"]}</div>'
                f'<div class="fitness-advice">{card["advice"]}</div>'
                f'</div>', unsafe_allow_html=True)

    if len(cards)>1:
        grade_order={"A":4,"B":3,"C":2,"D":1}
        best=max(cards,key=lambda x:grade_order.get(x["grade"],0))
        st.markdown(
            f'<div style="background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.22);'
            f'border-radius:10px;padding:11px 16px;margin-top:10px;font-size:.81rem;">'
            f'🏆 <b style="color:#60a5fa">Best model: {best["method"]}</b> (Grade {best["grade"]}) — '
            f'<span style="color:#9ca3af">{best["verdict_txt"]}</span>'
            f'</div>', unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION STATE
# ═══════════════════════════════════════════════════════════════════════════════
DEFAULTS={
    "sheets":{},"active_sheet":None,"wizard_step":1,"ai_blueprint":"",
    "prep_transforms":{},"prep_log":{},"enc_mapping":{},"user_goal":"",
    "selected_methods":[],"run_results":[],"run_exports":{},"comparison_ai":"",
    "gemini_key":"","openrouter_key":"","ai_vn":"","rec_applied":False,
}
for k,v in DEFAULTS.items():
    if k not in st.session_state: st.session_state[k]=v

# ═══════════════════════════════════════════════════════════════════════════════
# UI HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def render_stepper(ws):
    steps=["Load Data","Prep Data","Analysis & Profiling","Advise & Predict"]
    parts=[]
    for i,s in enumerate(steps):
        n=i+1
        if n<ws:    cc,lc,sym="sc-d","sl-d","✓"
        elif n==ws: cc,lc,sym="sc-a","sl-a",str(n)
        else:       cc,lc,sym="sc-p","sl-p",str(n)
        parts.append(f'<div class="step-item"><div class="step-circle {cc}">{sym}</div><div class="step-lbl {lc}">{s}</div></div>')
        if i<len(steps)-1:
            conn_cls="sc-conn-d" if n<ws else "sc-conn-p"
            parts.append(f'<div class="step-conn {conn_cls}"></div>')
    st.markdown('<div class="stepper">'+"".join(parts)+'</div>',unsafe_allow_html=True)

def sec_hdr(icon,title,color="blue",subtitle=""):
    sub="<span class='sec-sub'>"+subtitle+"</span>" if subtitle else ""
    st.markdown(
        f'<div class="sec-hdr"><div class="sec-icon si-{color}">{icon}</div>'
        f'<span class="sec-title">{title}</span>{sub}</div>',
        unsafe_allow_html=True)

def stat_row(items):
    cols=st.columns(len(items))
    for col,(val,lbl,cls) in zip(cols,items):
        with col:
            st.markdown(f'<div class="stat-card"><div class="stat-val {cls}">{val}</div><div class="stat-lbl">{lbl}</div></div>',unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("""
    <div style="padding:12px 0 14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1.2rem">🧬</div>
        <div><div style="font-size:1rem;font-weight:700;color:#f9fafb">DataMine AI</div>
        <div style="font-size:.68rem;color:#4b5563">Analytics Platform</div></div>
      </div>
    </div>""",unsafe_allow_html=True)

    ws_sb=st.session_state["wizard_step"]
    steps_sb=["Load Data","Prep Data","Analysis & Profiling","Advise & Predict"]
    st.markdown('<div style="font-size:.63rem;font-weight:700;letter-spacing:.1em;color:#374151;text-transform:uppercase;margin-bottom:5px">WORKFLOW</div>',unsafe_allow_html=True)
    for i,s in enumerate(steps_sb):
        n=i+1
        if n<ws_sb:   nc,tc,ac="sn-done","sbt-d",""; sym="✓"
        elif n==ws_sb: nc,tc,ac="sn-active","sbt-a"," sb-step-a"; sym=str(n)
        else:          nc,tc,ac="sn-pend","sbt-p",""; sym=str(n)
        st.markdown(f'<div class="sb-step{ac}"><div class="sb-num {nc}">{sym}</div><div class="sb-txt {tc}">{s}</div></div>',unsafe_allow_html=True)

    st.markdown('<div style="border-top:1px solid #1f2937;padding-top:10px;margin-top:12px;font-size:.63rem;font-weight:700;letter-spacing:.1em;color:#374151;text-transform:uppercase;margin-bottom:7px">DATA UPLOAD</div>',unsafe_allow_html=True)
    uploaded_files=st.file_uploader("Drop files here",type=["csv","xlsx","xls","json","txt"],
        accept_multiple_files=True,label_visibility="collapsed")
    if uploaded_files:
        for uf in uploaded_files:
            new=load_file(uf)
            for k,v in new.items():
                if k not in st.session_state["sheets"]:
                    st.session_state["sheets"][k]=v
                    if st.session_state["active_sheet"] is None:
                        st.session_state["active_sheet"]=k

    all_sheets=st.session_state.get("sheets",{})
    if all_sheets:
        keys=list(all_sheets.keys())
        chosen=st.selectbox("Active sheet",keys,
            index=keys.index(st.session_state["active_sheet"]) if st.session_state["active_sheet"] in keys else 0,
            label_visibility="collapsed")
        st.session_state["active_sheet"]=chosen
        if len(all_sheets)>1:
            with st.expander("🔗 Merge Files",expanded=False):
                left_k=st.selectbox("Left file",keys,key="ml")
                right_k=st.selectbox("Right file",[k for k in keys if k!=left_k],key="mr")
                shared=list(set(all_sheets[left_k].columns)&set(all_sheets[right_k].columns)) if right_k else []
                join_on=st.selectbox("Join on",shared or ["(no shared columns)"],key="mo")
                join_type=st.selectbox("Join type",["inner","left","outer","right"],key="mt")
                if shared and st.button("Merge →",key="dm"):
                    merged=pd.merge(all_sheets[left_k],all_sheets[right_k],on=join_on,how=join_type)
                    mk=f"merged_{left_k[:12]}+{right_k[:12]}"
                    st.session_state["sheets"][mk]=merged; st.session_state["active_sheet"]=mk
                    st.success(f"Merged → {mk} ({merged.shape[0]:,} rows)"); st.rerun()

    st.markdown('<div style="border-top:1px solid #1f2937;padding-top:10px;margin-top:12px;font-size:.63rem;font-weight:700;letter-spacing:.1em;color:#374151;text-transform:uppercase;margin-bottom:7px">AI KEYS</div>',unsafe_allow_html=True)
    st.text_input("Gemini key",type="password",key="gemini_key",placeholder="AIza…",label_visibility="collapsed")
    st.caption("Gemini (aistudio.google.com)")
    st.text_input("OpenRouter key",type="password",key="openrouter_key",placeholder="sk-or-…",label_visibility="collapsed")
    st.caption("OpenRouter (openrouter.ai) — fallback")
    g_ok=bool(st.session_state.get("gemini_key","").strip())
    o_ok=bool(st.session_state.get("openrouter_key","").strip())
    if g_ok or o_ok: st.success(f"AI ready: {'Gemini' if g_ok else 'OpenRouter'}")
    else: st.markdown('<div style="font-size:.74rem;color:#4b5563;padding:4px 0">⚪ No key — ML runs fine; AI explanations disabled.</div>',unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
ws=st.session_state["wizard_step"]

st.markdown(
    '<div class="app-header">'
    '<div class="app-logo">🧬</div>'
    '<div><div class="app-title">DataMine AI</div>'
    '<div class="app-sub">Upload · Prep · Profile · Predict</div></div>'
    '<div class="version-badge">v2.0</div></div>',
    unsafe_allow_html=True)

render_stepper(ws)

if not st.session_state["sheets"]:
    st.markdown("""
    <div class="welcome">
      <h2>Welcome to DataMine AI</h2>
      <p>A guided data analytics platform. Upload your data and follow 4 steps to clean, profile, model, and get AI-driven predictions.</p>
      <div class="step-list">
        <div class="step-list-item"><span class="sli-num">01</span><div class="sli-text"><b>Load Data</b>Upload CSV, Excel, JSON or TXT. Multiple files supported — merge later.</div></div>
        <div class="step-list-item"><span class="sli-num">02</span><div class="sli-text"><b>Prep Data</b>Auto-detect and fix missing values, duplicates, outliers and encoding.</div></div>
        <div class="step-list-item"><span class="sli-num">03</span><div class="sli-text"><b>Analysis & Profiling</b>Explore distributions, correlations, missing value charts. Run ML models side-by-side.</div></div>
        <div class="step-list-item"><span class="sli-num">04</span><div class="sli-text"><b>Advise & Predict</b>AI blueprint + model comparison + actionable recommendations. Export to Excel.</div></div>
      </div>
    </div>""",unsafe_allow_html=True)
    st.markdown('<div style="text-align:center;color:#4b5563;font-size:.83rem;padding:6px">👈 Upload a file in the sidebar to begin</div>',unsafe_allow_html=True)
    st.stop()

active_name=st.session_state["active_sheet"]
raw_df=st.session_state["sheets"][active_name]
_prep_stack=st.session_state["prep_transforms"].get(active_name,[])
df_active=_json_to_df(_prep_stack[-1][1]) if _prep_stack else raw_df.copy()

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — LOAD DATA
# ═══════════════════════════════════════════════════════════════════════════════
sec_hdr("📂","Step 1 — Load Data","blue",subtitle=f"{len(st.session_state['sheets'])} file(s) loaded")

all_loaded=st.session_state.get("sheets",{})
miss_pct=f"{raw_df.isnull().mean().mean():.1%}"; dup_count=raw_df.duplicated().sum()

stat_row([
    (f"{len(all_loaded)}","Files Loaded","sv-blue"),
    (f"{sum(d.shape[0] for d in all_loaded.values()):,}","Total Rows","sv-gray"),
    (miss_pct,"Missing Rate","sv-amber" if raw_df.isnull().mean().mean()>.1 else "sv-green"),
    (f"{dup_count:,}","Duplicates","sv-red" if dup_count>0 else "sv-green"),
])

file_tabs=st.tabs([f"📄 {n}" for n in all_loaded.keys()])
for tab,(sname,sdf) in zip(file_tabs,all_loaded.items()):
    _s=st.session_state["prep_transforms"].get(sname,[])
    disp=_json_to_df(_s[-1][1]) if _s else sdf
    with tab:
        st.caption(f"{disp.shape[0]:,} rows × {disp.shape[1]} cols"+(" · ✅ Cleaned" if _s else " · Original"))
        t1,t2,t3=st.tabs(["Table","Statistics","Column Types"])
        with t1: st.dataframe(disp.head(50),use_container_width=True)
        with t2: st.dataframe(disp.describe(include="all"),use_container_width=True)
        with t3:
            dt=disp.dtypes.reset_index(); dt.columns=["Column","Type"]
            dt["Nulls"]=disp.isnull().sum().values
            dt["Null%"]=(disp.isnull().mean()*100).round(1).values
            dt["Unique"]=disp.nunique().values
            dt["Sample"]=[str(disp[c].dropna().iloc[0]) if disp[c].dropna().shape[0]>0 else "" for c in disp.columns]
            st.dataframe(dt,use_container_width=True)

if ws==1:
    st.markdown("<br>",unsafe_allow_html=True)
    c1,_=st.columns([1,4])
    with c1:
        if st.button("Continue to Prep Data →",type="primary"):
            st.session_state["wizard_step"]=2; st.rerun()
st.divider()

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — PREP DATA
# ═══════════════════════════════════════════════════════════════════════════════
if ws>=2:
    sec_hdr("🧹","Step 2 — Prep Data","green",subtitle="Auto-detect & fix data quality issues")
    all_loaded_2=st.session_state.get("sheets",{})
    if len(all_loaded_2)>1:
        st.markdown('<div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:8px 14px;font-size:.8rem;color:#93c5fd;margin-bottom:10px">💡 Multiple files — select which one to clean.</div>',unsafe_allow_html=True)
        prep_target=st.selectbox("Prepare which file?",list(all_loaded_2.keys()),
            index=list(all_loaded_2.keys()).index(active_name) if active_name in all_loaded_2 else 0,
            key="prep_sel")
    else:
        prep_target=active_name
    prep_raw=all_loaded_2.get(prep_target,raw_df)
    if prep_target not in st.session_state["prep_log"]: st.session_state["prep_log"][prep_target]=[]
    if prep_target not in st.session_state["prep_transforms"]: st.session_state["prep_transforms"][prep_target]=[]
    stack=st.session_state["prep_transforms"][prep_target]; log=st.session_state["prep_log"][prep_target]
    cur_json=stack[-1][1] if stack else _df_to_json(prep_raw); cur_df=_json_to_df(cur_json)

    st.markdown(
        f'<div style="background:#0f1629;border:1px solid #1f2937;border-radius:8px;padding:7px 14px;font-size:.8rem;color:#6b7280;margin-bottom:12px">'
        f'Working on: <b style="color:#60a5fa">{prep_target}</b> — {cur_df.shape[0]:,} rows × {cur_df.shape[1]} cols'
        f'{"  <span style=color:#34d399>✅ Cleaned</span>" if stack else "  · Original"}</div>',
        unsafe_allow_html=True)

    sec_hdr("🔍","Auto-Detected Issues","amber")
    with st.spinner("Scanning data quality…"):
        problems=detect_problems(cur_json)
    sev_map={"err":("pc-err","🔴"),"warn":("pc-warn","🟡"),"info":("pc-info","🔵"),"ok":("pc-ok","✅")}
    for p in problems:
        cls,ico=sev_map.get(p["sev"],("pc-info","ℹ️"))
        fix_html=f'<div class="prob-fix">→ {p["fix"]}</div>' if p["fix"] else ""
        st.markdown(
            f'<div class="prob-row">{ico} <span class="prob-chip {cls}">{p["type"].upper()}</span>'
            f'<div><div class="prob-txt">{p["msg"]}</div>{fix_html}</div></div>',
            unsafe_allow_html=True)

    st.markdown('<div style="margin:12px 0 7px;font-size:.79rem;font-weight:600;color:#9ca3af">Apply Fixes →</div>',unsafe_allow_html=True)
    has_missing=cur_df.isnull().any().any(); has_dups=cur_df.duplicated().any()
    has_text=len(cur_df.select_dtypes(include=["object","string"]).columns)>0
    num_c2=cur_df.select_dtypes(include=[np.number]).columns
    has_out=any(((cur_df[c]<cur_df[c].quantile(.25)-3*(cur_df[c].quantile(.75)-cur_df[c].quantile(.25)))|
        (cur_df[c]>cur_df[c].quantile(.75)+3*(cur_df[c].quantile(.75)-cur_df[c].quantile(.25)))).any()
        for c in num_c2 if (cur_df[c].quantile(.75)-cur_df[c].quantile(.25))>0)
    b1,b2,b3,b4=st.columns(4)
    with b1:
        if st.button("🩹 Fix Missing" if has_missing else "✅ No Missing",disabled=not has_missing,key=f"bm_{prep_target[:8]}"):
            nj,msg=fix_missing(cur_json); stack.append(("🩹 Fix Missing",nj)); log.append(("🩹 Missing",msg))
            detect_problems.clear(); st.rerun()
    with b2:
        if st.button("🗑️ Remove Dups" if has_dups else "✅ No Duplicates",disabled=not has_dups,key=f"bd_{prep_target[:8]}"):
            nj,msg=fix_duplicates(cur_json); stack.append(("🗑️ Remove Dups",nj)); log.append(("🗑️ Duplicates",msg))
            detect_problems.clear(); st.rerun()
    with b3:
        if st.button("📐 Cap Outliers" if has_out else "✅ No Extremes",disabled=not has_out,key=f"bo_{prep_target[:8]}"):
            nj,msg=fix_outliers(cur_json); stack.append(("📐 Cap Outliers",nj)); log.append(("📐 Outliers",msg))
            detect_problems.clear(); st.rerun()
    with b4:
        if st.button("🔤 Encode Text" if has_text else "✅ No Text Cols",disabled=not has_text,key=f"be_{prep_target[:8]}"):
            nj,msg,mapping=fix_encode(cur_json); stack.append(("🔤 Encode Text",nj)); log.append(("🔤 Encoding",msg))
            st.session_state["enc_mapping"][active_name]=mapping; detect_problems.clear(); st.rerun()

    if st.session_state["enc_mapping"].get(active_name):
        with st.expander("🗂️ Encoding Map",expanded=False):
            for col,vm in st.session_state["enc_mapping"][active_name].items():
                st.markdown(f"**`{col}`**")
                mdf=pd.DataFrame(list(vm.items()),columns=["Original","Encoded"]).sort_values("Encoded")
                st.dataframe(mdf,use_container_width=True,height=min(200,35*len(mdf)+38))

    if log:
        st.markdown("---"); sec_hdr("📋","Change Log","green")
        for name2,msg in log:
            st.markdown(f'<div class="log-item"><b>{name2}:</b> {msg}</div>',unsafe_allow_html=True)
        cur_df2=_json_to_df(stack[-1][1]); ca,cb=st.columns(2)
        with ca:
            st.markdown('<div class="diff-label dl-red">📌 Before</div>',unsafe_allow_html=True)
            st.markdown(f'<div class="diff-before"><div style="font-size:.79rem;color:#d1d5db">📏 {prep_raw.shape[0]:,}×{prep_raw.shape[1]} &nbsp;|&nbsp; ❓ {prep_raw.isnull().sum().sum():,} missing &nbsp;|&nbsp; 📋 {prep_raw.duplicated().sum():,} dups</div></div>',unsafe_allow_html=True)
            st.dataframe(prep_raw.head(5),use_container_width=True,height=165)
        with cb:
            st.markdown('<div class="diff-label dl-green">✅ After</div>',unsafe_allow_html=True)
            st.markdown(f'<div class="diff-after"><div style="font-size:.79rem;color:#d1d5db">📏 {cur_df2.shape[0]:,}×{cur_df2.shape[1]} &nbsp;|&nbsp; ❓ {cur_df2.isnull().sum().sum():,} missing &nbsp;|&nbsp; 📋 {cur_df2.duplicated().sum():,} dups</div></div>',unsafe_allow_html=True)
            st.dataframe(cur_df2.head(5),use_container_width=True,height=165)
        st.download_button("⬇️ Download Cleaned CSV",cur_df2.to_csv(index=False).encode(),
            file_name=f"cleaned_{prep_target[:25].replace(' ','_')}.csv",mime="text/csv")
        cu,cr=st.columns(2)
        with cu:
            if st.button("↩️ Undo"): stack.pop(); log.pop(); detect_problems.clear(); st.rerun()
        with cr:
            if st.button("🔄 Reset All"):
                st.session_state["prep_transforms"][active_name]=[]; st.session_state["prep_log"][active_name]=[]
                if active_name in st.session_state["enc_mapping"]: del st.session_state["enc_mapping"][active_name]
                detect_problems.clear(); st.rerun()
    else:
        st.info("No fixes applied yet. Click buttons above or proceed if data is already clean.")

    if ws==2:
        st.markdown("<br>",unsafe_allow_html=True)
        c1,_=st.columns([1,4])
        with c1:
            if st.button("Continue to Analysis →",type="primary"):
                st.session_state["wizard_step"]=3; st.rerun()
    st.divider()

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — ANALYSIS & PROFILING
# ═══════════════════════════════════════════════════════════════════════════════
if ws>=3:
    stack3=st.session_state["prep_transforms"].get(active_name,[])
    df_active=_json_to_df(stack3[-1][1]) if stack3 else raw_df.copy()
    sec_hdr("⚡","Step 3 — Analysis & Profiling","purple",
            subtitle=f"{df_active.shape[0]:,} rows × {df_active.shape[1]} cols")

    adv_tab,run_tab,eda_tab=st.tabs(["🎯 Algorithm Advisor","🤖 Run ML Models","🔬 EDA Profiling"])

    with adv_tab:
        render_algo_advisor(df_active)

    with eda_tab:
        render_eda_section(df_active)

    with run_tab:
        numeric_cols=df_active.select_dtypes(include=[np.number]).columns.tolist()
        all_cols=df_active.columns.tolist()

        for group_id,gmeta in GROUP_META.items():
            methods_in=[(n,m) for n,m in METHODS.items() if m["group"]==group_id]
            st.markdown(f'<div style="font-size:.79rem;font-weight:700;color:{gmeta["color"]};margin:11px 0 6px;letter-spacing:.02em">{gmeta["icon"]} {gmeta["label"]}</div>',unsafe_allow_html=True)
            cols_m=st.columns(min(4,len(methods_in)))
            for i,(mname,meta) in enumerate(methods_in):
                in_sel=mname in st.session_state["selected_methods"]
                with cols_m[i%len(cols_m)]:
                    sel_cls=" sel" if in_sel else ""
                    st.markdown(
                        f'<div class="method-card{sel_cls}"><span class="mbadge {meta["badge"]}">{group_id[:4].upper()}</span>'
                        f'<div class="method-name">{mname}</div><div class="method-vn">{meta["vn"]}</div>'
                        f'<div class="method-desc">{meta["desc"]}</div></div>',unsafe_allow_html=True)
                    if in_sel:
                        if st.button("✓ Remove",key=f"rm_{mname}"): st.session_state["selected_methods"].remove(mname); st.rerun()
                    else:
                        if st.button("＋ Select",key=f"add_{mname}"): st.session_state["selected_methods"].append(mname); st.rerun()

        sel=st.session_state["selected_methods"]
        if sel:
            sel_html=" ".join(f'<span style="background:rgba(59,130,246,.15);color:#60a5fa;padding:2px 9px;border-radius:4px;font-size:.74rem">{m}</span>' for m in sel)
            st.markdown(f'<div style="margin:7px 0">Selected: {sel_html}</div>',unsafe_allow_html=True)
            if st.button("🗑️ Clear all"): st.session_state["selected_methods"]=[]; st.rerun()

        st.markdown("---")
        has_clf=any(METHODS[m]["group"]=="classification" for m in sel)
        has_pred=any(METHODS[m]["group"]=="prediction" for m in sel)
        has_clus=any(METHODS[m]["group"]=="association" and "Cluster" in m for m in sel)
        has_assoc="Association Rules (Apriori)" in sel
        target_col=None; feature_cols=[]; test_size=.2; balance_opt="None"
        n_clusters=3; clus_features=[]; min_sup=.05; min_conf=.3; min_lift=1.0

        if has_clf or has_pred:
            sec_hdr("⚙️","Configure Supervised Learning","blue")
            ca2,cb2=st.columns(2)
            with ca2:
                auto_t=suggest_target(df_active)
                if auto_t: st.markdown(f'<div style="font-size:.74rem;color:#34d399;margin-bottom:3px">✅ Auto-suggested: <b>{auto_t}</b></div>',unsafe_allow_html=True)
                def_idx=all_cols.index(auto_t) if auto_t and auto_t in all_cols else 0
                target_col=st.selectbox("🎯 Target column",all_cols,index=def_idx)
            with cb2:
                feature_cols=st.multiselect("📐 Feature columns",[c for c in all_cols if c!=target_col],
                    default=[c for c in numeric_cols if c!=target_col][:10])
            test_size=st.slider("Test split %",10,40,20,help="20% = train on 80%, evaluate on 20%.")/100
            if has_clf: balance_opt=st.selectbox("Class balancing",["None","Random Oversampling","SMOTE"])

        if has_clus:
            sec_hdr("⚙️","Configure Clustering","green")
            cc1,cc2=st.columns(2)
            with cc1: clus_features=st.multiselect("Clustering features",numeric_cols,default=numeric_cols[:8])
            with cc2: n_clusters=st.slider("Number of clusters (K)",2,10,3)

        if has_assoc:
            sec_hdr("⚙️","Configure Association Rules","amber")
            ra1,ra2,ra3=st.columns(3)
            with ra1: min_sup=st.slider("Min Support",0.01,.5,.05,.01)
            with ra2: min_conf=st.slider("Min Confidence",.1,1.,.3,.05)
            with ra3: min_lift=st.slider("Min Lift",1.,10.,1.,.1)

        if not sel: st.info("👆 Select at least one method above to run analysis.")
        elif st.button("🚀 Run Selected Methods",type="primary"):
            st.session_state["run_results"]=[]; st.session_state["run_exports"]={}
            for method in sel:
                group=METHODS[method]["group"]
                sec_hdr("▶","Running: "+method,"purple")
                try:
                    if group=="classification":
                        if not feature_cols: st.error(f"{method}: select feature columns."); continue
                        metrics,mdl,X_te,y_te,y_pred=run_classification(method,df_active,target_col,feature_cols,test_size,balance_opt)
                        st.session_state["run_results"].append(metrics)
                        pred_df=df_active.iloc[:len(y_te)][feature_cols].copy()
                        pred_df["Actual"]=y_te; pred_df["Predicted"]=y_pred
                        st.session_state["run_exports"][f"{method}_predictions"]=pred_df
                    elif group=="prediction":
                        if not feature_cols: st.error(f"{method}: select feature columns."); continue
                        metrics=run_regression(method,df_active,target_col,feature_cols,test_size)
                        st.session_state["run_results"].append(metrics)
                    elif group=="association":
                        if "Cluster" in method:
                            fc=clus_features if clus_features else numeric_cols[:6]
                            metrics,df_out=run_clustering(method,df_active,fc,n_clusters)
                            st.session_state["run_results"].append(metrics)
                            st.session_state["run_exports"][f"{method}_clusters"]=df_out
                        else:
                            metrics,rules_df=run_association(df_active,min_sup,min_conf,min_lift)
                            if metrics:
                                st.session_state["run_results"].append(metrics)
                                if rules_df is not None: st.session_state["run_exports"]["Association_Rules"]=rules_df
                    elif group=="balancing":
                        if not feature_cols: st.error(f"{method}: select feature columns."); continue
                        df_enc2=encode_df(df_active[feature_cols+[target_col]].dropna())
                        X_=df_enc2[feature_cols].values; y_=df_enc2[target_col].values
                        orig=pd.Series(y_).value_counts()
                        if method=="Random Oversampling": Xr,yr=RandomOverSampler(random_state=42).fit_resample(X_,y_)
                        else: Xr,yr=SMOTE(random_state=42).fit_resample(X_,y_)
                        bc1,bc2=st.columns(2)
                        with bc1: st.subheader("Before"); st.bar_chart(orig)
                        with bc2: st.subheader("After"); st.bar_chart(pd.Series(yr).value_counts())
                        st.success(f"{method}: {len(y_):,} → {len(yr):,} samples.")
                        st.session_state["run_results"].append({"Method":method,"Before rows":len(y_),"After rows":len(yr)})
                except Exception as e: st.error(f"Error running {method}: {e}")
            st.session_state["wizard_step"]=4; st.rerun()

    if ws==3:
        st.markdown("<br>",unsafe_allow_html=True)
        c1,_=st.columns([1,4])
        with c1:
            if st.button("Skip to Advise Mode →"): st.session_state["wizard_step"]=4; st.rerun()
    st.divider()

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — ADVISE & PREDICT
# ═══════════════════════════════════════════════════════════════════════════════
if ws>=4:
    stack4=st.session_state["prep_transforms"].get(active_name,[])
    df_active=_json_to_df(stack4[-1][1]) if stack4 else raw_df.copy()
    sec_hdr("🧠","Step 4 — Advise & Predict","purple",subtitle="AI Blueprint · Results · Export")

    adv_tab1,adv_tab2,adv_tab3=st.tabs(["🤖 AI Blueprint","📊 Results & Analysis","⬇️ Export"])

    with adv_tab1:
        sec_hdr("🎯","Describe Your Goal","blue",subtitle="AI will advise the best approach")
        user_goal=st.text_area("What do you want to predict or discover?",
            value=st.session_state.get("user_goal",""),
            placeholder="e.g. 'Predict which customers will churn' · 'Find customer segments' · 'Discover which products are bought together'…",
            height=80,key="ugi")
        st.session_state["user_goal"]=user_goal
        g_key=st.session_state.get("gemini_key","").strip(); o_key=st.session_state.get("openrouter_key","").strip()
        if not g_key and not o_key: st.warning("⚠️ Add an AI key in the sidebar. ML runs without one.")
        col_b1,col_b2,_=st.columns([1,1,3])
        with col_b1: analyse_clicked=st.button("🔎 Generate Blueprint",type="primary")
        with col_b2:
            if st.session_state["ai_blueprint"]:
                if st.button("🔄 Re-run"): st.session_state["ai_blueprint"]=""; st.rerun()

        if analyse_clicked and user_goal.strip():
            all_l4=st.session_state.get("sheets",{})
            summary_parts=[]
            for sn,sdf in all_l4.items():
                ps=st.session_state["prep_transforms"].get(sn,[])
                udf=_json_to_df(ps[-1][1]) if ps else sdf
                summary_parts.append(f"{'='*50}\nFILE: {sn}{'[CLEANED]' if ps else ''}\n{'='*50}\n"+df_summary(udf,sn))
            col_freq=Counter(c for d in all_l4.values() for c in d.columns)
            shared=[c for c,n in col_freq.items() if n>1]
            rel_note=f"\nSHARED COLUMNS (join keys): {', '.join(shared)}\n" if shared else "\nNo shared columns.\n"
            prompt=(f"You are an expert data scientist. {len(all_l4)} file(s) uploaded.\n\n"
                    +"\n\n".join(summary_parts)+rel_note+
                    f"\nUSER GOAL: {user_goal}\n\n"
                    "Provide a CONCISE blueprint:\n\n"
                    "1. DATASET UNDERSTANDING — file contents, column roles, data types.\n"
                    "2. DATA QUALITY ISSUES — per-file: missing %, outliers, text columns, duplicates.\n"
                    "3. RECOMMENDED TRANSFORMATIONS — fix order, merge strategy, feature engineering.\n"
                    "4. BEST TECHNIQUES — recommend 2-3 from: Logistic Regression, Random Forest, Linear Regression, Neural Networks (MLP), K-Means Clustering, Hierarchical Clustering, Association Rules (Apriori), LDA, KNN, Naive Bayes, SVM. Explain WHY. State top 2 to compare.\n"
                    "5. TARGET & FEATURE COLUMNS — exact column names, why this target.\n"
                    "6. EXPECTED CHALLENGES — class imbalance, high cardinality, collinearity.\n\n"
                    "FORMATTING: No **, no #, no dashes. Plain numbered paragraphs. Reference actual column names. Max 550 words.")
            with st.spinner(f"AI analysing {len(all_l4)} file(s)…"):
                result=ask_ai(prompt)
            st.session_state["ai_blueprint"]=result

        if st.session_state["ai_blueprint"]:
            render_ai_box(st.session_state["ai_blueprint"],"🤖 AI Blueprint")
            c_vn,_=st.columns([1,3])
            with c_vn:
                if st.button("🇻🇳 Dịch sang Tiếng Việt",key="tbp"):
                    with st.spinner("Đang dịch…"):
                        vn=ask_ai(f"Translate to natural Vietnamese. No markdown. Plain paragraphs.\n\n{st.session_state['ai_blueprint'][:3000]}")
                    st.session_state["ai_vn"]=vn
            if st.session_state.get("ai_vn"): render_ai_box(st.session_state["ai_vn"],"🇻🇳 Phân tích Tiếng Việt")
        if st.session_state["ai_blueprint"] and not st.session_state["run_results"]:
            st.markdown('<div style="background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.25);border-radius:10px;padding:12px 16px;font-size:.82rem;color:#6ee7b7;margin-top:12px">💡 <b>Next:</b> Go to <b>Step 3 → Run ML Models</b> to execute recommended methods, then return here for full analysis.</div>',unsafe_allow_html=True)

    with adv_tab2:
        results=st.session_state.get("run_results",[])
        if not results: st.info("No results yet — run models in Step 3 first.")
        else:
            sec_hdr("📋","Methods Comparison","blue")
            cmp_df=pd.DataFrame(results)
            col_order=["Sheet","Method","Accuracy","Precision","Recall","F1-Score","AUC","R²","RMSE","K","Silhouette","Rules found","Train rows","Test rows","Rows"]
            col_order=[c for c in col_order if c in cmp_df.columns]
            cmp_df=cmp_df[col_order]; st.dataframe(cmp_df,use_container_width=True)
            if "F1-Score" in cmp_df.columns:
                try:
                    best=cmp_df.loc[cmp_df["F1-Score"].astype(float).idxmax()]
                    st.success(f"🏆 Best: **{best.get('Method','')}** — F1 = {best['F1-Score']}")
                except Exception: pass
            elif "R²" in cmp_df.columns:
                try:
                    best=cmp_df.loc[cmp_df["R²"].astype(float).idxmax()]
                    st.success(f"🏆 Best regression: **{best.get('Method','')}** — R² = {best['R²']}")
                except Exception: pass

            # Fitness report
            render_fitness_report(results, df_active, st.session_state.get("user_goal",""))

            st.markdown("---"); sec_hdr("🤖","AI Analysis of Results","purple")
            if st.button("🔎 Generate AI Explanation",type="primary",key="gaie"):
                results_text=cmp_df.to_string(index=False)
                prompt2=(f"You are a data mining expert.\n\nDATASET: {active_name} ({df_active.shape[0]} rows x {df_active.shape[1]} cols)\n"
                         f"USER GOAL: {st.session_state.get('user_goal','(not specified)')}\n\nRESULTS:\n{results_text}\n\n"
                         "Provide:\n1. OVERALL PERFORMANCE SUMMARY — best/worst and why.\n"
                         "2. METHOD-BY-METHOD ANALYSIS — what each metric means.\n"
                         "3. COMPARISON INSIGHTS — winner and what differences reveal.\n"
                         "4. PRACTICAL RECOMMENDATIONS — what to deploy, what to improve.\n"
                         "5. RED FLAGS — overfitting, class imbalance, low AUC, weak silhouette.\n\n"
                         "FORMATTING: No **, no #, no dashes. Plain numbered paragraphs. Max 500 words.")
                with st.spinner("AI analysing results…"):
                    ai_exp=ask_ai(prompt2)
                st.session_state["comparison_ai"]=ai_exp
            if st.session_state.get("comparison_ai"):
                render_ai_box(st.session_state["comparison_ai"],"🤖 AI Analysis")
                c_vn2,_=st.columns([1,3])
                with c_vn2:
                    if st.button("🇻🇳 Dịch kết quả",key="trr"):
                        with st.spinner("Đang dịch…"):
                            vn2=ask_ai(f"Translate to natural Vietnamese. No markdown.\n\n{st.session_state['comparison_ai'][:3000]}")
                        st.session_state["ai_vn"]=vn2
                if st.session_state.get("ai_vn"): render_ai_box(st.session_state["ai_vn"],"🇻🇳 Giải thích Tiếng Việt")

    with adv_tab3:
        sec_hdr("⬇️","Export All Results","green")
        results_exp=st.session_state.get("run_results",[])
        if not results_exp: st.info("Run models in Step 3 first.")
        else:
            cmp_df2=pd.DataFrame(results_exp)
            exp_sheets={"Comparison Table":cmp_df2}
            for label,df_exp in st.session_state.get("run_exports",{}).items(): exp_sheets[label[:31]]=df_exp
            if st.session_state.get("comparison_ai"):
                exp_sheets["AI Explanation"]=pd.DataFrame({"AI Explanation":st.session_state["comparison_ai"].split("\n")})
            if st.session_state.get("ai_blueprint"):
                exp_sheets["AI Blueprint"]=pd.DataFrame({"AI Blueprint":st.session_state["ai_blueprint"].split("\n")})
            for sname in exp_sheets:
                df_p=exp_sheets[sname]
                st.markdown(f'<div style="background:#0f1629;border:1px solid #1f2937;border-radius:7px;padding:6px 12px;margin-bottom:4px;font-size:.79rem;color:#9ca3af">📑 <b style="color:#60a5fa">{sname}</b> — {df_p.shape[0]:,} rows × {df_p.shape[1]} cols</div>',unsafe_allow_html=True)
            st.markdown("<br>",unsafe_allow_html=True)
            excel_bytes=export_to_excel(exp_sheets)
            st.download_button("⬇️ Download Full Results (Excel)",data=excel_bytes,
                file_name=f"DataMineAI_{active_name[:20].replace(' ','_')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    st.markdown("---")
    if st.button("🔄 Start New Analysis (reset all)"):
        for key2 in ["wizard_step","ai_blueprint","prep_transforms","prep_log","enc_mapping",
                     "user_goal","selected_methods","run_results","run_exports","comparison_ai","ai_vn"]:
            if isinstance(DEFAULTS.get(key2),dict): st.session_state[key2]={}
            elif isinstance(DEFAULTS.get(key2),list): st.session_state[key2]=[]
            else: st.session_state[key2]=DEFAULTS.get(key2,"")
        st.session_state["wizard_step"]=1; st.rerun()
