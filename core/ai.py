"""
core.ai — Client gọi LLM (Gemini REST + OpenRouter fallback), thuần Python.

Tách từ Streamlit.py:
  _call_openrouter / _call_gemini_rest / ask_ai / ask_ai_stream

Khác biệt so với bản gốc:
  - API key được TRUYỀN VÀO tường minh (gemini_key/openrouter_key) thay vì đọc
    từ st.session_state / st.secrets qua `_get_keys()`. Tầng ngoài (FastAPI) tự
    lấy key từ env/secret store rồi truyền xuống.

CẢNH BÁO KIẾN TRÚC (Phương án B): các hàm dưới dùng `requests` ĐỒNG BỘ (blocking).
Khi đưa vào FastAPI nên chạy chúng trong worker/threadpool, hoặc viết lại bằng
httpx.AsyncClient — KHÔNG gọi trực tiếp trong async request handler.
"""
from __future__ import annotations

import json
from typing import Iterator

import requests

# ─── Constants ───────────────────────────────────────────────────────────────
GEMINI_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS = ["openrouter/auto", "google/gemma-3-27b-it:free",
                     "meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-r1:free", "qwen/qwq-32b:free"]


def call_openrouter(prompt: str, or_key: str) -> str:
    if not or_key:
        return ""
    headers = {"Authorization": f"Bearer {or_key}", "Content-Type": "application/json",
               "HTTP-Referer": "https://datamine-ai.streamlit.app", "X-Title": "DataMine AI"}
    for model in OPENROUTER_MODELS:
        try:
            resp = requests.post(OPENROUTER_URL, headers=headers,
                                 json={"model": model, "messages": [{"role": "user", "content": prompt}],
                                       "max_tokens": 2000, "temperature": 0.7}, timeout=120)
            if resp.status_code == 401:
                return "__OR_FAIL__: Invalid key."
            data = resp.json()
            if "choices" in data and data["choices"]:
                return data["choices"][0]["message"]["content"]
        except Exception:
            continue
    return ""


def call_gemini_rest(prompt_text: str, api_key: str, model: str = "gemini-2.5-flash") -> str:
    """Gọi Gemini REST API trực tiếp — không phụ thuộc version thư viện."""
    url = f"{GEMINI_BASE_URL}/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt_text}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
    }
    resp = requests.post(url,
                         headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
                         json=payload, timeout=60)
    if resp.status_code == 401:
        raise ValueError("API Key không hợp lệ (401). Kiểm tra lại key.")
    if resp.status_code == 429:
        raise ValueError("Rate limit (429). Chờ 60 giây rồi thử lại.")
    if resp.status_code == 404:
        raise ValueError(f"Model '{model}' không tồn tại (404).")
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def ask_ai(prompt: str, gemini_key: str = "", openrouter_key: str = "") -> str:
    """Thử lần lượt các model Gemini, rồi fallback OpenRouter. Trả về text (hoặc message lỗi)."""
    if not gemini_key and not openrouter_key:
        return "⚠️ Chưa có API Key. Vui lòng cung cấp Gemini key."
    last_err = None
    if gemini_key:
        for model_name in GEMINI_CANDIDATES:
            try:
                return call_gemini_rest(prompt, gemini_key, model_name)
            except ValueError as e:
                # Lỗi xác định (key sai, rate limit) — dừng luôn
                return f"❌ {e}"
            except Exception as e:
                last_err = e
                continue  # thử model tiếp
    if openrouter_key:
        result = call_openrouter(prompt, openrouter_key)
        if result and not result.startswith("__OR_FAIL__"):
            return result
    err_str = str(last_err) if last_err else "Không tìm thấy lỗi cụ thể"
    return f"❌ Tất cả model đều thất bại.\nLỗi cuối: {err_str}"


def ask_ai_stream(messages_for_api, gemini_key: str = "", openrouter_key: str = "") -> Iterator[str]:
    """Gọi Gemini SSE streaming — yield từng chunk text. Fallback OpenRouter (không stream)."""
    if not gemini_key and not openrouter_key:
        raise ValueError("Chưa có API Key. Cung cấp Gemini key.")

    last_error = None

    if gemini_key:
        for model_name in GEMINI_CANDIDATES:
            try:
                url = f"{GEMINI_BASE_URL}/{model_name}:streamGenerateContent?alt=sse"
                payload = {
                    "contents": messages_for_api,
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
                }
                resp = requests.post(url,
                                     headers={"Content-Type": "application/json", "x-goog-api-key": gemini_key},
                                     json=payload, stream=True, timeout=120)
                if resp.status_code == 401:
                    raise ValueError("API Key không hợp lệ (401). Kiểm tra lại key.")
                if resp.status_code == 429:
                    raise ValueError("Rate limit (429). Chờ 60 giây rồi thử lại.")
                if resp.status_code == 404:
                    last_error = Exception(f"Model {model_name} không tồn tại")
                    continue
                resp.raise_for_status()
                got_text = False
                for raw in resp.iter_lines(decode_unicode=True):
                    if not raw or not raw.startswith("data:"):
                        continue
                    data_str = raw[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        text = chunk["candidates"][0]["content"]["parts"][0]["text"]
                        if text:
                            got_text = True
                            yield text
                    except Exception:
                        continue
                if got_text:
                    return
            except ValueError:
                raise  # key/rate limit — raise ngay
            except Exception as e:
                last_error = e
                continue

    # Fallback OpenRouter (không stream)
    if openrouter_key:
        try:
            history_text = "\n".join(
                f"{m['role'].upper()}: {m['parts'][0]['text']}" for m in messages_for_api
            )
            result = call_openrouter(history_text, openrouter_key)
            if result and not result.startswith("__OR_FAIL__"):
                yield result
                return
        except Exception as e:
            last_error = e

    raise RuntimeError(
        f"Tất cả model thất bại. Lỗi: {last_error}" if last_error
        else "Không kết nối được AI. Kiểm tra API key và mạng."
    )
