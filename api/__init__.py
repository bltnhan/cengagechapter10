"""
api — Tầng web FastAPI bọc quanh package `core` (Phương án B, bước 2).

Vai trò: thay cho mô hình "rerun toàn script" của Streamlit bằng các HTTP endpoint
rõ ràng (load / problems / prep / run / export / ai). Mỗi endpoint gọi hàm thuần
trong `core` và trả JSON — KHÔNG có `st.*`, KHÔNG session_state.

Chạy dev:
    PYTHONPATH=. ./.venv/Scripts/python.exe -m uvicorn api.main:app --reload --port 8000

LƯU Ý (sẽ làm ở BƯỚC 3): hiện `api/store.py` lưu dataset/run TRONG BỘ NHỚ 1 process
(chỉ hợp cho dev/1 instance). Bước 3 sẽ thay bằng Redis/object storage + đẩy các
tác vụ ML nặng sang worker/queue để web layer không bị block (mới thực sự hết "queued").
"""
