# Deploy lên Railway — DataMine AI API (Phương án B)

Kiến trúc chạy trên Railway gồm **3 service** trong cùng 1 project, chung 1 repo (1 Docker image, đổi start command):

```
┌────────────┐   enqueue job    ┌─────────┐   lấy job    ┌──────────────┐
│  web        │ ───────────────► │  Redis  │ ───────────► │  worker       │
│ uvicorn     │ ◄─ poll result ─ │ (plugin)│ ◄─ lưu kết quả│ python worker.py│
│ api.main:app│                  └─────────┘              │ (scale nhiều) │
└────────────┘                                            └──────────────┘
```

- **web**: chỉ enqueue + trả `job_id` + poll → luôn nhẹ, không bị block bởi ML.
- **worker**: chạy ML nặng ở process riêng → scale độc lập = thứ thực sự hết "queued".
- **Redis**: hàng đợi job + lưu kết quả (MLResult).

---

## 1. Chuẩn bị
- Push branch lên GitHub (repo share `origin`), hoặc dùng `railway up` từ máy.
- File đã có sẵn trong repo: `Dockerfile`, `.dockerignore`, `railway.json`, `requirements-api.txt`, `worker.py`.

## 2. Tạo project + Redis
1. Railway → **New Project** → từ GitHub repo (chọn branch `feature/decouple-streamlit`).
2. **Add → Database → Redis**. Railway tạo biến `REDIS_URL` (tham chiếu `${{Redis.REDIS_URL}}`).

## 3. Service WEB (đã tự cấu hình qua `railway.json`)
- Build: Dockerfile. Deploy: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`, healthcheck `/health`.
- **Variables**:
  - `REDIS_URL` = `${{Redis.REDIS_URL}}`
  - `GEMINI_KEY` = *(key Gemini)*
  - `OPENROUTER_KEY` = *(tùy chọn)*
  - *(KHÔNG cần set `PORT` — Railway tự cấp)*
- **Settings → Networking → Generate Domain** để có URL public (Swagger: `https://<domain>/docs`).

## 4. Service WORKER (tạo thêm từ CÙNG repo)
Image dùng chung; vai trò chọn bằng biến môi trường `ROLE` (xem `start.sh`), KHÔNG cần đổi start command.
1. **Add → GitHub Repo** (cùng repo/branch) → tạo service thứ hai.
2. **Variables**: `ROLE=worker`, `REDIS_URL=${{Redis.REDIS_URL}}`, `GEMINI_KEY`, `OPENROUTER_KEY`.
3. KHÔNG cần domain/healthcheck cho worker.
4. **Scale**: tăng số replica của worker (Settings → Replicas) để xử lý nhiều job song song.

> Trên Railway (Linux) `worker.py` dùng RQ `Worker` (fork). `start.sh` tự `exec python worker.py` khi `ROLE=worker`.

## 5. Kiểm tra
```bash
curl https://<web-domain>/health
# {"status":"ok", ... ,"queue_mode":"async (redis+worker)"}   ← phải là async, KHÔNG phải inline
```
Nếu `queue_mode` là `inline` nghĩa là `REDIS_URL` chưa được set ở service web.

Luồng thử: `POST /datasets` (upload) → `POST /datasets/{id}/run` (nhận `job_id`) →
`GET /jobs/{id}` (poll tới `finished`) → `GET /jobs/{id}/export.xlsx`.

---

## Chạy thử bằng Docker ở local (tùy chọn)
```bash
docker build -t datamine-api .
# web (job chạy inline vì không set REDIS_URL):
docker run --rm -e PORT=8000 -p 8000:8000 datamine-api
# với Redis thật + worker:
docker run --rm -e REDIS_URL=redis://host.docker.internal:6379/0 -e PORT=8000 -p 8000:8000 datamine-api
docker run --rm -e REDIS_URL=redis://host.docker.internal:6379/0 datamine-api python worker.py
```

---

## ⚠️ Giới hạn hiện tại (cần xử lý trước khi scale WEB > 1 replica)
- **Dataset store đang in-memory trong process web** (`api/store.py`). Upload và run phải vào **cùng 1 web replica**.
  - ✅ Worker KHÔNG bị ảnh hưởng (DataFrame được truyền vào job khi enqueue) → cứ scale worker thoải mái.
  - ➡️ Trước khi scale web nằm ngang: chuyển dataset store sang **Redis/object storage** (TODO bước sau).
  - Tạm thời: để **web = 1 replica**, scale **worker = N replica**. Vẫn hết "queued" vì compute nằm ở worker.
- `/ai/ask` hiện gọi AI blocking trong web (có thể đẩy vào job nếu cần).
