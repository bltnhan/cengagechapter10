"""
api.queue — Hàng đợi job RQ (BƯỚC 3).

Hai chế độ, chọn tự động theo cấu hình (api.config.settings):
  - PRODUCTION (có REDIS_URL, không QUEUE_SYNC): Queue(is_async=True) trên Redis thật.
    `POST /run` chỉ ENQUEUE rồi trả ngay job_id; ML chạy ở process WORKER riêng
    (xem worker.py) → web layer KHÔNG bị block (đây mới là thứ thực sự hết "queued").
  - DEV/TEST (không REDIS_URL): fakeredis + Queue(is_async=False) → job chạy INLINE
    trong cùng process (không cần Redis/worker), nhưng vẫn đúng API job lifecycle.

Connection được tạo MỘT LẦN ở cấp module để job state chia sẻ giữa các request
trong cùng process (quan trọng với fakeredis dev).
"""
from __future__ import annotations

from rq import Queue

from .config import settings

_USE_REAL = bool(settings.redis_url) and not settings.queue_sync


def _build():
    if _USE_REAL:
        import redis
        # decode_responses=False BẮT BUỘC: store (api/store.py) lưu Dataset dạng pickle
        # (bytes) dùng chung connection này — bật decode sẽ làm pickle.loads vỡ.
        conn = redis.from_url(settings.redis_url, decode_responses=False)
        return Queue(settings.queue_name, connection=conn, is_async=True), conn
    # dev/test: fakeredis, chạy inline
    import fakeredis
    conn = fakeredis.FakeStrictRedis()
    return Queue(settings.queue_name, connection=conn, is_async=False), conn


_queue, _conn = _build()


def get_queue() -> Queue:
    return _queue


def get_connection():
    return _conn


def is_async() -> bool:
    return _USE_REAL
