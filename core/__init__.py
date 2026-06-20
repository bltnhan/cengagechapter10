"""
core — Lõi tính toán thuần Python của DataMine AI (Phương án B).

Mục tiêu: TÁCH HOÀN TOÀN logic ML/prep/AI khỏi Streamlit (`st.*`) để có thể
chạy trong FastAPI + worker/queue mà không cần web layer.

NGUYÊN TẮC BẤT BIẾN của package này:
  - TUYỆT ĐỐI KHÔNG import `streamlit` hoặc gọi `st.*`.
  - KHÔNG đọc/ghi `st.session_state` hay `st.secrets`.
  - Mọi hàm nhận input rõ ràng (DataFrame, tham số, API key) và trả về dữ liệu
    thuần (DataFrame, dict, dataclass) — KHÔNG render UI, KHÔNG side-effect global.
  - Cảnh báo/thông báo trả về dưới dạng `notes` thay vì `st.info/warning/...`.
  - Biểu đồ trả về dưới dạng PNG bytes (`FigureSpec`) thay vì `st.pyplot`.

Các module:
  - dataio   : nạp/làm sạch/encode dữ liệu (load, sanitize, encode_df, json round-trip)
  - prep     : phát hiện & xử lý vấn đề dữ liệu (missing/dup/outlier/encode)
  - ai       : client gọi Gemini/OpenRouter (API key truyền vào tường minh)
  - ml       : các runner ML thuần (classification/regression/clustering/association)
  - excel_export : xuất kết quả ra Excel (openpyxl)
"""

__all__ = ["dataio", "prep", "ai", "ml", "excel_export"]
