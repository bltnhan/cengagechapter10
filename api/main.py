"""
api.main — FastAPI app bọc core (Phương án B, bước 2).

Luồng tương ứng 4 step của Streamlit, nhưng dưới dạng REST endpoint:
  STEP 1 LOAD     → POST /datasets                 (upload file)
  STEP 2 PREP     → GET  /datasets/{id}/problems
                    POST /datasets/{id}/prep        (missing/duplicates/outliers/encode...)
                    POST /datasets/{id}/undo
  STEP 3 ANALYSIS → POST /datasets/{id}/run         (classification/regression/clustering/association)
  STEP 4 ADVISE   → POST /ai/ask
                    GET  /runs/{id}/export.xlsx
"""
from __future__ import annotations

import io
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from rq.exceptions import NoSuchJobError
from rq.job import Job, JobStatus

from core import ai, dataio, eda, excel_export, prep

from .config import settings
from .queue import get_connection, get_queue, is_async
from .schemas import AskRequest, PrepRequest, RunRequest, ReloadRequest
from .serializers import dataset_summary, mlresult_to_json, table_to_json
from .store import store
from .tasks import execute_run

app = FastAPI(title="DataMine AI API", version="0.1.0",
              description="Tầng API thuần (FastAPI) bọc lõi ML core — Phương án B")

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ── helpers ──────────────────────────────────────────────────────────────────
def _get_ds(dataset_id: str):
    try:
        return store.get_dataset(dataset_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"dataset '{dataset_id}' không tồn tại")


def _get_job(job_id: str) -> Job:
    try:
        return Job.fetch(job_id, connection=get_connection())
    except NoSuchJobError:
        raise HTTPException(status_code=404, detail=f"job '{job_id}' không tồn tại")


def _job_result(job: Job):
    """Lấy giá trị trả về của job (MLResult), tương thích rq 1.x/2.x."""
    rv = getattr(job, "return_value", None)
    return rv() if callable(rv) else job.result


def _job_response(job: Job) -> dict:
    status = job.get_status(refresh=True)
    status_str = getattr(status, "value", str(status))
    resp = {"job_id": job.id, "status": status_str}
    if status == JobStatus.FINISHED:
        resp["result"] = mlresult_to_json(_job_result(job), run_id=job.id)
    elif status == JobStatus.FAILED:
        info = (job.exc_info or "").strip()
        resp["error"] = info.splitlines()[-1] if info else "job failed"
    return resp


# ── UI (SPA tĩnh) + meta ──────────────────────────────────────────────────────
try:
    _UI_HTML = (Path(__file__).resolve().parent.parent / "web" / "index.html").read_text(encoding="utf-8")
except Exception:
    _UI_HTML = None

# Catalog thuật toán cho UI (khớp tên method trong core.ml.run_*)
METHODS_CATALOG = {
    "classification": ["Logistic Regression", "Linear Discriminant Analysis (LDA)",
                       "K-Nearest Neighbors (KNN)", "Classification Trees", "Naive Bayes",
                       "Support Vector Machine (SVM)", "Random Forest", "Neural Networks (MLP)"],
    "regression": ["Linear Regression", "Neural Networks Regression (MLP)"],
    "clustering": ["K-Means Clustering", "Hierarchical Clustering"],
    "association": [],
}
BALANCE_OPTIONS = ["None", "Random Oversampling", "SMOTE"]


@app.get("/", response_class=HTMLResponse)
def root():
    if _UI_HTML:
        return HTMLResponse(_UI_HTML)
    return RedirectResponse(url="/docs")  # fallback nếu thiếu web/index.html


@app.get("/meta")
def meta():
    return {"tasks": list(METHODS_CATALOG), "methods": METHODS_CATALOG, "balance": BALANCE_OPTIONS}


@app.get("/health")
def health():
    return {"status": "ok", "service": "datamine-api", "version": app.version,
            "queue_mode": "async (redis+worker)" if is_async() else "inline (dev/fakeredis)",
            "store_backend": "redis" if is_async() else "fakeredis (dev)"}


