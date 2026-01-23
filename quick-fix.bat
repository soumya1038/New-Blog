@echo off
echo ========================================
echo   Blog App - Quick Fix Script
echo ========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo OK - Node.js is installed
echo.

echo [2/5] Checking backend dependencies...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo OK - Backend dependencies exist
)
echo.

echo [3/5] Running backend diagnostics...
call npm run check-startup
if errorlevel 1 (
    echo.
    echo ERROR: Backend diagnostics failed!
    echo Please check the errors above and fix them.
    echo.
    pause
    exit /b 1
)
echo.

echo [4/5] Checking frontend dependencies...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo OK - Frontend dependencies exist
)
echo.

echo [5/5] All checks passed!
echo.
echo ========================================
echo   Ready to Start!
echo ========================================
echo.
echo To start the application:
echo   1. Open a terminal and run: cd backend ^&^& npm run dev
echo   2. Open another terminal and run: cd frontend ^&^& npm start
echo.
echo Or use the provided batch files:
echo   - start-backend.bat
echo   - start-frontend.bat
echo.
pause
