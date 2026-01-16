#!/bin/bash

# Xoai Local Development Setup Script
# Run this script to set up your local development environment

set -e

echo "========================================="
echo "  Xoai Healthcare Platform Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running.${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed and running${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm@8
fi

echo -e "${GREEN}✓ pnpm is available${NC}"

# Start database containers
echo ""
echo "Starting database containers..."
docker-compose up -d

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 10

# Check if MySQL is ready
until docker exec xoai-mysql mysqladmin ping -h localhost -u root -proot_password --silent; do
    echo "Waiting for MySQL..."
    sleep 2
done

echo -e "${GREEN}✓ MySQL is ready${NC}"

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
pnpm db:generate

# Push database schema
echo ""
echo "Pushing database schema..."
pnpm db:push

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Services running:"
echo "  - MySQL:    localhost:3306"
echo "  - Adminer:  http://localhost:8080"
echo "  - Redis:    localhost:6379"
echo ""
echo "Database credentials:"
echo "  - Host:     localhost"
echo "  - Port:     3306"
echo "  - Database: xoai"
echo "  - User:     xoai_user"
echo "  - Password: xoai_password"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env"
echo "  2. Run 'pnpm dev' to start development"
echo "  3. Run 'pnpm test' to run tests"
echo ""
