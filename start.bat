@echo off
title TriVault Launcher
echo =====================================================
echo    TriVault - Split into Three. Secured as One.
echo =====================================================
echo Starting Backend and Frontend Servers...
echo.

cd /d "%~dp0"

start "TriVault Backend (:8000)" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "TriVault Frontend (:5173)" cmd /k "cd frontend && npm run dev"

echo Backend running at:  http://localhost:8000/docs
echo Frontend running at: http://localhost:5173
echo.
echo Both servers have been launched in separate terminal windows!
echo Keep those windows open while using the application.
echo =====================================================
timeout /t 5 >nul

