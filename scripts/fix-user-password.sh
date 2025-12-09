#!/bin/bash

# Script to fix a user's password hash and tokenVersion
# Usage: ./scripts/fix-user-password.sh [email] [password]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get parameters
EMAIL="${1:-nikhilmarwaha.nmv0167@gmail.com}"
PASSWORD="${2}"

if [ -z "$PASSWORD" ]; then
    echo -e "${RED}❌ Password is required${NC}"
    echo ""
    echo "Usage: ./scripts/fix-user-password.sh [email] [password]"
    echo ""
    echo "Example:"
    echo "  ./scripts/fix-user-password.sh nikhilmarwaha.nmv0167@gmail.com MyNewPassword123"
    exit 1
fi

echo "🔧 Fixing User Password"
echo "======================"
echo ""
echo "Email: $EMAIL"
echo ""

# Check if PostgreSQL is accessible
echo "1️⃣  Checking database connection..."
if ! docker ps | grep -q vs-platform-postgres; then
    echo -e "${RED}❌ PostgreSQL container not found${NC}"
    echo "   Please start it with: docker compose up -d postgres"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL container found${NC}"
echo ""

# Check if user exists
echo "2️⃣  Checking if user exists..."
USER_CHECK=$(docker exec -i vs-platform-postgres psql -U postgres -d vs_platform -t -c \
    "SELECT email, role, \"passwordHash\" IS NULL as has_no_password FROM users WHERE email = '$EMAIL';" 2>&1 | grep -v "^$" | head -1)

if [ -z "$USER_CHECK" ] || ! echo "$USER_CHECK" | grep -q "$EMAIL"; then
    echo -e "${RED}❌ User not found: $EMAIL${NC}"
    exit 1
fi

if echo "$USER_CHECK" | grep -q "t$"; then
    echo -e "${YELLOW}⚠️  User exists but has no password hash${NC}"
else
    echo -e "${GREEN}✅ User exists${NC}"
    read -p "   User already has a password. Overwrite? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "   Cancelled."
        exit 0
    fi
fi
echo ""

# Generate password hash
echo "3️⃣  Generating password hash..."
if command -v node &> /dev/null; then
    PASSWORD_HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('$PASSWORD', 10).then(hash => console.log(hash));" 2>/dev/null)
    
    if [ -z "$PASSWORD_HASH" ] || [ "$PASSWORD_HASH" == "undefined" ]; then
        echo -e "${RED}❌ Failed to generate password hash${NC}"
        echo "   Please ensure bcryptjs is installed:"
        echo "   cd backend && pnpm install bcryptjs"
        exit 1
    fi
    echo -e "${GREEN}✅ Password hash generated${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Please install Node.js or generate hash manually:"
    echo "   Visit: https://bcrypt-generator.com/ (10 rounds)"
    read -p "   Enter password hash: " PASSWORD_HASH
fi
echo ""

# Update user password and tokenVersion
echo "4️⃣  Updating user password and tokenVersion..."
UPDATE_RESULT=$(docker exec -i vs-platform-postgres psql -U postgres -d vs_platform -t -c \
    "UPDATE users 
     SET \"passwordHash\" = '$PASSWORD_HASH', 
         \"tokenVersion\" = 0,
         \"updatedAt\" = NOW()
     WHERE email = '$EMAIL' 
     RETURNING id, email, role, \"categoryRole\";" 2>&1)

if [ $? -eq 0 ] && echo "$UPDATE_RESULT" | grep -q "$EMAIL"; then
    echo -e "${GREEN}✅ User password and tokenVersion updated${NC}"
    echo "$UPDATE_RESULT" | grep -v "UPDATE" | grep -v "^$" | head -1
else
    echo -e "${RED}❌ Failed to update user${NC}"
    echo "$UPDATE_RESULT"
    exit 1
fi
echo ""

# Verify update
echo "5️⃣  Verifying update..."
VERIFY_RESULT=$(docker exec -i vs-platform-postgres psql -U postgres -d vs_platform -t -c \
    "SELECT email, role, \"passwordHash\" IS NOT NULL as has_password, \"tokenVersion\" 
     FROM users 
     WHERE email = '$EMAIL';" 2>&1 | grep -v "^$" | head -1)

if echo "$VERIFY_RESULT" | grep -q "t$"; then
    echo -e "${GREEN}✅ Password hash is set${NC}"
    echo "$VERIFY_RESULT"
else
    echo -e "${RED}❌ Verification failed${NC}"
    echo "$VERIFY_RESULT"
    exit 1
fi
echo ""

echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Start the backend (if not running):"
echo "   pnpm --filter backend dev"
echo ""
echo "2. Navigate to: http://localhost:3000/login"
echo ""
echo "3. Log in with:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
echo -e "${GREEN}🎉 User password fixed!${NC}"