# ── STEP 1: upload ───────────────────────────────────────────────────────────
@app.post("/datasets")
async def upload_dataset(
    file: UploadFile = File(...),
    header_row: int = Form(0),
    sheet_name: str | None = Form(None),
):
    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File vượt {settings.max_upload_mb}MB")
    try:
        lr = dataio.load_dataframe(content, file.filename or "upload.csv",
                                   header_row=header_row, sheet_name=sheet_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    ds = store.add_dataset(lr.key, lr.df, lr.file_cache)
    return dataset_summary(ds, prep)


@app.get("/datasets/{dataset_id}")
def get_dataset(dataset_id: str):
    return dataset_summary(_get_ds(dataset_id), prep)


@app.get("/datasets/{dataset_id}/profile")
def get_profile(dataset_id: str):
    """Column-level statistics (type, missing, unique, stats, sample) cho EDA overview."""
    ds = _get_ds(dataset_id)
    desc_df = ds.df.describe(include="all")
    return {
        "dataset_id": ds.id,
        "columns": eda.column_profile(ds.df),
        "describe": table_to_json(desc_df),
    }


@app.post("/datasets/{dataset_id}/reload")
def reload_dataset(dataset_id: str, req: ReloadRequest):
    """Đọc lại Excel sheet hoặc thay đổi dòng header row."""
    ds = _get_ds(dataset_id)
    if not ds.file_cache:
        raise HTTPException(status_code=400, detail="dataset không hỗ trợ reload (thiếu file_cache)")
    
    def _mutate_reload(ds_obj):
        raw_bytes = ds_obj.file_cache["raw_bytes"]
        engine = ds_obj.file_cache["engine"]
        sheet_names = ds_obj.file_cache["sheet_names"]
        
        chosen = req.sheet_name or ds_obj.file_cache.get("current_sheet") or sheet_names[0]
        if chosen not in sheet_names:
            raise ValueError(f"sheet '{chosen}' không tồn tại")
            
        new_df = dataio.load_sheet(raw_bytes, chosen, engine, req.header_row)
        
        ds_obj.df = new_df
        orig_filename = ds_obj.name.split("::")[0] if "::" in ds_obj.name else ds_obj.name
        ds_obj.name = f"{orig_filename}::{chosen}"
        ds_obj.file_cache["current_sheet"] = chosen
        
        ds_obj.history = []
        ds_obj.enc_mapping = {}
        return "Reloaded successfully"
        
    try:
        updated, msg = store._mutate(dataset_id, _mutate_reload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {
        "message": msg,
        **dataset_summary(updated, prep),
        "problems": prep.detect_problems(updated.df),
    }


@app.get("/datasets/{dataset_id}/eda")
def get_eda(dataset_id: str):
    """Generate EDA charts (distributions, correlations, missing, outliers) as base64 PNG."""
    import base64
    ds = _get_ds(dataset_id)
    result = eda.generate_eda(ds.df)
    resp = {
        "dataset_id": ds.id,
        "profile": result["profile"],
        "strong_correlations": result["strong_correlations"],
    }
    for key in ("distributions", "categorical", "correlation_heatmap", "missing_chart", "outlier_boxplots"):
        png = result.get(key)
        resp[key] = base64.b64encode(png).decode("ascii") if png else None
    return resp


# ── STEP 2: prep ─────────────────────────────────────────────────────────────
@app.get("/datasets/{dataset_id}/problems")
def get_problems(dataset_id: str):
    ds = _get_ds(dataset_id)
    return {"dataset_id": ds.id, "problems": prep.detect_problems(ds.df)}


@app.post("/datasets/{dataset_id}/prep")
def apply_prep(dataset_id: str, req: PrepRequest):
    _get_ds(dataset_id)  # 404 nếu dataset không tồn tại

    # compute chạy TRONG khóa của store, trên df mới nhất (an toàn multi-replica)
    def _compute(df):
        if req.op == "missing":
            ndf, msg = prep.fix_missing(df); return ndf, msg, None
        if req.op == "duplicates":
            ndf, msg = prep.fix_duplicates(df); return ndf, msg, None
        if req.op == "outliers":
            ndf, msg = prep.fix_outliers(df); return ndf, msg, None
        if req.op == "remove_outliers":
            ndf, msg = prep.remove_outliers(df); return ndf, msg, None
        # op == "encode" (pydantic Literal đã chặn giá trị khác)
        ndf, msg, mapping = prep.fix_encode(df, req.encode_type, req.ordinal_orders)
        return ndf, msg, mapping

    updated, msg = store.apply_transform(dataset_id, _compute)
    return {"message": msg, **dataset_summary(updated, prep),
            "problems": prep.detect_problems(updated.df)}


@app.post("/datasets/{dataset_id}/undo")
def undo_prep(dataset_id: str):
    ds = _get_ds(dataset_id)
    updated = store.undo(ds.id)
    return dataset_summary(updated, prep)


# ── STEP 3: run ML (enqueue → job) ───────────────────────────────────────────
def _build_params(req: RunRequest, ds) -> dict:
    """Gói tham số picklable cho job (không kèm DataFrame — df truyền riêng)."""
    def _need(*vals):
        if any(v is None for v in vals):
            raise HTTPException(status_code=422, detail="thiếu target/features cho task này")

    if req.task in ("classification", "regression"):
        _need(req.method, req.target, req.features)
    elif req.task == "clustering":
        _need(req.method, req.features)
    return {
        "method": req.method, "target": req.target, "features": req.features,
        "test_size": req.test_size, "split_seed": req.split_seed,
        "balance": req.balance, "oversample_order": req.oversample_order,
        "hyperparams": req.hyperparams, "n_clusters": req.n_clusters,
        "min_support": req.min_support, "min_confidence": req.min_confidence, "min_lift": req.min_lift,
        "sheet_name": ds.name, "label_encoder": ds.enc_mapping,
    }


@app.post("/datasets/{dataset_id}/run", status_code=202)
def run_model(dataset_id: str, req: RunRequest):
    """Enqueue job ML → trả ngay job_id. KHÔNG chạy ML trong request (tránh block web).

    Production (REDIS_URL): job vào hàng đợi, worker process xử lý → poll GET /jobs/{id}.
    Dev/test (fakeredis): job chạy inline, GET /jobs/{id} trả 'finished' ngay.
    """
    ds = _get_ds(dataset_id)
    params = _build_params(req, ds)
    job = get_queue().enqueue(
        execute_run, req.task, ds.df, params,
        job_timeout=settings.job_timeout, result_ttl=settings.job_result_ttl,
        description=f"{req.task}:{req.method or ''}")
    return _job_response(job)


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Poll trạng thái job: queued/started/finished/failed. Khi finished → kèm 'result'."""
    return _job_response(_get_job(job_id))


# ── STEP 4: export + AI ──────────────────────────────────────────────────────
@app.get("/jobs/{job_id}/export.xlsx")
def export_job(job_id: str):
    job = _get_job(job_id)
    status = job.get_status(refresh=True)
    if status != JobStatus.FINISHED:
        raise HTTPException(status_code=409,
                            detail=f"job chưa xong (status={getattr(status, 'value', status)})")
    result = _job_result(job)
    sd = result.split_data or {}
    # tên sheet Excel không được chứa : \ / ? * [ ]
    tag = (job.description or "result").translate(str.maketrans({c: "_" for c in r':\/?*[]'}))
    results_dict: dict[str, pd.DataFrame] = {}
    if isinstance(sd.get("training_score"), pd.DataFrame):
        results_dict[f"Train_{tag}"[:31]] = sd["training_score"]
    if isinstance(sd.get("validation_score"), pd.DataFrame):
        results_dict[f"Val_{tag}"[:31]] = sd["validation_score"]
    vd = sd.get("validation_details")
    if isinstance(vd, pd.DataFrame) and not vd.empty:
        results_dict[f"Details_{tag}"[:31]] = vd
    if not results_dict:
        results_dict["Result"] = pd.DataFrame(
            list((result.metrics or {}).items()), columns=["Metric", "Value"])

    figures_dict = {fs.label: [fs.png] for fs in result.figures if fs.save}
    xls = excel_export.export_to_excel(results_dict, figures_dict or None)
    return StreamingResponse(
        io.BytesIO(xls), media_type=XLSX_MIME,
        headers={"Content-Disposition": f'attachment; filename="run_{job_id}.xlsx"'})


@app.post("/ai/ask")
def ai_ask(req: AskRequest):
    answer = ai.ask_ai(req.prompt, gemini_key=settings.gemini_key,
                       openrouter_key=settings.openrouter_key)
    return {"answer": answer}
