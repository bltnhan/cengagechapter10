"""
worker.py — RQ worker xử lý job ML (BƯỚC 3, production).

Đây là process RIÊNG với web (uvicorn) — đây mới là thứ thực sự loại bỏ "queued":
ML nặng chạy ở (các) worker, web layer chỉ enqueue + trả job_id.

Chạy (Linux/Railway — cần REDIS_URL trỏ tới Redis thật):
    PYTHONPATH=. python worker.py
Scale: chạy nhiều instance worker.py (mỗi cái 1 process) để xử lý song song.

Windows dev: RQ Worker mặc định cần os.fork (không có trên Windows) → dùng
SimpleWorker (chạy job trong cùng process, không fork). Code tự chọn theo OS.
"""
from __future__ import annotations

import os
import platform

import redis
from rq import Queue, SimpleWorker, Worker

# Bắt buộc import để worker resolve được hàm 'api.tasks.execute_run'
import api.tasks  # noqa: F401
from api.config import settings


def main():
    url = settings.redis_url or "redis://localhost:6379/0"
    conn = redis.from_url(url)
    queue = Queue(settings.queue_name, connection=conn)
    worker_cls = SimpleWorker if platform.system() == "Windows" else Worker
    print(f"[worker] {worker_cls.__name__} | queue={settings.queue_name} | redis={url}")
    worker = worker_cls([queue], connection=conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    if not settings.redis_url:
        print("⚠️  REDIS_URL chưa set — worker cần Redis thật. "
              "Dev không cần worker (API tự chạy job inline qua fakeredis).")
    main()
