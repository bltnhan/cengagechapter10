#!/usr/bin/env sh
# Entrypoint chung cho image: chọn vai trò theo $ROLE.
#   ROLE=worker  → RQ worker (xử lý job ML)
#   (mặc định)   → web (uvicorn, Railway cấp $PORT)
set -e
if [ "$ROLE" = "worker" ]; then
  echo "[start] ROLE=worker → RQ worker"
  exec python worker.py
else
  echo "[start] ROLE=web → uvicorn :${PORT:-8000}"
  exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi
