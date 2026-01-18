@echo off
echo ========================================
echo   MOBILE ACCESS SETUP
echo ========================================
echo.
echo Your laptop IP: 192.168.0.103
echo.
echo STEP 1: Stop both servers (Ctrl+C)
echo.
pause

echo STEP 2: Clearing frontend cache...
cd frontend
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q build 2>nul
cd ..

echo STEP 3: Starting Backend on 192.168.0.103:5000...
start "Backend - Mobile Access" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak > nul

echo STEP 4: Starting Frontend on 192.168.0.103:3000...
start "Frontend - Mobile Access" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Access from your phone:
echo   http://192.168.0.103:3000
echo.
echo Make sure:
echo 1. Phone and laptop on same WiFi
echo 2. Windows Firewall allows Node.js
echo 3. Wait 30 seconds for servers to start
echo ========================================
pause
