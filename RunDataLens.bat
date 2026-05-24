@echo off
title DataLens Local Server
echo ===================================================
echo     DANG KHOI DONG DATALENS SERVER...
echo ===================================================
echo Vui long giu cua so nay mo trong qua trinh su dung.
echo Trinh duyet se tu dong mo len trang: http://localhost:3000
echo.

:: Mo luon trinh duyet
start http://localhost:3000

:: Chay Next.js server
npm run dev

pause
