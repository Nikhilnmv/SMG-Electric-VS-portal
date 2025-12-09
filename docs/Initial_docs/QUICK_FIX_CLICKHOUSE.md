# Quick Fix: ClickHouse Authentication Error

## The Problem
You're seeing: "Authentication failed: password is incorrect" error in dashboard and analytics pages.

## The Solution (Choose One)

### Option 1: Quick Fix - Run Setup Script (Recommended)

```bash
# Run the automated setup script
./scripts/setup-clickhouse.sh
```

This will:
- ✅ Check if ClickHouse is running
- ✅ Test the connection
- ✅ Create/update backend/.env with correct settings
- ✅ Verify configuration

### Option 2: Manual Fix

#### Step 1: Ensure ClickHouse is Running
```bash
# Check if running
curl http://localhost:8123
# Should return: Ok.

# If not running, start it
docker-compose up -d clickhouse
# OR
docker run -d --name vs-platform-clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server:latest
```

#### Step 2: Create/Update backend/.env
```bash
cd backend

# Create .env if it doesn't exist
cat > .env << EOF
# ClickHouse - Use empty password for local development
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
EOF
```

**Important:** Make sure `CLICKHOUSE_PASSWORD=` is **empty** (no value after the `=`)

#### Step 3: Restart Backend
```bash
# Stop current backend (Ctrl+C if running)
# Then restart
cd backend
npm run dev
```

#### Step 4: Verify Connection
Look for these messages in backend logs:
```
[ClickHouse] Connecting to localhost:8123, database: default, user: default
ClickHouse events_raw table initialized
ClickHouse video_statistics_daily table initialized
...
```

If you see errors, check the troubleshooting section below.

#### Step 5: Test Dashboard
1. Open browser: http://localhost:3000/dashboard
2. Should **NOT** show authentication error
3. May show zeros (normal if no data yet)

---

## Troubleshooting

### Still Getting Authentication Error?

#### Check 1: Verify ClickHouse Accepts Empty Password
```bash
# Test connection
curl "http://default@localhost:8123?query=SELECT 1"
# Should return: 1
```

#### Check 2: Reset ClickHouse Container
```bash
# Stop and remove
docker stop vs-platform-clickhouse
docker rm vs-platform-clickhouse

# Start fresh (no password)
docker run -d \
  --name vs-platform-clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  clickhouse/clickhouse-server:latest

# Wait 5 seconds, then test
sleep 5
curl http://localhost:8123
```

#### Check 3: Verify Backend .env
```bash
# Check the password is truly empty
cat backend/.env | grep CLICKHOUSE_PASSWORD
# Should show: CLICKHOUSE_PASSWORD=
# NOT: CLICKHOUSE_PASSWORD=something
```

#### Check 4: Check Backend Logs
```bash
cd backend
npm run dev
# Look for [ClickHouse] messages
# Should NOT see authentication errors
```

---

## After Fixing: Generate Test Data

Once authentication is fixed, you need to generate some analytics data:

1. **Login** to the application
2. **Watch a video** for at least 30 seconds
3. **Check dashboard** - should show metrics (not zeros)
4. **Check analytics page** - should show data

---

## Verification Checklist

- [ ] ClickHouse is running: `curl http://localhost:8123` returns "Ok."
- [ ] backend/.env has `CLICKHOUSE_PASSWORD=` (empty)
- [ ] Backend logs show "ClickHouse ... initialized" messages
- [ ] No authentication errors in backend logs
- [ ] Dashboard loads without authentication error
- [ ] Analytics page loads without authentication error

---

## Still Having Issues?

1. **Check ClickHouse logs:**
   ```bash
   docker logs vs-platform-clickhouse
   ```

2. **Check backend logs:**
   ```bash
   cd backend
   npm run dev
   # Watch for [ClickHouse] messages
   ```

3. **Try connecting manually:**
   ```bash
   docker exec -it vs-platform-clickhouse clickhouse-client
   # Should connect without password
   ```

4. **See detailed guide:** `docs/CLICKHOUSE_SETUP.md`

---

## Expected Result

After fixing:
- ✅ No authentication errors
- ✅ Dashboard shows metrics (may be zeros initially)
- ✅ Analytics page loads
- ✅ Backend logs show successful ClickHouse connection
- ✅ Tables are created automatically

Then generate test data by watching videos!

