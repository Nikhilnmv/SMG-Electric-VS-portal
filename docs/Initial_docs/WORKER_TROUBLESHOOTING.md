# Worker Troubleshooting Guide

## Problem: Videos Uploaded But Not Processing

If you see videos in "My Videos" with status "Processing" or "Approved" but they show "Video processing may not be complete", it means:

1. ✅ **Upload is working** - Files are saved to `backend/uploads/raw/`
2. ❌ **Worker is NOT processing** - No HLS files in `backend/uploads/hls/`

## Quick Diagnosis

Run the diagnostic script:
```bash
./scripts/check-worker-status.sh
```

Or check manually:

### 1. Check if Worker is Running

```bash
# Check if worker process exists
ps aux | grep worker

# Or check if it's listening for jobs
# (Worker should show logs like "Listening for jobs on queue: video-processing")
```

**If worker is NOT running:**
```bash
# Start the worker
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter worker dev
```

### 2. Check Redis Connection

The worker needs Redis to receive jobs from the backend.

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis:
redis-server

# Or if using Docker:
docker run -d -p 6379:6379 redis:alpine
```

### 3. Check Worker Logs

Look for:
- `Worker service started`
- `Listening for jobs on queue: video-processing`
- Job processing messages like `[job-id] Starting video processing...`

**Common errors:**
- `ECONNREFUSED` → Redis not running
- `Video file not found` → Path resolution issue
- `FFmpeg not found` → FFmpeg not installed

### 4. Verify Environment Variables

Check `worker/.env`:
```env
STORAGE_MODE=local
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
UPLOADS_DIR=../backend/uploads  # Or absolute path
```

## Manual Processing Trigger

If jobs are stuck, you can manually trigger processing:

### Option 1: Re-register the Video (Recommended)

This will create a new job in the queue:

```bash
# Get your auth token first
TOKEN="your-jwt-token"

# Get video ID from database or My Videos page
VIDEO_ID="b60f1a37-ea4a-4be1-85e8-b6aa683fba09"

# Re-register (this will create a new processing job)
curl -X POST http://localhost:3001/api/videos/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Video",
    "description": "Test",
    "filePath": "/uploads/raw/'$VIDEO_ID'/original.mp4",
    "videoId": "'$VIDEO_ID'"
  }'
```

### Option 2: Direct Database Update + Manual Job

```sql
-- Reset video status to UPLOADED
UPDATE videos 
SET status = 'UPLOADED' 
WHERE id = 'your-video-id';
```

Then re-register via API (Option 1).

### Option 3: Use BullMQ Dashboard (Advanced)

If you have BullMQ dashboard installed, you can manually retry failed jobs.

## Processing Time Estimates

- **Small video (< 100MB)**: 2-5 minutes
- **Medium video (100-500MB)**: 5-15 minutes  
- **Large video (> 500MB)**: 15-30+ minutes

Processing time depends on:
- Video duration
- Video resolution
- FFmpeg performance
- System resources

## Check Processing Progress

### 1. Watch Worker Logs

```bash
# In worker terminal, you should see:
[job-id] Starting video processing for video {videoId}
[job-id] Resolving local file path from: /uploads/raw/...
[job.id] Source file exists. Size: X bytes
[job-id] Starting FFmpeg transcoding...
[job-id] Transcoding completed
[job-id] HLS files saved to local storage
[job-id] Video processing completed successfully
```

### 2. Check HLS Output

```bash
# Check if HLS files are being created
ls -la backend/uploads/hls/{videoId}/

# Should see:
# - master.m3u8
# - 240p.m3u8, 360p.m3u8, etc.
# - *.ts segment files
```

### 3. Check Database Status

```sql
SELECT id, title, status, "hlsPath", "createdAt" 
FROM videos 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

Status should progress: `UPLOADED` → `PROCESSING` → `READY` (or `APPROVED` if approved before processing)

## Common Issues & Solutions

### Issue: Worker Not Picking Up Jobs

**Symptoms:**
- Videos stuck in `UPLOADED` or `PROCESSING` status
- No worker logs showing job processing

**Solutions:**
1. Restart worker: `pnpm --filter worker dev`
2. Check Redis connection
3. Verify queue name matches: `video-processing`
4. Check backend is enqueuing jobs (check backend logs)

### Issue: "Video file not found" Error

**Symptoms:**
- Worker logs show: `Source video file not found`

**Solutions:**
1. Check `UPLOADS_DIR` in worker `.env` points to correct location
2. Verify file exists: `ls -la backend/uploads/raw/{videoId}/original.*`
3. Check file path in database: `SELECT "s3Key" FROM videos WHERE id = '{videoId}';`
4. Ensure worker has read permissions

### Issue: FFmpeg Errors

**Symptoms:**
- Worker logs show FFmpeg command failures
- "FFmpeg not found" errors

**Solutions:**
1. Install FFmpeg: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
2. Verify: `ffmpeg -version`
3. Check `FFMPEG_PATH` in worker `.env` if FFmpeg is in non-standard location

### Issue: Jobs Stuck in PROCESSING

**Symptoms:**
- Videos stuck in `PROCESSING` status for hours
- No worker activity

**Solutions:**
1. Check if worker crashed (restart it)
2. Check worker logs for errors
3. Manually reset status and re-queue (see Manual Processing above)

## Verification Checklist

After starting worker, verify:

- [ ] Worker process is running (`ps aux | grep worker`)
- [ ] Redis is running (`redis-cli ping`)
- [ ] Worker logs show "Listening for jobs"
- [ ] Backend logs show jobs being enqueued
- [ ] Worker logs show jobs being picked up
- [ ] HLS files appear in `backend/uploads/hls/{videoId}/`
- [ ] Database shows status progression
- [ ] Videos become playable

## Next Steps

1. **Start the worker** if not running
2. **Check worker logs** for any errors
3. **Wait for processing** (can take 5-30 minutes depending on video size)
4. **Verify HLS files** are created
5. **Test playback** at `/watch/{videoId}`

If issues persist, check:
- Worker logs for specific error messages
- Backend logs for job enqueue errors
- Redis connection
- File permissions
- FFmpeg installation

