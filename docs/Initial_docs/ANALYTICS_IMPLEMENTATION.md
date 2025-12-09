# Analytics System Implementation Report

## Overview

This document describes the complete end-to-end analytics system implementation for the VS Platform. The system tracks user interactions with videos, provides real-time analytics dashboards, and supports both admin and user-level insights.

---

## 1. Modified/Created Files

### Backend Files

#### Created:
- `backend/src/schemas/analytics.ts` - Zod validation schemas for analytics events

#### Modified:
- `backend/src/services/clickhouse.ts` - Updated with new ClickHouse tables and materialized views
- `backend/src/controllers/analyticsController.ts` - Complete rewrite with all new endpoints
- `backend/src/routes/analytics.ts` - Added new analytics routes

### Frontend Files

#### Created:
- `frontend/src/lib/analytics.ts` - Analytics event tracking module with batching

#### Modified:
- `frontend/src/components/VideoPlayer.tsx` - Integrated new analytics tracking
- `frontend/src/lib/api.ts` - Added new analytics API methods
- `frontend/src/app/admin/analytics/page.tsx` - Updated to use real API
- `frontend/src/app/admin/analytics/video/[videoId]/page.tsx` - Updated to use real API
- `frontend/src/app/admin/analytics/videos/page.tsx` - New page for video list analytics
- `frontend/src/app/admin/analytics/users/page.tsx` - New page for user analytics
- `frontend/src/app/dashboard/page.tsx` - Updated to use real user dashboard API

---

## 2. Event Schema Definition

### Event Types

The system supports the following event types:

1. `VIDEO_PLAY` - User starts playing a video
2. `VIDEO_PAUSE` - User pauses a video
3. `VIDEO_PROGRESS` - Sent every 5-10 seconds during playback
4. `VIDEO_COMPLETE` - User completes watching a video
5. `VIDEO_BUFFER` - Video buffering occurs
6. `VIDEO_SEEK` - User seeks to a different position
7. `FOCUS_MODE_START` - User enters focus mode
8. `FOCUS_MODE_END` - User exits focus mode
9. `VIDEO_OPENED` - User opens a video page
10. `VIDEO_EXITED` - User leaves a video page

### Event Payload Schema (Zod)

```typescript
{
  userId: string (UUID),
  videoId: string (UUID),
  timestamp?: string (ISO 8601),
  eventType: EventType (enum),
  currentTime?: number (seconds, min: 0),
  duration?: number (seconds, min: 0),
  playbackQuality?: string,
  device?: string,
  categoryRole?: string,
  sessionId?: string (UUID)
}
```

### Example Event

```json
{
  "userId": "clx1234567890abcdef",
  "videoId": "clx0987654321fedcba",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "eventType": "VIDEO_PROGRESS",
  "currentTime": 125.5,
  "duration": 600.0,
  "playbackQuality": "1080p",
  "device": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "categoryRole": "DEALER",
  "sessionId": "clx-session-123456"
}
```

---

## 3. ClickHouse Schema DDL

### Table: events_raw

Main events table storing all analytics events.

```sql
CREATE TABLE IF NOT EXISTS events_raw (
  eventId UUID DEFAULT generateUUIDv4(),
  userId String,
  videoId String,
  eventType String,
  timestamp DateTime DEFAULT now(),
  currentTime Float32,
  fullDuration Float32,
  device String,
  categoryRole String,
  sessionId UUID,
  playbackQuality String
) ENGINE = MergeTree()
ORDER BY (videoId, timestamp)
PARTITION BY toYYYYMM(timestamp)
```

### Table: video_statistics_daily

Aggregated daily statistics per video.

```sql
CREATE TABLE IF NOT EXISTS video_statistics_daily (
  videoId String,
  date Date,
  views UInt32,
  uniqueViewers UInt32,
  avgWatchTime Float32,
  completionRate Float32
) ENGINE = SummingMergeTree()
ORDER BY (videoId, date)
```

### Materialized View: video_statistics_daily_mv

