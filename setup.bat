@echo off
echo ==============================================
echo Installing Dependencies for ZapChat Project
echo ==============================================
echo.

echo [1/2] Installing Backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install backend dependencies. Make sure Node.js is installed.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/2] Installing Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ==============================================
echo Installation Successful!
echo You can now use "start.bat" to run the project.
echo ==============================================
echo.
pause
