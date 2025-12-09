# ClickHouse Setup Guide

## Problem: Authentication Failed

If you're seeing "Authentication failed: password is incorrect" error, ClickHouse is running but the credentials don't match.

## Solution 1: Use ClickHouse Without Password (Recommended for Development)

### Step 1: Stop ClickHouse
```bash
# If running via Docker
docker stop vs-platform-clickhouse
docker rm vs-platform-clickhouse

# Or if using docker-compose
docker-compose stop clickhouse
docker-compose rm clickhouse
```

### Step 2: Start ClickHouse with No Password
```bash
# Using Docker directly
docker run -d \
  --name vs-platform-clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  clickhouse/clickhouse-server:latest

# Or use docker-compose (already configured)
docker-compose up -d clickhouse
```

### Step 3: Verify Connection
```bash
# Test connection (should work without password)
curl http://localhost:8123
# Should return: Ok.

# Test with default user (no password)
curl http://default@localhost:8123
# Should return: Ok.
```

### Step 4: Update Backend Environment
Create or update `backend/.env`:
```bash
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

### Step 5: Restart Backend
```bash
cd backend
npm run dev
```

---

## Solution 2: Configure ClickHouse with Password

### Step 1: Access ClickHouse Container
```bash
docker exec -it vs-platform-clickhouse bash
```

### Step 2: Edit Users Configuration
```bash
# Navigate to config directory
cd /etc/clickhouse-server

# Edit users.xml (or create users.d/default-password.xml)
vi users.xml
```

### Step 3: Set Password for Default User
Add or modify in `users.xml`:
```xml
<users>
    <default>
        <password></password>  <!-- Empty password -->
        <!-- OR set a password -->
        <!-- <password>your_password_here</password> -->
        <networks>
            <ip>::/0</ip>
        </networks>
        <profile>default</profile>
        <quota>default</quota>
    </default>
</users>
```

### Step 4: Restart ClickHouse
```bash
# Exit container
exit

# Restart ClickHouse
docker restart vs-platform-clickhouse
```

### Step 5: Update Backend .env
```bash
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password_here  # Or leave empty
```

---

## Solution 3: Reset ClickHouse Password (If Password Was Set)

### Option A: Delete Password File
```bash
# Access container
docker exec -it vs-platform-clickhouse bash

# Remove password file (if exists)
rm /etc/clickhouse-server/users.d/default-password.xml

# Restart
exit
docker restart vs-platform-clickhouse
```

### Option B: Use ClickHouse Client to Reset
```bash
# Connect to ClickHouse
docker exec -it vs-platform-clickhouse clickhouse-client

# Create user without password (if needed)
# This requires admin access
```

---

## Quick Fix: Update ClickHouse Service to Skip Authentication

Update the ClickHouse connection to handle authentication errors gracefully:

The backend code already uses empty password by default. The issue might be that ClickHouse was configured with a password.

### Test Current Configuration
```bash
# Test if ClickHouse accepts empty password
curl "http://default@localhost:8123"
# Should return: Ok.

# Test with explicit empty password
curl "http://default:@localhost:8123"
# Should return: Ok.
```

---

## Verification Steps

### 1. Check ClickHouse is Running
```bash
curl http://localhost:8123
# Expected: Ok.
```

### 2. Test Connection with Default User
```bash
# Using curl
curl "http://default@localhost:8123?query=SELECT 1"
# Should return: 1

# Using clickhouse-client (if installed)
clickhouse-client --host localhost --port 9000 --user default --query "SELECT 1"
```

### 3. Check Backend Connection
```bash
# Check backend logs when it starts
cd backend
npm run dev

# Look for:
# "ClickHouse events_raw table initialized"
# No authentication errors
```

### 4. Test API Endpoint
```bash
# Get your token from browser
TOKEN="your_jwt_token"

# Test analytics endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user
```

---

## Using Docker Compose (Recommended)

The `docker-compose.yml` is already configured correctly:

```yaml
clickhouse:
  image: clickhouse/clickhouse-server:latest
  environment:
    CLICKHOUSE_USER: default
    CLICKHOUSE_PASSWORD: ''  # Empty password
```

### Start with Docker Compose
```bash
# Start ClickHouse only
docker-compose up -d clickhouse

# Or start all services
docker-compose up -d
```

### Verify in Backend
The backend should connect automatically. Check logs:
```bash
docker-compose logs backend | grep -i clickhouse
```

---

## Troubleshooting

### Error: "Authentication failed"
**Fix:** Ensure `CLICKHOUSE_PASSWORD` is empty in backend `.env`

### Error: "Connection refused"
**Fix:** 
- Check ClickHouse is running: `docker ps | grep clickhouse`
- Check port 8123 is accessible: `curl http://localhost:8123`

### Error: "Table does not exist"
**Fix:** Tables auto-create on first connection. Check backend logs for initialization errors.

### Error: "Database does not exist"
**Fix:** ClickHouse creates `default` database automatically. No action needed.

---

## Production Setup

For production, you should:
1. Set a strong password for ClickHouse
2. Use environment variables for credentials
3. Enable SSL/TLS
4. Restrict network access
5. Use a dedicated ClickHouse user (not `default`)

Example production `.env`:
```bash
CLICKHOUSE_HOST=clickhouse.production.com
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=analytics
CLICKHOUSE_USER=analytics_user
CLICKHOUSE_PASSWORD=strong_random_password_here
```

---

## Next Steps

After fixing authentication:
1. ✅ Restart backend
2. ✅ Check backend logs for "ClickHouse ... initialized" messages
3. ✅ Test dashboard - should show metrics (may be zeros initially)
4. ✅ Watch a video to generate test events
5. ✅ Verify events appear in ClickHouse

For testing guide, see: `docs/ANALYTICS_QUICK_TEST.md`

