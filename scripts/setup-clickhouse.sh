#!/bin/bash

# ClickHouse Setup Script
# This script helps set up ClickHouse for local development

echo "========================================="
echo "ClickHouse Setup Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Step 1: Checking if ClickHouse is running..."
if curl -s http://localhost:8123 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ClickHouse is running${NC}"
else
    echo -e "${YELLOW}ClickHouse is not running. Starting...${NC}"
    
    # Check if using docker-compose
    if [ -f "docker-compose.yml" ]; then
        echo "Starting ClickHouse with docker-compose..."
        docker-compose up -d clickhouse
        sleep 5
    else
        echo "Starting ClickHouse with Docker..."
        docker run -d \
          --name vs-platform-clickhouse \
          -p 8123:8123 \
          -p 9000:9000 \
          clickhouse/clickhouse-server:latest
        sleep 5
    fi
fi

echo ""
echo "Step 2: Testing ClickHouse connection..."
response=$(curl -s http://localhost:8123)
if [ "$response" = "Ok." ]; then
    echo -e "${GREEN}✓ ClickHouse is accessible${NC}"
else
    echo -e "${RED}✗ ClickHouse is not accessible: $response${NC}"
    exit 1
fi

echo ""
echo "Step 3: Testing authentication..."
# Test with default user (no password)
response=$(curl -s "http://default@localhost:8123?query=SELECT 1")
if echo "$response" | grep -q "1"; then
    echo -e "${GREEN}✓ Authentication successful (default user, no password)${NC}"
else
    echo -e "${YELLOW}Authentication test returned: $response${NC}"
    echo "This might be OK if ClickHouse requires a password"
fi

echo ""
echo "Step 4: Creating backend .env file if it doesn't exist..."
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from .env.example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓ Created backend/.env${NC}"
    else
        cat > backend/.env << EOL
# ClickHouse Configuration
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vs_platform
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev-secret-key-change-in-production

# Server
PORT=3001
NODE_ENV=development
EOL
        echo -e "${GREEN}✓ Created backend/.env with default values${NC}"
    fi
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
    
    # Check if ClickHouse config is present
    if ! grep -q "CLICKHOUSE" backend/.env; then
        echo "Adding ClickHouse configuration to backend/.env..."
        cat >> backend/.env << EOL

# ClickHouse Configuration
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
EOL
        echo -e "${GREEN}✓ Added ClickHouse config${NC}"
    fi
fi

echo ""
echo "Step 5: Verifying backend .env configuration..."
if grep -q "CLICKHOUSE_PASSWORD=" backend/.env; then
    password_value=$(grep "CLICKHOUSE_PASSWORD=" backend/.env | cut -d'=' -f2)
    if [ -z "$password_value" ]; then
        echo -e "${GREEN}✓ CLICKHOUSE_PASSWORD is empty (correct for local dev)${NC}"
    else
        echo -e "${YELLOW}⚠ CLICKHOUSE_PASSWORD is set to: $password_value${NC}"
        echo "   If ClickHouse doesn't have a password, this should be empty"
    fi
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Restart your backend: cd backend && npm run dev"
echo "2. Check backend logs for 'ClickHouse ... initialized' messages"
echo "3. Test the dashboard: http://localhost:3000/dashboard"
echo ""
echo "If you still see authentication errors:"
echo "1. Check ClickHouse logs: docker logs vs-platform-clickhouse"
echo "2. Try resetting ClickHouse: docker restart vs-platform-clickhouse"
echo "3. See docs/CLICKHOUSE_SETUP.md for detailed troubleshooting"
echo ""
