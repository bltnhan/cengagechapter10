"""api.config — cấu hình lấy từ biến môi trường (thay cho st.secrets/sidebar)."""
from __future__ import annotations

import os
from dataclasses import dataclass


def _truthy(v: str) -> bool:
    return v.lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    # API keys cho AI — lấy từ env (KHÔNG hard-code, KHÔNG đọc st.secrets).
    gemini_key: str = os.getenv("GEMINI_KEY", "")
    openrouter_key: str = os.getenv("OPENROUTER_KEY", "")
    # Giới hạn upload (MB) — đối chiếu maxUploadSize=200 của Streamlit.
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "200"))

    # ── Queue (BƯỚC 3) ──
    # REDIS_URL rỗng  → dev/test: dùng fakeredis + chạy job INLINE (không cần worker).
    # REDIS_URL có    → production: enqueue lên Redis, worker process xử lý (async).
    # QUEUE_SYNC=true → ép chạy inline kể cả khi có REDIS_URL (debug).
    redis_url: str = os.getenv("REDIS_URL", "")
    queue_sync: bool = _truthy(os.getenv("QUEUE_SYNC", ""))
    queue_name: str = os.getenv("QUEUE_NAME", "datamine")
    job_timeout: int = int(os.getenv("JOB_TIMEOUT", "600"))      # giây cho 1 job ML
    job_result_ttl: int = int(os.getenv("JOB_RESULT_TTL", "3600"))  # giữ kết quả để export

    # ── Dataset store (Redis — để web scale nhiều replica) ──
    redis_key_prefix: str = os.getenv("REDIS_KEY_PREFIX", "dm")
    dataset_ttl: int = int(os.getenv("DATASET_TTL", "86400"))    # 24h — dataset hết hạn nếu không dùng
    dataset_max_history: int = int(os.getenv("DATASET_MAX_HISTORY", "50"))  # giới hạn undo-stack


settings = Settings()
