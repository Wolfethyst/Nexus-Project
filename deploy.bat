@echo off
REM Nexus v2 - Automated Production Setup & Deployment (Windows)
REM Usage: deploy.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 Nexus v2 - Production Deployment Script
echo ==========================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where /q git
if %errorlevel% neq 0 (
    echo ✗ Git not found. Please install Git.
    exit /b 1
)

where /q pnpm
if %errorlevel% neq 0 (
    echo ✗ pnpm not found. Please install pnpm: npm install -g pnpm
    exit /b 1
)

where /q node
if %errorlevel% neq 0 (
    echo ✗ Node.js not found. Please install Node.js
    exit /b 1
)

echo ✓ All prerequisites found
echo.

REM Step 1: Install dependencies
echo Step 1: Installing dependencies...
call pnpm install --frozen-lockfile
if %errorlevel% neq 0 (
    echo ✗ Installation failed
    exit /b 1
)
echo ✓ Dependencies installed
echo.

REM Step 2: Type checking
echo Step 2: Running type checks...
call pnpm type-check
if %errorlevel% neq 0 (
    echo ✗ Type check failed
    exit /b 1
)
echo ✓ Type checks passed
echo.

REM Step 3: Build
echo Step 3: Building frontend and backend...
call pnpm build
if %errorlevel% neq 0 (
    echo ✗ Build failed
    exit /b 1
)
echo ✓ Build successful
echo.

REM Step 4: Git setup
echo Step 4: Git repository setup
git rev-parse --git-dir > nul 2>&1
if %errorlevel% neq 0 (
    echo Initializing Git repository...
    call git init
    call git config user.email "nexus@wolfethyst.tv"
    call git config user.name "Nexus Bot"
    echo ✓ Git repository initialized
) else (
    echo ✓ Git repository already initialized
)
echo.

REM Step 5: Add files
echo Step 5: Preparing files for commit
call git add .
echo ✓ Files staged
echo.

REM Step 6: Commit
echo Step 6: Committing...
call git commit -m "chore: initial monorepo setup - React frontend + Cloudflare Workers backend"
if %errorlevel% neq 0 (
    echo ✗ Commit failed (possibly nothing to commit)
) else (
    echo ✓ Committed
)
echo.

REM Step 7: Instructions
echo Step 7: GitHub & Cloudflare Setup Required
echo.
echo BEFORE PUSHING, you need GitHub Secrets:
echo.
echo 1. Go to: https://github.com/YOUR_USERNAME/nexus-v2/settings/secrets/actions
echo 2. Click "New repository secret"
echo 3. Add CLOUDFLARE_API_TOKEN
echo 4. Add CLOUDFLARE_ACCOUNT_ID
echo.
pause

REM Step 8: Push
echo Step 8: Pushing to GitHub...
call git push -u origin main --force
if %errorlevel% neq 0 (
    echo ✗ Push failed
    exit /b 1
)
echo ✓ Pushed to GitHub
echo.

REM Success
echo.
echo ✓ Production deployment initiated!
echo.
echo What happens next:
echo   1. GitHub Actions workflows start
echo   2. Type checks run
echo   3. Frontend builds for Cloudflare Pages
echo   4. Backend builds for Cloudflare Workers
echo   5. Both deploy automatically
echo.
echo Check status at:
echo   - GitHub Actions: https://github.com/YOUR_USERNAME/nexus-v2/actions
echo   - Cloudflare: https://dash.cloudflare.com
echo.
echo Estimated time: 2-3 minutes
echo.
pause
