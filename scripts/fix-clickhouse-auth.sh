#!/bin/bash

# Fix ClickHouse Authentication Script
# This script removes password requirement and allows external connections

echo "========================================="
echo "Fixing ClickHouse Authentication"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CONTAINER_NAME="vs-platform-clickhouse"

# Check if container exists
if ! docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}Error: ClickHouse container '$CONTAINER_NAME' not found${NC}"
    echo "Start it with: docker-compose up -d clickhouse"
    exit 1
fi

echo "Step 1: Updating ClickHouse user configuration..."
docker exec $CONTAINER_NAME bash -c 'cat > /etc/clickhouse-server/users.d/default-user.xml << "EOF"
<clickhouse>
  <users>
    <default>
      <!-- Allow connections from any network for development -->
      <networks>
        <ip>::/0</ip>
      </networks>
      <!-- No password required - empty password element -->
      <password></password>
    </default>
  </users>
</clickhouse>
EOF
'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Configuration updated${NC}"
else
    echo -e "${RED}✗ Failed to update configuration${NC}"
    exit 1
fi

echo ""
echo "Step 2: Restarting ClickHouse..."
docker restart $CONTAINER_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ClickHouse restarted${NC}"
else
    echo -e "${RED}✗ Failed to restart ClickHouse${NC}"
    exit 1
fi

echo ""
echo "Step 3: Waiting for ClickHouse to start..."
sleep 8

echo ""
echo "Step 4: Testing connection..."
response=$(curl -s http://localhost:8123)
if [ "$response" = "Ok." ]; then
    echo -e "${GREEN}✓ ClickHouse is running${NC}"
else
    echo -e "${RED}✗ ClickHouse is not responding: $response${NC}"
    exit 1
fi

echo ""
echo "Step 5: Testing authentication..."
# Test with default user (no password)
test_result=$(docker exec $CONTAINER_NAME clickhouse-client --query "SELECT 1" 2>&1)
if echo "$test_result" | grep -q "1"; then
    echo -e "${GREEN}✓ Authentication test passed${NC}"
else
    echo -e "${YELLOW}⚠ Authentication test: $test_result${NC}"
    echo "This might still work from the backend"
fi

echo ""
echo "========================================="
echo "Fix Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Restart your backend: cd backend && npm run dev"
echo "2. Look for: '[ClickHouse] Connection test successful'"
echo "3. Check dashboard: http://localhost:3000/dashboard"
echo ""
echo "If you still see errors, check:"
echo "- Backend logs for ClickHouse connection messages"
echo "- ClickHouse logs: docker logs $CONTAINER_NAME"
echo ""

