@echo off
echo Stopping all servers...
taskkill /F /IM node.exe 2>nul

echo Deleting frontend cache and build...
cd frontend
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q build 2>nul

echo.
echo CRITICAL: Do these steps in your browser NOW:
echo.
echo 1. Press F12
echo 2. Application tab
echo 3. Service Workers - Click UNREGISTER
echo 4. Storage - Click CLEAR SITE DATA
echo 5. Close browser completely
echo.
pause

echo Starting backend...
cd ..\backend
start "Backend" cmd /k "npm run dev"
timeout /t 5 /nobreak > nul

echo Starting frontend...
cd ..\frontend
start "Frontend" cmd /k "set REACT_APP_API_URL=http://localhost:5000 && npm start"

echo.
echo When browser opens:
echo 1. Press Ctrl+Shift+Delete
echo 2. Clear ALL cached data
echo 3. Close and reopen browser
echo 4. Go to http://localhost:3000