Automatically populates `video_statistics_daily` from `events_raw`.

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS video_statistics_daily_mv
TO video_statistics_daily
AS SELECT
  videoId,
  toDate(timestamp) as date,
  countIf(eventType = 'VIDEO_OPENED') as views,
  uniqExactIf(userId, eventType = 'VIDEO_OPENED') as uniqueViewers,
  avgIf(currentTime, eventType = 'VIDEO_PROGRESS') as avgWatchTime,
  (countIf(eventType = 'VIDEO_COMPLETE') * 100.0 / 
   nullIf(countIf(eventType = 'VIDEO_OPENED'), 0)) as completionRate
FROM events_raw
WHERE eventType IN ('VIDEO_OPENED', 'VIDEO_PROGRESS', 'VIDEO_COMPLETE')
GROUP BY videoId, date
```

### Table: user_statistics_daily

Aggregated daily statistics per user.

```sql
CREATE TABLE IF NOT EXISTS user_statistics_daily (
  userId String,
  date Date,
  totalWatchTime Float32,
  videosCompleted UInt32,
  focusModeTime Float32
) ENGINE = SummingMergeTree()
ORDER BY (userId, date)
```

### Materialized View: user_statistics_daily_mv

Automatically populates `user_statistics_daily` from `events_raw`.

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS user_statistics_daily_mv
TO user_statistics_daily
AS SELECT
  userId,
  toDate(timestamp) as date,
  sumIf(currentTime, eventType = 'VIDEO_PROGRESS') as totalWatchTime,
  countIf(eventType = 'VIDEO_COMPLETE') as videosCompleted,
  sumIf(currentTime, eventType = 'FOCUS_MODE_START') as focusModeTime
FROM events_raw
WHERE userId != '' AND eventType IN ('VIDEO_PROGRESS', 'VIDEO_COMPLETE', 'FOCUS_MODE_START')
GROUP BY userId, date
```

### Table: playback_quality_metrics

Quality and buffering metrics.

```sql
CREATE TABLE IF NOT EXISTS playback_quality_metrics (
  videoId String,
  userId String,
  bufferingEvents UInt32,
  avgQuality String,
  timestamp DateTime
) ENGINE = MergeTree()
ORDER BY (videoId, timestamp)
PARTITION BY toYYYYMM(timestamp)
```

---

## 4. Example Events Sent by Frontend

### Video Play Event

```json
{
  "userId": "clx1234567890abcdef",
  "videoId": "clx0987654321fedcba",
  "eventType": "VIDEO_PLAY",
  "currentTime": 0,
  "duration": 600,
  "playbackQuality": "1080p",
  "device": "Mozilla/5.0...",
  "categoryRole": "DEALER",
  "sessionId": "clx-session-123456"
}
```

### Video Progress Event (sent every 5-10 seconds)

```json
{
  "userId": "clx1234567890abcdef",
  "videoId": "clx0987654321fedcba",
  "eventType": "VIDEO_PROGRESS",
  "currentTime": 125.5,
  "duration": 600,
  "playbackQuality": "1080p",
  "device": "Mozilla/5.0...",
  "categoryRole": "DEALER",
  "sessionId": "clx-session-123456"
}
```

### Focus Mode Start Event

```json
{
  "userId": "clx1234567890abcdef",
  "videoId": "clx0987654321fedcba",
  "eventType": "FOCUS_MODE_START",
  "currentTime": 30.0,
  "duration": 600,
  "device": "Mozilla/5.0...",
  "categoryRole": "DEALER",
  "sessionId": "clx-session-123456"
}
```

---

## 5. Example Responses from Analytics Endpoints

### GET /api/analytics/video/:videoId

```json
{
  "success": true,
  "data": {
    "videoId": "clx0987654321fedcba",
    "totalViews": 1250,
    "uniqueViewers": 890,
    "avgWatchTime": 245.5,
    "completionRate": 68.5,
    "dropOffPoints": [
      { "timestamp": 0, "viewers": 1250 },
      { "timestamp": 60, "viewers": 980 },
      { "timestamp": 120, "viewers": 750 },
      { "timestamp": 180, "viewers": 520 }
    ],
    "bufferingStats": {
      "totalEvents": 45,
      "rate": 0.036
    },
    "devices": [
      { "device": "Chrome/120.0...", "count": 850 },
      { "device": "Safari/17.0...", "count": 300 },
      { "device": "Firefox/121.0...", "count": 100 }
    ],
    "categories": [
      { "category": "DEALER", "count": 600 },
      { "category": "EMPLOYEE", "count": 400 },
      { "category": "TECHNICIAN", "count": 250 }
    ]
  }
}
```

