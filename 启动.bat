@echo off
title PDFMathTranslate - Dev
echo ============================================
echo   PDFMathTranslate
echo   Scientific PDF Translation
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.12+
    pause
    exit /b 1
)
echo [OK] Python

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node 18+
    pause
    exit /b 1
)
echo [OK] Node.js

REM Install frontend deps if needed
if not exist "frontend\node_modules\" (
    echo [INSTALL] Installing frontend dependencies...
    pushd frontend
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        popd
        pause
        exit /b 1
    )
    popd
)

REM Self-bootstrapping shortcut with icon (first run or after moving folder)
if not exist "%~dp0PDFMathTranslate.lnk" (
    echo [SETUP] Creating launcher shortcut...
    powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell;$lnk=$ws.CreateShortcut('%~dp0PDFMathTranslate.lnk');$lnk.TargetPath='%~dp0启动.bat';$lnk.IconLocation='%~dp0assets\pdf2zh.ico';$lnk.WorkingDirectory='%~dp0';$lnk.Save()"
)

echo.
echo [START] FastAPI backend  : http://localhost:8000
echo [START] React frontend   : http://localhost:5173
echo.

start "PDFMathTranslate-API" cmd /k "cd /d "%~dp0" && title PDFMathTranslate API && python -m uvicorn pdf2zh.api:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for backend to be ready before launching frontend
echo [WAIT]  Waiting for backend to be ready...
:wait_backend
timeout /t 1 /nobreak >nul
python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" >nul 2>&1
if errorlevel 1 goto :wait_backend
echo [OK]   Backend is ready.

start "PDFMathTranslate-Frontend" cmd /k "cd /d "%~dp0frontend" && title PDFMathTranslate Frontend && npm run dev"

echo.
echo ============================================
echo   Backend API  : http://localhost:8000/docs
echo   Frontend UI  : http://localhost:5173
echo ============================================
echo.
echo Close each terminal window to stop its service.
echo.
start "" http://localhost:5173
pause
