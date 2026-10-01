@echo off
echo ============================================
echo      Pushing All Updates to Main Branch
echo ============================================
git add .
set MSG=%*
if "%MSG%"=="" set MSG=feat: init repository with Next.js 16 frontend, backend services and GitHub Actions CI/CD
git commit -m "%MSG%"
git push -u origin main
echo.
echo SUCCESS: All changes have been pushed to main!
pause