### GET /api/analytics/user/:userId

```json
{
  "success": true,
  "data": {
    "userId": "clx1234567890abcdef",
    "totalWatchTime": 12500.5,
    "videosCompleted": 15,
    "focusModeTime": 3600.0,
    "recentlyWatched": [
      {
        "videoId": "clx0987654321fedcba",
        "title": "Introduction to Electric Vehicles",
        "duration": 600,
        "lastWatched": "2024-01-15T10:30:00.000Z"
      }
    ],
    "watchHistory": [
      {
        "videoId": "clx0987654321fedcba",
        "eventType": "VIDEO_OPENED",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "currentTime": 0
      }
    ]
  }
}
```

### GET /api/analytics/dashboard/admin

```json
{
  "success": true,
  "data": {
    "totalVideos": 150,
    "totalViews": 125000,
    "totalWatchTime": 2500000.5,
    "avgCompletionRate": 65.5,
    "categoryWiseEngagement": [
      { "category": "DEALER", "views": 50000, "watchTime": 1000000 },
      { "category": "EMPLOYEE", "views": 40000, "watchTime": 800000 },
      { "category": "TECHNICIAN", "views": 35000, "watchTime": 700000 }
    ],
    "topPerformingVideos": [
      {
        "videoId": "clx0987654321fedcba",
        "title": "Introduction to Electric Vehicles",
        "views": 5000,
        "watchTime": 125000,
        "completionRate": 75.5
      }
    ],
    "leastPerformingVideos": [
      {
        "videoId": "clx1111111111111111",
        "title": "Advanced Topics",
        "views": 10,
        "watchTime": 500,
        "completionRate": 20.0
      }
    ],
    "videoUploadTrends": [
      { "date": "2024-01-15", "count": 5 },
      { "date": "2024-01-14", "count": 3 }
    ],
    "dailyActiveUsers": [
      { "date": "2024-01-15", "activeUsers": 150 },
      { "date": "2024-01-14", "activeUsers": 140 }
    ],
    "watchTimePerDay": [
      { "date": "2024-01-15", "watchTime": 50000 },
      { "date": "2024-01-14", "watchTime": 48000 }
    ]
  }
}
```

### GET /api/analytics/dashboard/user

```json
{
  "success": true,
  "data": {
    "videosWatched": 25,
    "totalWatchTime": 12500.5,
    "completionRate": 68.5,
    "streak": {
      "current": 5,
      "longest": 10,
      "lastActivity": "2024-01-15"
    },
    "recommendedVideos": [
      {
        "id": "clx0987654321fedcba",
        "title": "Introduction to Electric Vehicles",
        "description": "Learn the basics...",
        "duration": 600
      }
    ]
  }
}
```

---

## 6. How to Test Analytics Locally

### Prerequisites

1. ClickHouse running locally or accessible
2. Backend server running on port 3001
3. Frontend running on port 3000
4. User authenticated in the frontend

### Testing Event Collection

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open a video in the browser:**
   - Navigate to `/watch/[videoId]`
   - Play the video
   - Check browser console for analytics events being sent

4. **Verify events in ClickHouse:**
   ```sql
   SELECT * FROM events_raw ORDER BY timestamp DESC LIMIT 10;
   ```

### Testing Analytics Endpoints

1. **Test video analytics:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/analytics/video/VIDEO_ID
   ```

2. **Test user analytics:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/analytics/user/USER_ID
   ```

3. **Test admin dashboard:**
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:3001/api/analytics/dashboard/admin
   ```

4. **Test user dashboard:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/analytics/dashboard/user
   ```

### Testing Frontend Dashboards

1. **Admin Analytics:**
   - Navigate to `/admin/analytics`
   - Verify charts and metrics load correctly
   - Check video list at `/admin/analytics/videos`

