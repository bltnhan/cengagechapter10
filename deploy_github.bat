@echo off
echo ============================================
echo   DataMine AI - GitHub Deploy Script
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Initializing git repository...
git init
git branch -M main

echo.
echo [2/5] Setting remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/NhanBui/CengageChap10.git

echo.
echo [3/5] Staging all files...
git add .
git status

echo.
echo [4/5] Creating first commit...
git commit -m "feat: DataMine AI - professional analytics app with Smart Advisor & Fitness Report"

echo.
echo [5/5] Pushing to GitHub...
echo NOTE: You will be prompted for GitHub credentials.
echo       Use your GitHub username and a Personal Access Token (NOT your password).
echo       Get token at: https://github.com/settings/tokens/new
echo       Required scope: repo (full control)
echo.
git push -u origin main

echo.
echo ============================================
echo   Done! Check: https://github.com/NhanBui/CengageChap10
echo ============================================
pause
