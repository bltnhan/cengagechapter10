# Dockerfile — image dùng chung cho WEB (uvicorn) và WORKER (worker.py).
# Phương án B / Bước 4 — deploy Railway (hoặc bất kỳ host Docker nào).
#
# Một image, hai vai trò (đổi start command):
#   web    : uvicorn api.main:app --host 0.0.0.0 --port $PORT     (mặc định CMD)
#   worker : python worker.py
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

# libgomp1: runtime OpenMP cho scikit-learn / scipy
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài deps trước (layer cache) — KHÔNG dùng requirements.txt (đó là của Streamlit)
COPY requirements-api.txt ./
RUN pip install -r requirements-api.txt

# Chỉ copy phần cần cho API/worker (KHÔNG copy Streamlit.py / Next.js / tài liệu)
COPY core ./core
COPY api ./api
COPY web ./web
COPY worker.py start.sh ./

EXPOSE 8000

# Vai trò chọn theo $ROLE (web mặc định / worker). Railway cấp $PORT cho web.
CMD ["sh", "/app/start.sh"]
