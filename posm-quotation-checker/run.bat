@echo off
echo ============================================
echo  POSM Price Intelligence - Starting App
echo ============================================
echo.

REM Install dependencies if needed
pip install -r requirements.txt --quiet

echo.
echo Starting Streamlit app...
echo Open your browser at: http://localhost:8501
echo.
streamlit run app.py
pause
