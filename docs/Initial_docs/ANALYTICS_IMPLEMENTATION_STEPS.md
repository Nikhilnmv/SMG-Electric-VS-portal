# Analytics Implementation Steps - Complete Guide

## Current Issue
ClickHouse authentication error preventing analytics from working.

## Step-by-Step Fix

### Step 1: Verify ClickHouse is Running

```bash
# Check if ClickHouse responds
curl http://localhost:8123
# Expected: "Ok."

# If not running, start it:
docker-compose up -d clickhouse
# OR
docker run -d --name vs-platform-clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server:latest
```

### Step 2: Verify Backend Configuration

```bash
# Check backend/.env exists and has ClickHouse config
cat backend/.env | grep CLICKHOUSE

# Should show:
# CLICKHOUSE_HOST=localhost
# CLICKHOUSE_PORT=8123
# CLICKHOUSE_DB=default
# CLICKHOUSE_USER=default
# CLICKHOUSE_PASSWORD=    <-- MUST be empty
```

**If CLICKHOUSE_PASSWORD has a value, make it empty:**
```bash
# Edit backend/.env
# Change: CLICKHOUSE_PASSWORD=something
# To:     CLICKHOUSE_PASSWORD=
```

### Step 3: Restart Backend

```bash
cd backend

# Stop current backend (Ctrl+C if running in terminal)
# Then restart:
npm run dev
```

**Look for these success messages:**
```
[ClickHouse] Connecting to localhost:8123, database: default, user: default
ClickHouse events_raw table initialized
ClickHouse video_statistics_daily table initialized
ClickHouse user_statistics_daily table initialized
...
```

**If you see authentication errors:**
- Check ClickHouse is running
- Verify CLICKHOUSE_PASSWORD is empty in backend/.env
- Try restarting ClickHouse: `docker restart vs-platform-clickhouse`

### Step 4: Test Connection

```bash
# Test from command line
curl "http://default@localhost:8123?query=SELECT 1"
# Should return: 1

# Test API endpoint (get token from browser localStorage)
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user
```

### Step 5: Generate Test Data

1. **Login** to the application
2. **Navigate to a video**: `/watch/[videoId]`
3. **Play the video** for at least 30 seconds
4. **Events will be tracked automatically**

### Step 6: Verify Data in ClickHouse

```bash
# Connect to ClickHouse
docker exec -it vs-platform-clickhouse clickhouse-client

# Or if clickhouse-client is installed locally
clickhouse-client --host localhost --port 9000

# Check events
SELECT count() FROM events_raw;
SELECT * FROM events_raw ORDER BY timestamp DESC LIMIT 10;
```

### Step 7: Check Dashboard

1. Navigate to `/dashboard`
2. Should **NOT** show authentication error
3. Should show metrics (may be zeros if no data yet)
4. After watching videos, metrics should update

---

## Complete Setup Checklist

### Prerequisites
- [ ] ClickHouse is installed/running
- [ ] Backend can connect to ClickHouse
- [ ] backend/.env is configured correctly
- [ ] Backend is running without errors

### Configuration
- [ ] `CLICKHOUSE_HOST=localhost` (or correct host)
- [ ] `CLICKHOUSE_PORT=8123`
- [ ] `CLICKHOUSE_DB=default`
- [ ] `CLICKHOUSE_USER=default`
- [ ] `CLICKHOUSE_PASSWORD=` (EMPTY for local dev)

### Verification
- [ ] ClickHouse responds: `curl http://localhost:8123` → "Ok."
- [ ] Backend logs show "ClickHouse ... initialized"
- [ ] No authentication errors in backend logs
- [ ] Dashboard loads without errors
- [ ] Analytics page loads without errors

### Data Generation
- [ ] User has logged in
- [ ] User has watched at least one video
- [ ] Events appear in ClickHouse: `SELECT count() FROM events_raw;`
- [ ] Dashboard shows non-zero metrics

---

## Troubleshooting Common Issues

### Issue: "Authentication failed"