2. **User Dashboard:**
   - Navigate to `/dashboard`
   - Verify user-specific metrics display
   - Check watch history and recommendations

---

## 7. Notes for Deploying Analytics in Production

### Environment Variables

Ensure these are set in production:

```bash
# ClickHouse Configuration
CLICKHOUSE_HOST=your-clickhouse-host
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=analytics
CLICKHOUSE_USER=analytics_user
CLICKHOUSE_PASSWORD=secure_password

# Backend
JWT_SECRET=your-secure-jwt-secret
API_URL=https://api.yourdomain.com
```

### ClickHouse Setup

1. **Create database:**
   ```sql
   CREATE DATABASE IF NOT EXISTS analytics;
   ```

2. **Run table initialization:**
   - Tables are auto-created on first connection
   - Verify with: `SHOW TABLES FROM analytics;`

3. **Set up replication (if needed):**
   - Configure ClickHouse cluster for high availability
   - Use ReplicatedMergeTree for production

### Performance Considerations

1. **Batching:**
   - Frontend batches events every 3 seconds
   - Maximum batch size: 50 events
   - Events are sent individually to backend (ClickHouse handles batching)

2. **Compression:**
   - ClickHouse automatically compresses data
   - Consider enabling additional compression for older partitions

3. **Partitioning:**
   - Events are partitioned by month (`toYYYYMM(timestamp)`)
   - Old partitions can be dropped after retention period

4. **Materialized Views:**
   - Aggregations happen automatically via materialized views
   - Consider adding indexes for frequently queried columns

5. **Rate Limiting:**
   - Consider adding rate limiting on `/api/analytics/event` endpoint
   - Prevent abuse from malicious clients

### Monitoring

1. **ClickHouse Metrics:**
   - Monitor table sizes
   - Track query performance
   - Set up alerts for slow queries

2. **Application Metrics:**
   - Monitor event ingestion rate
   - Track API response times
   - Alert on high error rates

3. **Frontend Metrics:**
   - Track failed event sends
   - Monitor retry rates
   - Alert on high failure rates

### Data Retention

1. **Raw Events:**
   - Recommend 90 days for `events_raw`
   - Archive older data to cold storage

2. **Aggregated Data:**
   - Keep `video_statistics_daily` and `user_statistics_daily` indefinitely
   - These are small and provide historical trends

### Security

1. **Authentication:**
   - All endpoints require authentication
   - Users can only access their own analytics
   - Admins can access all analytics

2. **Data Privacy:**
   - Consider GDPR compliance
   - Implement data deletion endpoints
   - Anonymize user data in exports

---

## 8. Performance Considerations

### Batching Strategy

- **Frontend:** Events are queued and sent in batches every 3 seconds
- **Backend:** Events are inserted individually (ClickHouse optimizes internally)
- **Retry Logic:** Failed events are retried with exponential backoff (max 3 retries)
- **Offline Support:** Failed events are stored in localStorage and retried on next session

### Compression

- ClickHouse uses LZ4 compression by default
- Consider ZSTD for better compression ratio
- Compression is automatic and transparent

### Query Optimization

1. **Use materialized views** for common aggregations
2. **Partition by month** for efficient data management
3. **Order by (videoId, timestamp)** for fast video-specific queries
4. **Use appropriate data types** (Float32 for time, String for IDs)

### Scaling Considerations

1. **Horizontal Scaling:**
   - ClickHouse supports distributed tables
   - Use sharding for very large datasets

2. **Vertical Scaling:**
   - Increase ClickHouse server resources
   - Monitor CPU and memory usage

3. **Caching:**
   - Consider caching dashboard queries
   - Use Redis for frequently accessed metrics

---

## Summary

The analytics system is now fully functional with:

✅ Event collection with Zod validation  
✅ ClickHouse storage with materialized views  
✅ Backend API endpoints for all analytics queries  
✅ Frontend event tracking with batching and retry  
✅ Admin analytics dashboards with real charts  
✅ User analytics dashboard  
✅ Comprehensive error handling and retry logic  

The system is production-ready with proper error handling, batching, and performance optimizations.

