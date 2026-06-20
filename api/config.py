"""api.config — cấu hình lấy từ biến môi trường (thay cho st.secrets/sidebar)."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class Settings:
    # API keys cho AI — lấy từ env (KHÔNG hard-code, KHÔNG đọc st.secrets).
    gemini_key: str = os.getenv("GEMINI_KEY", "")
    openrouter_key: str = os.getenv("OPENROUTER_KEY", "")
    # Giới hạn upload (MB) — đối chiếu maxUploadSize=200 của Streamlit.
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "200"))


settings = Settings()
