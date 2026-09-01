@echo off
echo ==============================================
echo Starting ZapChat Project Servers
echo ==============================================
echo.

echo Launching Backend Server in a new window...
start "ZapChat Backend" cmd /k "cd backend && npm run dev"

echo Launching Frontend Server in a new window...
start "ZapChat Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==============================================
echo Servers are launching!
echo.
echo Backend running on: http://localhost:5000
echo Frontend running on: http://localhost:5173
echo ==============================================
echo.
pause
