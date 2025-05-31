#!/bin/bash

# 色付きの出力用関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_info "Stopping EDINET Analysis System..."

# フロントエンドの停止
echo_info "Stopping frontend..."
docker-compose down

# バックエンドの停止
echo_info "Stopping backend services..."
cd backend
docker-compose down
cd ..

echo_info "All services have been stopped."

# オプション: ボリュームも削除する場合
if [ "$1" == "--clean" ]; then
    echo_warning "Cleaning up volumes..."
    cd backend
    docker-compose down -v
    cd ..
    docker-compose down -v
    echo_info "Volumes have been removed."
fi

echo_info "Done!"