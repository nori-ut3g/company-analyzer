#!/bin/bash

# 色付きの出力用関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 環境変数ファイルの確認
if [ ! -f .env ]; then
    echo_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    echo_info "Please edit .env file with your configuration"
    exit 1
fi

# Dockerの起動確認
if ! docker info > /dev/null 2>&1; then
    echo_error "Docker is not running. Please start Docker first."
    exit 1
fi

# 既存のコンテナを停止
echo_info "Stopping existing containers..."
docker-compose down

# ボリュームのクリーンアップ（オプション）
if [ "$1" == "--clean" ]; then
    echo_warning "Cleaning up volumes..."
    docker-compose down -v
fi

# イメージのビルド
echo_info "Building Docker images..."
docker-compose build

# コンテナの起動
echo_info "Starting services..."
docker-compose up -d

# ヘルスチェック
echo_info "Waiting for services to be healthy..."
sleep 10

# サービスの状態確認
echo_info "Checking service status..."
docker-compose ps

# ログの表示
echo_info "Services are starting. You can check logs with:"
echo "  docker-compose logs -f"
echo ""
echo_info "Access points:"
echo "  - API Gateway: http://localhost:3000"
echo "  - pgAdmin: http://localhost:5050"
echo "    - Email: admin@company-analyzer.com"
echo "    - Password: admin"
echo ""
echo_info "To stop services, run: docker-compose down"