**Causes:**
1. ClickHouse has a password set, but backend is using empty password
2. ClickHouse user doesn't exist
3. Network/connection issue

**Solutions:**
1. **Reset ClickHouse to no password:**
   ```bash
   docker stop vs-platform-clickhouse
   docker rm vs-platform-clickhouse
   docker run -d --name vs-platform-clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server:latest
   ```

2. **Verify backend/.env has empty password:**
   ```bash
   grep CLICKHOUSE_PASSWORD backend/.env
   # Should show: CLICKHOUSE_PASSWORD=
   ```

3. **Check ClickHouse logs:**
   ```bash
   docker logs vs-platform-clickhouse | tail -20
   ```

### Issue: "Connection refused"

**Causes:**
1. ClickHouse not running
2. Wrong port
3. Firewall blocking

**Solutions:**
1. Start ClickHouse: `docker-compose up -d clickhouse`
2. Check port: `netstat -an | grep 8123`
3. Test connection: `curl http://localhost:8123`

### Issue: "Table does not exist"

**Causes:**
1. Tables not initialized
2. Initialization failed silently

**Solutions:**
1. Check backend logs for initialization errors
2. Manually create tables (see ClickHouse schema in docs)
3. Restart backend to trigger initialization

### Issue: All metrics show zero

**This is normal if:**
- No events have been tracked yet
- User hasn't watched any videos

**Solution:**
1. Watch a video for 30+ seconds
2. Wait a few seconds
3. Refresh dashboard

---

## Testing with Different Users

### Test as Regular User

1. **Create/Login as regular user**
2. **Watch videos** to generate events
3. **Check `/dashboard`** - should show user's own metrics
4. **Check `/analytics`** - should show user's video performance

### Test as Admin User

1. **Login as admin** (role: ADMIN)
2. **Check `/admin/analytics`** - should show platform-wide metrics
3. **Check `/admin/analytics/videos`** - should show all videos
4. **Check `/admin/analytics/users`** - should show user leaderboard

### Test API Endpoints

```bash
# Regular user dashboard
TOKEN="regular_user_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user

# Admin dashboard
ADMIN_TOKEN="admin_token"
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/analytics/dashboard/admin

# Video analytics
VIDEO_ID="some_video_id"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/video/$VIDEO_ID
```

---

## Next Steps After Setup

1. ✅ **Verify authentication is fixed**
2. ✅ **Generate test events** by watching videos
3. ✅ **Check dashboard** shows real data
4. ✅ **Test analytics page** displays charts
5. ✅ **Test admin analytics** (if admin user)
6. ✅ **Monitor backend logs** for any errors

---

## Quick Reference

### Start Services
```bash
# ClickHouse only
docker-compose up -d clickhouse

# All services
docker-compose up -d

# Backend
cd backend && npm run dev
```

### Check Status
```bash
# ClickHouse
curl http://localhost:8123

# Backend
curl http://localhost:3001/health

# Check ClickHouse tables
docker exec -it vs-platform-clickhouse clickhouse-client --query "SHOW TABLES"
```

### View Logs
```bash
# ClickHouse
docker logs vs-platform-clickhouse

# Backend
cd backend && npm run dev
# (logs in terminal)
```

---

## Support Resources

- **Quick Fix Guide**: `docs/QUICK_FIX_CLICKHOUSE.md`
- **Detailed Setup**: `docs/CLICKHOUSE_SETUP.md`
- **Troubleshooting**: `docs/ANALYTICS_TROUBLESHOOTING.md`
- **Testing Guide**: `docs/ANALYTICS_QUICK_TEST.md`

---

## Summary

The main issue is ClickHouse authentication. To fix:

1. ✅ Ensure ClickHouse is running
2. ✅ Set `CLICKHOUSE_PASSWORD=` (empty) in backend/.env
3. ✅ Restart backend
4. ✅ Verify connection in logs
5. ✅ Generate test data by watching videos
6. ✅ Check dashboard for metrics

Once authentication is fixed, the analytics system will work automatically!

