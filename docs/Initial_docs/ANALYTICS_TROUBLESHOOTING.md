# Analytics System Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Failed to fetch user dashboard analytics" Error

**Symptoms:**
- Dashboard shows all zeros
- Analytics page shows "No analytics data available"
- Error banner appears with "Failed to fetch user dashboard analytics"

**Possible Causes:**

1. **ClickHouse Not Running**
   ```bash
   # Check if ClickHouse is running
   docker ps | grep clickhouse
   # Or if running locally
   clickhouse-client --query "SELECT 1"
   ```

2. **ClickHouse Connection Issues**
   - Check environment variables in `.env`:
     ```bash
     CLICKHOUSE_HOST=localhost
     CLICKHOUSE_PORT=8123
     CLICKHOUSE_DB=default
     CLICKHOUSE_USER=default
     CLICKHOUSE_PASSWORD=
     ```

3. **Tables Not Initialized**
   - Tables are auto-created on first connection
   - Check backend logs for initialization errors
   - Manually verify tables exist:
     ```sql
     SHOW TABLES;
     SELECT * FROM events_raw LIMIT 5;
     ```

4. **Authentication Issues**
   - Token might be expired or invalid
   - Check browser console for 401/403 errors
   - Try logging out and back in

5. **No Data in ClickHouse**
   - If no events have been tracked, queries will return empty results
   - This is normal for new installations
   - Generate some test events by watching videos

**Solution Steps:**

1. **Check Backend Logs:**
   ```bash
   cd backend
   npm run dev
   # Look for ClickHouse connection errors
   ```

2. **Verify ClickHouse Connection:**
   ```bash
   # Test connection
   curl http://localhost:8123
   # Should return "Ok."
   ```

3. **Check Database Tables:**
   ```sql
   -- Connect to ClickHouse
   clickhouse-client
   
   -- List tables
   SHOW TABLES;
   
   -- Check events_raw table
   SELECT count() FROM events_raw;
   
   -- Check if tables exist
   SELECT name FROM system.tables WHERE database = 'default';
   ```

4. **Test API Endpoint Directly:**
   ```bash
   # Get your auth token from browser localStorage
   # Then test the endpoint:
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/analytics/dashboard/user
   ```

---

## Testing Guide

### Prerequisites

1. **Start Services:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   
   # Terminal 3: ClickHouse (if using Docker)
   docker run -d -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
   ```

2. **Verify Services:**
   - Backend: http://localhost:3001/health
   - Frontend: http://localhost:3000
   - ClickHouse: http://localhost:8123 (should return "Ok.")

---

## Test Case 1: Regular User Analytics

### Setup
1. Create a regular user account (not admin)
2. Login as that user
3. Upload a video (or use existing video)
4. Watch the video for at least 30 seconds

### Test Steps

#### Step 1: Generate Analytics Events
1. Navigate to `/watch/[videoId]`
2. Play the video
3. Let it play for at least 30 seconds
4. Pause and resume a few times
5. Complete the video (or watch to end)

**Expected Events Generated:**
- `VIDEO_OPENED` - When page loads
- `VIDEO_PLAY` - When play button clicked
- `VIDEO_PROGRESS` - Every 5-10 seconds
- `VIDEO_PAUSE` - When paused
- `VIDEO_COMPLETE` - When video ends

#### Step 2: Check Events in ClickHouse
```sql
-- Connect to ClickHouse
clickhouse-client

-- Check recent events
SELECT 
  eventType,
  videoId,
  userId,
  timestamp,
  currentTime
FROM events_raw
ORDER BY timestamp DESC
LIMIT 10;
```

#### Step 3: Test Dashboard API
```bash
# Get token from browser localStorage (key: vs_platform_token)
TOKEN="your_jwt_token_here"

# Test user dashboard endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user \
  | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "videosWatched": 1,
    "totalWatchTime": 30.5,
    "completionRate": 100.0,
    "streak": {
      "current": 1,
      "longest": 1,
      "lastActivity": "2024-01-15"
    },
    "recentlyWatched": [...],
    "recommendedVideos": [...]
  }
}
```

#### Step 4: Test Frontend Dashboard
1. Navigate to `/dashboard`
2. Should see:
   - Videos Watched: 1 (or more)
   - Watch Time: > 0 hours
   - Completion Rate: > 0%
   - Current Streak: 1 (or more)

#### Step 5: Test Analytics Page
1. Navigate to `/analytics`
2. Should see:
   - Metrics cards with real data
   - Charts (if data available)
   - My Videos Performance table (if user has uploaded videos)

---

## Test Case 2: Admin Analytics

### Setup
1. Login as admin user
2. Ensure there are videos in the system
3. Ensure there are users who have watched videos

### Test Steps

#### Step 1: Test Admin Dashboard API
```bash
# Get admin token
ADMIN_TOKEN="admin_jwt_token_here"

