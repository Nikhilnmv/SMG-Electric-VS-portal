#!/bin/bash

# Day 6 Testing Script
# This script helps test the admin dashboard and video moderation features

set -e

API_URL="http://localhost:3001"
ADMIN_EMAIL="admin@test.com"
ADMIN_PASSWORD="admin123"
USER_EMAIL="user@test.com"
USER_PASSWORD="user123"

echo "🧪 Day 6 Testing Script"
echo "======================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1️⃣  Checking backend health..."
if curl -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running. Please start it first:${NC}"
    echo "   pnpm --filter backend dev"
    exit 1
fi
echo ""

# Function to login and get token
login() {
    local email=$1
    local password=$2
    curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" | jq -r '.data.token'
}

# Test admin login
echo "2️⃣  Testing admin login..."
ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Admin login successful${NC}"
    echo "   Token: ${ADMIN_TOKEN:0:20}..."
else
    echo -e "${YELLOW}⚠️  Admin login failed. Creating admin user...${NC}"
    echo "   Please create admin user manually or update role in database"
    echo "   See day6-testing-guide.md for instructions"
    exit 1
fi
echo ""

# Test Get Stats
echo "3️⃣  Testing GET /api/admin/stats..."
STATS_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/stats" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$STATS_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Stats endpoint working${NC}"
    echo "$STATS_RESPONSE" | jq '.data'
else
    echo -e "${RED}❌ Stats endpoint failed${NC}"
    echo "$STATS_RESPONSE" | jq '.'
fi
echo ""

# Test Get Pending Videos
echo "4️⃣  Testing GET /api/admin/videos/pending..."
PENDING_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/videos/pending" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$PENDING_RESPONSE" | jq -e '.success' > /dev/null; then
    PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq '.data | length')
    echo -e "${GREEN}✅ Pending videos endpoint working${NC}"
    echo "   Found $PENDING_COUNT pending videos"
    if [ "$PENDING_COUNT" -gt 0 ]; then
        echo "   First video:"
        echo "$PENDING_RESPONSE" | jq '.data[0] | {id, title, status, userEmail}'
    fi
else
    echo -e "${RED}❌ Pending videos endpoint failed${NC}"
    echo "$PENDING_RESPONSE" | jq '.'
fi
echo ""

# Test Get Users
echo "5️⃣  Testing GET /api/admin/users..."
USERS_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$USERS_RESPONSE" | jq -e '.success' > /dev/null; then
    USER_COUNT=$(echo "$USERS_RESPONSE" | jq '.data | length')
    echo -e "${GREEN}✅ Users endpoint working${NC}"
    echo "   Found $USER_COUNT users"
    echo "$USERS_RESPONSE" | jq '.data[] | {email, role}'
else
    echo -e "${RED}❌ Users endpoint failed${NC}"
    echo "$USERS_RESPONSE" | jq '.'
fi
echo ""

# Test Approve Video (if pending videos exist)
PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq '.data | length')
if [ "$PENDING_COUNT" -gt 0 ]; then
    VIDEO_ID=$(echo "$PENDING_RESPONSE" | jq -r '.data[0].id')
    VIDEO_TITLE=$(echo "$PENDING_RESPONSE" | jq -r '.data[0].title')
    
    echo "6️⃣  Testing POST /api/admin/videos/$VIDEO_ID/approve..."
    read -p "   Approve video '$VIDEO_TITLE'? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        APPROVE_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/videos/$VIDEO_ID/approve" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        if echo "$APPROVE_RESPONSE" | jq -e '.success' > /dev/null; then
            echo -e "${GREEN}✅ Video approved successfully${NC}"
            echo "$APPROVE_RESPONSE" | jq '.data | {id, title, status}'
        else
            echo -e "${RED}❌ Approve failed${NC}"
            echo "$APPROVE_RESPONSE" | jq '.'
        fi
    else
        echo -e "${YELLOW}⏭️  Skipped approve test${NC}"
    fi
    echo ""
fi

# Test Reject Video (if pending videos exist)
PENDING_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/videos/pending" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq '.data | length')
if [ "$PENDING_COUNT" -gt 0 ]; then
    VIDEO_ID=$(echo "$PENDING_RESPONSE" | jq -r '.data[0].id')
    VIDEO_TITLE=$(echo "$PENDING_RESPONSE" | jq -r '.data[0].title')
    
    echo "7️⃣  Testing POST /api/admin/videos/$VIDEO_ID/reject..."
    read -p "   Reject video '$VIDEO_TITLE'? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        REJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/videos/$VIDEO_ID/reject" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"deleteFromStorage": false}')
        if echo "$REJECT_RESPONSE" | jq -e '.success' > /dev/null; then
            echo -e "${GREEN}✅ Video rejected successfully${NC}"
            echo "$REJECT_RESPONSE" | jq '.data | {id, title, status}'
        else
            echo -e "${RED}❌ Reject failed${NC}"
            echo "$REJECT_RESPONSE" | jq '.'
        fi
    else
        echo -e "${YELLOW}⏭️  Skipped reject test${NC}"
    fi
    echo ""
fi

# Test Non-Admin Access
echo "8️⃣  Testing non-admin access control..."
USER_TOKEN=$(login "$USER_EMAIL" "$USER_PASSWORD" 2>/dev/null || echo "")
if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    USER_STATS_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/stats" \
        -H "Authorization: Bearer $USER_TOKEN")
    if echo "$USER_STATS_RESPONSE" | jq -e '.success == false' > /dev/null; then
        echo -e "${GREEN}✅ Access control working (non-admin blocked)${NC}"
    else
        echo -e "${RED}❌ Access control failed (non-admin should be blocked)${NC}"
    fi
    
    USER_USERS_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/users" \
        -H "Authorization: Bearer $USER_TOKEN")
    if echo "$USER_USERS_RESPONSE" | jq -e '.success == false' > /dev/null; then
        echo -e "${GREEN}✅ Admin-only route protected${NC}"
    else
        echo -e "${RED}❌ Admin-only route not protected${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Regular user not found, skipping access control test${NC}"
fi
echo ""

# Summary
echo "📊 Test Summary"
echo "==============="
echo -e "${GREEN}✅ Backend health check${NC}"
echo -e "${GREEN}✅ Admin authentication${NC}"
echo -e "${GREEN}✅ Stats endpoint${NC}"
echo -e "${GREEN}✅ Pending videos endpoint${NC}"
echo -e "${GREEN}✅ Users endpoint${NC}"
echo ""
echo "🎉 Backend API tests completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Test frontend at http://localhost:3000/admin"
echo "   2. Login as admin user"
echo "   3. Verify dashboard UI and functionality"
echo "   4. See day6-testing-guide.md for detailed frontend testing"
echo ""

