#!/bin/bash

# Stop all services for EDINET Analysis System

echo "Stopping EDINET Analysis System Services..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Stop Node.js services
SERVICES=("auth-service" "data-ingestion" "analysis-service" "report-generator" "api-gateway")

for service in "${SERVICES[@]}"; do
    if [ -f "/tmp/${service}.pid" ]; then
        PID=$(cat "/tmp/${service}.pid")
        if kill -0 $PID 2>/dev/null; then
            echo -e "${GREEN}Stopping $service (PID: $PID)...${NC}"
            kill $PID
            rm "/tmp/${service}.pid"
        else
            echo -e "${RED}$service is not running${NC}"
            rm "/tmp/${service}.pid"
        fi
    else
        echo -e "${RED}No PID file found for $service${NC}"
    fi
done

# Stop Docker containers
echo -e "${GREEN}Stopping PostgreSQL...${NC}"
docker stop edinet-postgres 2>/dev/null || echo "PostgreSQL container not running"

echo -e "${GREEN}Stopping Redis...${NC}"
docker stop edinet-redis 2>/dev/null || echo "Redis container not running"

echo -e "${GREEN}All services stopped!${NC}"