# Test admin dashboard endpoint
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/analytics/dashboard/admin \
  | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalVideos": 10,
    "totalViews": 150,
    "totalWatchTime": 5000.5,
    "avgCompletionRate": 65.5,
    "categoryWiseEngagement": [...],
    "topPerformingVideos": [...],
    "leastPerformingVideos": [...],
    "videoUploadTrends": [...],
    "dailyActiveUsers": [...],
    "watchTimePerDay": [...]
  }
}
```

#### Step 2: Test Admin Analytics Page
1. Navigate to `/admin/analytics`
2. Should see:
   - Total Watch Time
   - Completion Rate
   - Active Users (24h)
   - Focus Sessions
   - Charts with data
   - Top Videos table

#### Step 3: Test Video Analytics
1. Navigate to `/admin/analytics/videos`
2. Should see table of all videos with:
   - Views
   - Watch Time
   - Completion Rate
   - Engagement Score

3. Click "View Details" on any video
4. Should see detailed analytics:
   - Drop-off chart
   - Device distribution
   - Category distribution

---

## Test Case 3: Video-Specific Analytics

### Setup
1. Login as any user
2. Have a video ID ready

### Test Steps

#### Step 1: Test Video Analytics API
```bash
VIDEO_ID="your_video_id_here"
TOKEN="your_jwt_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/video/$VIDEO_ID \
  | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "...",
    "totalViews": 25,
    "uniqueViewers": 15,
    "avgWatchTime": 245.5,
    "completionRate": 68.5,
    "dropOffPoints": [...],
    "bufferingStats": {...},
    "devices": [...],
    "categories": [...]
  }
}
```

---

## Test Case 4: User-Specific Analytics

### Setup
1. Login as a user
2. Note the user ID from JWT token

### Test Steps

#### Step 1: Test User Analytics API
```bash
USER_ID="user_id_from_jwt"
TOKEN="your_jwt_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/user/$USER_ID \
  | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "totalWatchTime": 12500.5,
    "videosCompleted": 15,
    "focusModeTime": 3600.0,
    "recentlyWatched": [...],
    "watchHistory": [...]
  }
}
```

---

## Debugging Commands

### Check ClickHouse Status
```bash
# Check if ClickHouse is running
docker ps | grep clickhouse

# Check ClickHouse logs
docker logs clickhouse-container-name

# Test ClickHouse connection
curl http://localhost:8123
```

### Check Backend Logs
```bash
cd backend
npm run dev
# Watch for errors related to:
# - ClickHouse connection
# - Database queries
# - Authentication
```

### Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - Network errors (401, 403, 500)
   - API call failures
   - Authentication errors

### Verify Database Tables
```sql
-- Connect to ClickHouse
clickhouse-client

-- List all tables
SHOW TABLES;

-- Check events_raw structure
DESCRIBE events_raw;

-- Count events
SELECT count() FROM events_raw;

-- Check recent events
SELECT * FROM events_raw 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check video statistics
SELECT * FROM video_statistics_daily LIMIT 5;

-- Check user statistics
SELECT * FROM user_statistics_daily LIMIT 5;
```

### Test API Endpoints Manually

#### Test Event Tracking
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

#### Test User Dashboard
```bash
TOKEN="your_token"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/analytics/dashboard/user
```

#### Test Admin Dashboard
```bash
ADMIN_TOKEN="admin_token"

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/analytics/dashboard/admin
```

---

## Common Error Messages and Fixes

### Error: "Not authenticated"
**Fix:** 
- Check if token exists in localStorage
- Verify token is valid (not expired)
- Try logging out and back in

### Error: "ClickHouse connection failed"
**Fix:**
- Ensure ClickHouse is running
- Check CLICKHOUSE_HOST and CLICKHOUSE_PORT in .env
- Verify network connectivity

### Error: "Table does not exist"
**Fix:**
- Tables are auto-created on first connection
- Check backend logs for initialization errors
- Manually create tables if needed (see ClickHouse schema in docs)

### Error: "No data available"
**Fix:**
- This is normal if no events have been tracked yet
- Generate test events by watching videos
- Check if events are being inserted into ClickHouse

### Error: "Access denied" (403)
**Fix:**
- Verify user has correct permissions
- Admin endpoints require ADMIN role
- User endpoints require authentication

---

## Performance Testing

### Load Test Event Tracking
```bash
# Generate multiple events
for i in {1..100}; do
  curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "videoId": "'$VIDEO_ID'",
      "eventType": "VIDEO_PROGRESS",
      "currentTime": '$i',
      "duration": 600
    }' \
    http://localhost:3001/api/analytics/event
  sleep 0.1
done
```

### Check Query Performance
```sql
-- Check query execution time
SELECT 
  videoId,
  count() as views
FROM events_raw
WHERE eventType = 'VIDEO_OPENED'
GROUP BY videoId
ORDER BY views DESC
LIMIT 10;
```

---

## Verification Checklist

### For Regular Users:
- [ ] Dashboard shows correct metrics
- [ ] Analytics page displays user's video performance
- [ ] Recently watched videos appear
- [ ] Recommended videos are shown
- [ ] Charts render with data (if available)

### For Admin Users:
- [ ] Admin dashboard shows platform-wide metrics
- [ ] Video analytics page works
- [ ] User analytics page works
- [ ] Charts display correctly
- [ ] Top/least performing videos are accurate

### Data Integrity:
- [ ] Events are being tracked in ClickHouse
- [ ] Materialized views are updating
- [ ] Aggregations are correct
- [ ] No duplicate events
- [ ] Timestamps are accurate

---

## Next Steps After Testing

1. **If all tests pass:** Analytics system is working correctly
2. **If errors occur:** Follow the debugging steps above
3. **If data is missing:** Generate test events by watching videos
4. **If performance is slow:** Check ClickHouse indexes and query optimization

---

## Support

If issues persist:
1. Check backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure ClickHouse is running and accessible
4. Check network connectivity between services
5. Review the implementation documentation in `docs/ANALYTICS_IMPLEMENTATION.md`

