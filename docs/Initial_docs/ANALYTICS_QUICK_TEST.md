# Analytics Quick Testing Guide

## Quick Start - 5 Minute Test

### Step 1: Verify Services Are Running

```bash
# Check backend
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}

# Check ClickHouse
curl http://localhost:8123
# Should return: Ok.
```

### Step 2: Generate Test Events

1. **Login to the application** (any user)
2. **Navigate to a video**: `/watch/[videoId]`
3. **Play the video** for at least 30 seconds
4. **Check browser console** (F12) for analytics events being sent

### Step 3: Verify Events in ClickHouse

```bash
# Connect to ClickHouse
clickhouse-client

# Check if events exist
SELECT count() FROM events_raw;

# View recent events
SELECT 
  eventType,
  videoId,
  userId,
  timestamp
FROM events_raw
ORDER BY timestamp DESC
LIMIT 10;
```

### Step 4: Test Dashboard

1. **Navigate to `/dashboard`**
2. **Should see metrics** (may be zeros if no events yet)
3. **Check browser console** for API errors

### Step 5: Test API Directly

```bash
# Get token from browser localStorage (key: vs_platform_token)
TOKEN="your_token_here"

# Test user dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user | jq
```

---

## Common Issues & Quick Fixes

### Issue: "Failed to fetch user dashboard analytics"

**Quick Checks:**
1. ✅ Is ClickHouse running? `curl http://localhost:8123`
2. ✅ Check backend logs for errors
3. ✅ Verify token is valid (try logging out/in)
4. ✅ Check browser console for network errors

**Fix:**
```bash
# Start ClickHouse (if using Docker)
docker run -d -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server

# Or check if already running
docker ps | grep clickhouse
```

### Issue: All metrics show zero

**This is normal if:**
- No events have been tracked yet
- User hasn't watched any videos

**Fix:**
1. Watch a video for 30+ seconds
2. Wait a few seconds for events to process
3. Refresh the dashboard

### Issue: ClickHouse connection error

**Check environment variables:**
```bash
# In backend/.env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

---

## Testing Checklist

### For Regular Users:
- [ ] Dashboard loads without errors
- [ ] Metrics display (may be zeros initially)
- [ ] Analytics page loads
- [ ] Can view own video performance
- [ ] Recently watched videos appear

### For Admin Users:
- [ ] Admin dashboard loads
- [ ] Platform-wide metrics display
- [ ] Video analytics page works
- [ ] Can view any user's analytics
- [ ] Charts render correctly

---

## Manual API Testing

### Test User Dashboard
```bash
TOKEN="your_user_token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user
```

### Test Admin Dashboard
```bash
ADMIN_TOKEN="your_admin_token"
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/analytics/dashboard/admin
```

### Test Event Tracking
```bash
TOKEN="your_token"
VIDEO_ID="test_video_id"

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "'$VIDEO_ID'",
    "eventType": "VIDEO_OPENED",
    "currentTime": 0,
    "duration": 600
  }' \
  http://localhost:3001/api/analytics/event
```

---

## Using the Test Script

```bash
# Make script executable (already done)
chmod +x scripts/test-analytics.sh

# Run the script
./scripts/test-analytics.sh

# Or with tokens pre-set
export USER_TOKEN="your_token"
export ADMIN_TOKEN="admin_token"
./scripts/test-analytics.sh
```

---

## Debugging Steps

1. **Check Backend Logs:**
   ```bash
   cd backend
   npm run dev
   # Look for [Analytics] log messages
   ```

2. **Check Frontend Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Verify ClickHouse:**
   ```sql
   clickhouse-client
   SHOW TABLES;
   SELECT count() FROM events_raw;
   ```

4. **Test Authentication:**
   ```bash
   # Token should be in localStorage
   # Check if token is expired
   # Try logging out and back in
   ```

---

## Expected Behavior

### When Everything Works:
- ✅ Dashboard shows real metrics
- ✅ Analytics page displays charts
- ✅ No error messages
- ✅ Events are tracked in ClickHouse
- ✅ API endpoints return data

### When There's No Data:
- ✅ Metrics show zeros (normal)
- ✅ "No analytics data available" message
- ✅ No error messages (this is OK)

### When There's an Error:
- ❌ Error banner appears
- ❌ Console shows error details
- ❌ API returns error status
- ❌ Check troubleshooting guide

---

For detailed troubleshooting, see: `docs/ANALYTICS_TROUBLESHOOTING.md`

