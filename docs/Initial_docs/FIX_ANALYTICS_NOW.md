# Fix Analytics Authentication Error - Step by Step

## The Problem
You're seeing "Authentication failed: password is incorrect" error because ClickHouse authentication is failing.

## Root Cause
ClickHouse is running, but the backend can't authenticate. This happens when:
- ClickHouse was configured with a password, but backend is using empty password
- OR ClickHouse client library is sending auth incorrectly

## The Fix (5 Minutes)

### Step 1: Verify ClickHouse is Running ✅
```bash
curl http://localhost:8123
# Should return: Ok.
```
**If not "Ok.", start ClickHouse:**
```bash
docker-compose up -d clickhouse
# Wait 5 seconds
```

### Step 2: Fix ClickHouse Authentication (IMPORTANT!)

**Option A: Use the automated fix script (Recommended)**
```bash
./scripts/fix-clickhouse-auth.sh
```

**Option B: Manual fix**
```bash
# Update ClickHouse user configuration to allow no password
docker exec vs-platform-clickhouse bash -c 'cat > /etc/clickhouse-server/users.d/default-user.xml << "EOF"
<clickhouse>
  <users>
    <default>
      <networks>
        <ip>::/0</ip>
      </networks>
      <password></password>
      <profile>default</profile>
      <quota>default</quota>
    </default>
  </users>
</clickhouse>
EOF
'

# Restart ClickHouse
docker restart vs-platform-clickhouse

# Wait for restart
sleep 8

# Verify it's running
curl http://localhost:8123
# Should return: Ok.
```

### Step 3: Verify Backend Configuration
```bash
# Check backend/.env
cat backend/.env | grep CLICKHOUSE

# Should show:
# CLICKHOUSE_HOST=localhost
# CLICKHOUSE_PORT=8123
# CLICKHOUSE_DB=default
# CLICKHOUSE_USER=default
# CLICKHOUSE_PASSWORD=    <-- MUST be empty (nothing after =)
```

**If CLICKHOUSE_PASSWORD has a value, fix it:**
```bash
# Edit backend/.env
# Find: CLICKHOUSE_PASSWORD=something
# Change to: CLICKHOUSE_PASSWORD=
# (Nothing after the equals sign)
```

### Step 4: Restart Backend
```bash
# Stop backend (Ctrl+C if running)
# Then:
cd backend
npm run dev
```

**Look for these SUCCESS messages:**
```
[ClickHouse] Connecting to localhost:8123, database: default, user: default
[ClickHouse] Connection test successful
ClickHouse events_raw table initialized
ClickHouse video_statistics_daily table initialized
...
```

**If you see authentication errors:**
- The password might still be set in ClickHouse
- Try Step 2 again (reset ClickHouse)
- Or check ClickHouse logs: `docker logs vs-platform-clickhouse`

### Step 5: Test the Fix
1. **Open browser**: http://localhost:3000/dashboard
2. **Should NOT show authentication error**
3. **May show zeros** (normal - no data yet)

### Step 6: Generate Test Data
1. **Login** to application
2. **Watch a video** for 30+ seconds
3. **Check dashboard** - should show metrics

---

## Quick Verification

### Test 1: ClickHouse Connection
```bash
curl http://localhost:8123
# Expected: Ok.
```

### Test 2: Backend Can Connect
```bash
# Check backend logs when starting
cd backend
npm run dev
# Look for: "[ClickHouse] Connection test successful"
```

### Test 3: API Endpoint
```bash
# Get token from browser localStorage (key: vs_platform_token)
TOKEN="your_token"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user
# Should return JSON (not error)
```

---

## If Still Not Working

### Option A: Use Docker Compose (Recommended)
```bash
# Stop everything
docker-compose down

# Remove ClickHouse volume (fresh start)
docker volume rm vs-platform_clickhouse_data

# Start fresh
docker-compose up -d clickhouse

# Wait 10 seconds
sleep 10

# Verify
curl http://localhost:8123
```

### Option B: Manual ClickHouse Reset
```bash
# Access ClickHouse container
docker exec -it vs-platform-clickhouse bash

# Check if password file exists
ls -la /etc/clickhouse-server/users.d/

# If default-password.xml exists, remove it
rm /etc/clickhouse-server/users.d/default-password.xml

# Exit and restart
exit
docker restart vs-platform-clickhouse
```

### Option C: Check ClickHouse Logs
```bash
docker logs vs-platform-clickhouse | tail -50
# Look for authentication-related messages
```

---

## Expected Result After Fix

✅ **Backend logs show:**
- `[ClickHouse] Connection test successful`
- `ClickHouse events_raw table initialized`
- No authentication errors

✅ **Dashboard:**
- Loads without error
- Shows metrics (may be zeros initially)

✅ **Analytics page:**
- Loads without error
- Shows charts (may be empty initially)

✅ **After watching videos:**
- Metrics update
- Events appear in ClickHouse
- Analytics show real data

---

## Testing Guide

Once fixed, test with:

### Regular User:
1. Login as regular user
2. Watch videos → generates events
3. Check `/dashboard` → user metrics
4. Check `/analytics` → user's video performance

### Admin User:
1. Login as admin
2. Check `/admin/analytics` → platform metrics
3. Check `/admin/analytics/videos` → all videos
4. Check `/admin/analytics/users` → user leaderboard

### API Testing:
```bash
# Use the test script
./scripts/test-analytics.sh

# Or manually
TOKEN="your_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user | jq
```

---

## Summary

**The issue:** ClickHouse authentication mismatch

**The fix:**
1. Reset ClickHouse (no password)
2. Ensure backend/.env has `CLICKHOUSE_PASSWORD=` (empty)
3. Restart backend
4. Verify connection in logs
5. Generate test data

**Time needed:** 5 minutes

**After fix:** Analytics will work automatically!

---

## Need More Help?

- **Quick Fix**: `docs/QUICK_FIX_CLICKHOUSE.md`
- **Detailed Setup**: `docs/CLICKHOUSE_SETUP.md`
- **Troubleshooting**: `docs/ANALYTICS_TROUBLESHOOTING.md`
- **Testing**: `docs/ANALYTICS_QUICK_TEST.md`

