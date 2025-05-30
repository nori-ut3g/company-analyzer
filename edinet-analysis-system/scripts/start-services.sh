#!/bin/bash

# Start all services for EDINET Analysis System

echo "Starting EDINET Analysis System Services..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check required ports
PORTS=(3001 3002 3003 3004 8000 5432 6379)
for port in "${PORTS[@]}"; do
    if ! check_port $port; then
        echo "Please free up port $port before starting services"
        exit 1
    fi
done

# Start PostgreSQL (if using Docker)
echo -e "${GREEN}Starting PostgreSQL...${NC}"
docker run -d \
    --name edinet-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=edinet_analysis \
    -p 5432:5432 \
    postgres:15-alpine 2>/dev/null || echo "PostgreSQL container already exists"

# Start Redis (if using Docker)
echo -e "${GREEN}Starting Redis...${NC}"
docker run -d \
    --name edinet-redis \
    -p 6379:6379 \
    redis:7-alpine 2>/dev/null || echo "Redis container already exists"

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
sleep 5

# Function to start a service
start_service() {
    SERVICE_NAME=$1
    SERVICE_PATH=$2
    PORT=$3
    
    echo -e "${GREEN}Starting $SERVICE_NAME on port $PORT...${NC}"
    cd "$SERVICE_PATH" || exit
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies for $SERVICE_NAME..."
        npm install
    fi
    
    # Start the service in background
    npm run dev > "/tmp/${SERVICE_NAME}.log" 2>&1 &
    echo $! > "/tmp/${SERVICE_NAME}.pid"
    
    cd - > /dev/null
}

# Base path
BASE_PATH="$(dirname "$0")/.."

# Start services
start_service "auth-service" "$BASE_PATH/services/auth-service" 3001
start_service "data-ingestion" "$BASE_PATH/services/data-ingestion" 3002
start_service "analysis-service" "$BASE_PATH/services/analysis-service" 3003
start_service "report-generator" "$BASE_PATH/services/report-generator" 3004

# Start API Gateway
echo -e "${GREEN}Starting API Gateway on port 8000...${NC}"
cd "$BASE_PATH/api-gateway" || exit
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for API Gateway..."
    npm install
fi
npm run dev > /tmp/api-gateway.log 2>&1 &
echo $! > /tmp/api-gateway.pid

echo -e "${GREEN}All services started!${NC}"
echo ""
echo "Service URLs:"
echo "- API Gateway: http://localhost:8000"
echo "- Auth Service: http://localhost:3001"
echo "- Data Ingestion: http://localhost:3002"
echo "- Analysis Service: http://localhost:3003"
echo "- Report Generator: http://localhost:3004"
echo ""
echo "Database URLs:"
echo "- PostgreSQL: postgresql://postgres:postgres@localhost:5432/edinet_analysis"
echo "- Redis: redis://localhost:6379"
echo ""
echo "Logs are available in /tmp/"
echo ""
echo "To stop all services, run: ./scripts/stop-services.sh"