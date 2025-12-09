#!/bin/bash

# Analytics Testing Script
# This script helps test analytics endpoints for different user types

echo "========================================="
echo "Analytics System Testing Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"

echo "API URL: $API_URL"
echo ""

# Function to test endpoint
test_endpoint() {
  local endpoint=$1
  local token=$2
  local description=$3
  
  echo "Testing: $description"
  echo "Endpoint: $endpoint"
  
  if [ -z "$token" ]; then
    echo -e "${RED}ERROR: No token provided${NC}"
    return 1
  fi
  
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    "$API_URL$endpoint")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    return 0
  else
    echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    return 1
  fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq is not installed. JSON output will not be formatted.${NC}"
  echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  echo ""
fi

# Instructions
echo "========================================="
echo "INSTRUCTIONS:"
echo "========================================="
echo "1. Get your JWT token from browser localStorage"
echo "   - Open DevTools (F12)"
echo "   - Go to Application > Local Storage"
echo "   - Find key: 'vs_platform_token'"
echo "   - Copy the token value"
echo ""
echo "2. For admin testing, login as admin and get admin token"
echo ""
echo "3. Run this script with tokens:"
echo "   ./scripts/test-analytics.sh"
echo ""
echo "Or set environment variables:"
echo "   export USER_TOKEN='your_user_token'"
echo "   export ADMIN_TOKEN='your_admin_token'"
echo "   ./scripts/test-analytics.sh"
echo ""
echo "========================================="
echo ""

# Get tokens from environment or prompt
if [ -z "$USER_TOKEN" ]; then
  read -p "Enter USER token (or press Enter to skip user tests): " USER_TOKEN
fi

if [ -z "$ADMIN_TOKEN" ]; then
  read -p "Enter ADMIN token (or press Enter to skip admin tests): " ADMIN_TOKEN
fi

echo ""
echo "========================================="
echo "TESTING USER ENDPOINTS"
echo "========================================="
echo ""

if [ -n "$USER_TOKEN" ]; then
  # Extract user ID from token (basic - just for display)
  echo "Testing with user token..."
  echo ""
  
  # Test User Dashboard
  test_endpoint "/api/analytics/dashboard/user" "$USER_TOKEN" "User Dashboard Analytics"
  
  # Test User Analytics (need user ID)
  read -p "Enter User ID to test user analytics (or press Enter to skip): " USER_ID
  if [ -n "$USER_ID" ]; then
    test_endpoint "/api/analytics/user/$USER_ID" "$USER_TOKEN" "User Analytics for $USER_ID"
  fi
  
  # Test Event Tracking
  read -p "Enter Video ID to test event tracking (or press Enter to skip): " VIDEO_ID
  if [ -n "$VIDEO_ID" ]; then
    echo "Testing: Event Tracking"
    echo "Endpoint: /api/analytics/event"
    response=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"videoId\": \"$VIDEO_ID\",
        \"eventType\": \"VIDEO_OPENED\",
        \"currentTime\": 0,
        \"duration\": 600
      }" \
      "$API_URL/api/analytics/event")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
      echo -e "${GREEN}✓ Event tracked successfully (HTTP $http_code)${NC}"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
      echo -e "${RED}✗ Failed to track event (HTTP $http_code)${NC}"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
  fi
else
  echo -e "${YELLOW}Skipping user tests (no token provided)${NC}"
  echo ""
fi

echo "========================================="
echo "TESTING ADMIN ENDPOINTS"
echo "========================================="
echo ""

if [ -n "$ADMIN_TOKEN" ]; then
  echo "Testing with admin token..."
  echo ""
  
  # Test Admin Dashboard
  test_endpoint "/api/analytics/dashboard/admin" "$ADMIN_TOKEN" "Admin Dashboard Analytics"
  
  # Test Admin Overview
  test_endpoint "/api/admin/analytics/overview" "$ADMIN_TOKEN" "Admin Analytics Overview"
  
  # Test Video Analytics
  read -p "Enter Video ID to test video analytics (or press Enter to skip): " VIDEO_ID
  if [ -n "$VIDEO_ID" ]; then
    test_endpoint "/api/analytics/video/$VIDEO_ID" "$ADMIN_TOKEN" "Video Analytics for $VIDEO_ID"
  fi
  
  # Test User Analytics (admin can view any user)
  read -p "Enter User ID to test user analytics (or press Enter to skip): " USER_ID
  if [ -n "$USER_ID" ]; then
    test_endpoint "/api/analytics/user/$USER_ID" "$ADMIN_TOKEN" "User Analytics for $USER_ID (Admin View)"
  fi
else
  echo -e "${YELLOW}Skipping admin tests (no token provided)${NC}"
  echo ""
fi

echo "========================================="
echo "TESTING COMPLETE"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Check backend logs for any errors"
echo "2. Verify ClickHouse is running: curl http://localhost:8123"
echo "3. Check ClickHouse tables: clickhouse-client --query 'SHOW TABLES'"
echo "4. View events: clickhouse-client --query 'SELECT * FROM events_raw LIMIT 10'"
echo ""

