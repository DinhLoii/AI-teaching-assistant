@echo off
echo ===================================================
echo [AITA FRONTEND] Building Next.js Frontend
echo ===================================================

echo [1/3] Running Structure Checks...
call npm run check:structure
if errorlevel 1 (
    echo [ERROR] Structure checks failed.
    exit /b %errorlevel%
)

echo [2/3] Running Unit Tests...
call npm test
if errorlevel 1 (
    echo [ERROR] Unit tests failed.
    exit /b %errorlevel%
)

echo [3/3] Running Next.js Production Build...
call npm run build
if errorlevel 1 (
    echo [ERROR] Next.js build failed.
    exit /b %errorlevel%
)

echo ===================================================
echo [SUCCESS] Frontend build completed successfully!
echo ===================================================
