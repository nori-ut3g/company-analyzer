#!/bin/bash

# 色付きの出力用関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_section() {
    echo -e "\n${BLUE}========== $1 ==========${NC}\n"
}

# Dockerの起動確認
if ! docker info > /dev/null 2>&1; then
    echo_error "Docker is not running. Please start Docker first."
    exit 1
fi

echo_section "EDINET Analysis System - Full Stack Startup"

# バックエンドの環境変数確認
if [ ! -f backend/.env ]; then
    echo_warning "Backend .env file not found. Creating from .env.example..."
    cp backend/.env.example backend/.env
    echo_error "Please edit backend/.env file with your configuration before continuing"
    exit 1
fi

# フロントエンドの環境変数確認
if [ ! -f frontend/.env ]; then
    echo_info "Frontend .env file not found. Creating from .env.example..."
    cp frontend/.env.example frontend/.env
fi

# クリーンオプション
if [ "$1" == "--clean" ]; then
    echo_warning "Cleaning up all containers and volumes..."
    cd backend && docker-compose down -v && cd ..
    docker-compose down -v
fi

echo_section "Starting Backend Services"

# バックエンドサービスの起動
cd backend
echo_info "Building backend services..."
docker-compose build

echo_info "Starting backend services..."
docker-compose up -d

# バックエンドの起動待機
echo_info "Waiting for backend services to be ready..."
sleep 15

# バックエンドの状態確認
echo_info "Backend services status:"
docker-compose ps
cd ..

echo_section "Starting Frontend"

# フロントエンドの起動
echo_info "Building frontend..."
docker-compose build frontend

echo_info "Starting frontend..."
docker-compose up -d frontend

# 全体の状態確認
echo_section "System Status"

echo_info "All services status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo_section "Access Information"

echo_info "🚀 System is starting up!"
echo ""
echo "  Frontend:"
echo "    - URL: ${GREEN}http://localhost:5173${NC}"
echo ""
echo "  Backend API:"
echo "    - URL: ${GREEN}http://localhost:3000${NC}"
echo "    - Health: ${GREEN}http://localhost:3000/health${NC}"
echo ""
echo "  Database Management:"
echo "    - pgAdmin: ${GREEN}http://localhost:5050${NC}"
echo "      - Email: admin@company-analyzer.com"
echo "      - Password: admin"
echo ""
echo "  Monitoring:"
echo "    - Backend logs: ${YELLOW}cd backend && docker-compose logs -f${NC}"
echo "    - Frontend logs: ${YELLOW}docker-compose logs -f frontend${NC}"
echo "    - All logs: ${YELLOW}docker logs -f [container-name]${NC}"
echo ""
echo "  Commands:"
echo "    - Stop all: ${YELLOW}./stop-all.sh${NC}"
echo "    - Restart: ${YELLOW}./start-all.sh --clean${NC}"
echo ""
echo_info "Please wait a few moments for all services to be fully ready."
echo_info "You can check the logs if you encounter any issues."