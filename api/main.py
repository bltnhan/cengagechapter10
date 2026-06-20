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

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from rq.exceptions import NoSuchJobError
from rq.job import Job, JobStatus

from core import ai, dataio, excel_export, prep

from .config import settings
from .queue import get_connection, get_queue, is_async
from .schemas import AskRequest, PrepRequest, RunRequest
from .serializers import dataset_summary, mlresult_to_json
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


# ── health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "datamine-api", "version": app.version,
            "queue_mode": "async (redis+worker)" if is_async() else "inline (dev/fakeredis)"}


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


# ── STEP 2: prep ─────────────────────────────────────────────────────────────
@app.get("/datasets/{dataset_id}/problems")
def get_problems(dataset_id: str):
    ds = _get_ds(dataset_id)
    return {"dataset_id": ds.id, "problems": prep.detect_problems(ds.df)}


@app.post("/datasets/{dataset_id}/prep")
def apply_prep(dataset_id: str, req: PrepRequest):
    ds = _get_ds(dataset_id)
    df = ds.df
    enc_mapping = None
    if req.op == "missing":
        new_df, msg = prep.fix_missing(df)
    elif req.op == "duplicates":
        new_df, msg = prep.fix_duplicates(df)
    elif req.op == "outliers":
        new_df, msg = prep.fix_outliers(df)
    elif req.op == "remove_outliers":
        new_df, msg = prep.remove_outliers(df)
    elif req.op == "encode":
        new_df, msg, enc_mapping = prep.fix_encode(df, req.encode_type, req.ordinal_orders)
    else:  # pragma: no cover — pydantic Literal đã chặn
        raise HTTPException(status_code=422, detail=f"op không hợp lệ: {req.op}")
    store.apply_transform(ds.id, msg, new_df, enc_mapping)
    return {"message": msg, **dataset_summary(ds, prep),
            "problems": prep.detect_problems(ds.df)}


@app.post("/datasets/{dataset_id}/undo")
def undo_prep(dataset_id: str):
    ds = _get_ds(dataset_id)
    store.undo(ds.id)
    return dataset_summary(ds, prep)


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
