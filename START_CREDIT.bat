@echo off
echo ========================================
echo   Give Me Sum Credit - Startup
echo ========================================
echo.
echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not running!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    echo After installation, make sure Docker Desktop is running.
    pause
    exit /b 1
)

echo Docker found!
echo.
echo ========================================
echo   Starting Application...
echo ========================================
echo.
echo This will take ~5-10 minutes on first run
echo (downloading TensorFlow and dependencies)
echo.
echo Subsequent runs will be much faster!
echo.
echo Building and starting containers...
echo.

docker compose up --build

echo.
echo Application stopped.
pause

