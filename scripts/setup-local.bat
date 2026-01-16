@echo off
REM Xoai Local Development Setup Script for Windows
REM Run this script to set up your local development environment

echo =========================================
echo   Xoai Healthcare Platform Setup
echo =========================================
echo.

REM Check if Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running.
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo [OK] Docker is running

REM Start database containers
echo.
echo Starting database containers...
docker-compose up -d

REM Wait for MySQL to be ready
echo Waiting for MySQL to be ready...
timeout /t 10 /nobreak > nul

:wait_mysql
docker exec xoai-mysql mysqladmin ping -h localhost -u root -proot_password --silent > nul 2>&1
if errorlevel 1 (
    echo Waiting for MySQL...
    timeout /t 2 /nobreak > nul
    goto wait_mysql
)

echo [OK] MySQL is ready

REM Install dependencies
echo.
echo Installing dependencies...
call npx pnpm@8 install

REM Generate Prisma client
echo.
echo Generating Prisma client...
call npx pnpm@8 db:generate

REM Push database schema
echo.
echo Pushing database schema...
call npx pnpm@8 db:push

echo.
echo =========================================
echo   Setup Complete!
echo =========================================
echo.
echo Services running:
echo   - MySQL:    localhost:3306
echo   - Adminer:  http://localhost:8080
echo   - Redis:    localhost:6379
echo.
echo Database credentials:
echo   - Host:     localhost
echo   - Port:     3306
echo   - Database: xoai
echo   - User:     xoai_user
echo   - Password: xoai_password
echo.
echo Next steps:
echo   1. Copy .env.example to .env
echo   2. Run 'pnpm dev' to start development
echo   3. Run 'pnpm test' to run tests
echo.
pause
