@echo off
echo Clearing cache and restarting...

cd frontend
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q build 2>nul

echo Cache cleared! Starting frontend...
npm start
