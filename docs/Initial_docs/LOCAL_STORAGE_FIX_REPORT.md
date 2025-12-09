# Local Storage Mode - Complete Fix Report

## Overview
This document details all fixes applied to the local storage video upload → processing → playback pipeline. All fixes are specific to `STORAGE_MODE=local` and do not affect S3 mode functionality.

## Issues Fixed

### 1. Backend Upload Endpoint ✅
**Problem**: Files were not being saved correctly to `/backend/uploads/raw/`.

**Fixes Applied**:
- Added comprehensive logging to `uploadController.uploadLocal`
- Enhanced `saveLocalFile` in `backend/src/services/localStorage.ts` with:
  - File existence verification after write
  - File size verification
  - Detailed error logging
- Files now correctly saved to `/backend/uploads/raw/{videoId}/original.{ext}`

**Files Modified**:
- `backend/src/controllers/uploadController.ts`
- `backend/src/services/localStorage.ts`

### 2. Static File Serving ✅
**Problem**: Static files from `/uploads` directory were not being served correctly.

**Fixes Applied**:
- Enhanced static file serving in `backend/src/index.ts`:
  - Automatic directory creation if missing
  - Added ETag and caching headers
  - Improved logging
- Files now accessible at `http://localhost:3001/uploads/...`

**Files Modified**:
- `backend/src/index.ts`

### 3. Video Registration & Status Management ✅
**Problem**: Video status was not correctly set during registration, causing confusion in the pipeline.

**Fixes Applied**:
- Updated `VideoService.registerUploadedVideo` to:
  - Set initial status to `UPLOADED` in local mode (since file is already saved)
  - Set status to `PROCESSING` in S3 mode
  - Added comprehensive logging throughout the registration process
- Worker now updates status to `PROCESSING` when job starts
- Worker updates status to `READY` when transcoding completes

**Files Modified**:
- `backend/src/services/videoService.ts`
- `backend/src/controllers/videoController.ts`
- `worker/src/queue/videoProcessing.ts`
- `worker/src/utils/database.ts`

### 4. Worker File Path Resolution ✅
**Problem**: Worker could not find uploaded video files due to incorrect path resolution.

**Fixes Applied**:
- Enhanced `worker/src/services/localStorage.ts`:
  - Smart path resolution that tries multiple locations
  - Better handling of `/uploads/` prefixed paths
  - Comprehensive logging for debugging
  - File existence verification at each step

**Files Modified**:
- `worker/src/services/localStorage.ts`

### 5. HLS Output Generation ✅
**Problem**: HLS files were not being saved to the correct location or verified.

**Fixes Applied**:
- Enhanced HLS file copying in worker:
  - Verification that master.m3u8 exists after copy
  - Detailed logging of each file copied
  - Proper directory creation
  - Error handling if files are missing

**Files Modified**:
- `worker/src/queue/videoProcessing.ts`

### 6. Playback Endpoint ✅
**Problem**: Playback endpoint did not check if video was ready (had hlsPath).

**Fixes Applied**:
- Added validation in `videoController.getById`:
  - Checks if `hlsPath` exists before allowing playback
  - Returns appropriate error if video is not ready
  - Better error messages

**Files Modified**:
- `backend/src/controllers/videoController.ts`

### 7. Frontend Playback Page ✅
**Problem**: HLS URL construction and error handling needed improvement.

**Fixes Applied**:
- Enhanced HLS URL construction in watch page:
  - Better logging for debugging
  - Proper error handling for missing hlsPath
  - Clear error messages for users

**Files Modified**:
- `frontend/src/app/watch/[videoId]/page.tsx`

### 8. My Videos Page ✅
**Problem**: Video status display was not user-friendly.

**Fixes Applied**:
- Added color-coded status badges
- Added helpful status messages
- Better visual feedback for processing states

**Files Modified**:
- `frontend/src/app/my-videos/page.tsx`

## Modified Files Summary

### Backend
1. `backend/src/controllers/uploadController.ts` - Enhanced upload logging
2. `backend/src/controllers/videoController.ts` - Added hlsPath validation, logging
3. `backend/src/services/localStorage.ts` - Enhanced file saving with verification
4. `backend/src/services/videoService.ts` - Fixed status management, added logging
5. `backend/src/index.ts` - Enhanced static file serving

### Worker
1. `worker/src/queue/videoProcessing.ts` - Enhanced path resolution, HLS output, logging
2. `worker/src/services/localStorage.ts` - Smart path resolution, better error handling
3. `worker/src/utils/database.ts` - Enhanced status updates with logging

### Frontend
1. `frontend/src/app/watch/[videoId]/page.tsx` - Better HLS URL construction, error handling
2. `frontend/src/app/my-videos/page.tsx` - Improved status display

## Testing Commands

### 1. Test Upload Endpoint
```bash
# Get auth token first (login)
TOKEN="your-jwt-token"

# Upload a video
curl -X POST http://localhost:3001/api/videos/upload-local \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@/path/to/test-video.mp4"
```

### 2. Test Video Registration
```bash
# Register the uploaded video
curl -X POST http://localhost:3001/api/videos/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Video",
    "description": "Test description",
    "filePath": "/uploads/raw/{videoId}/original.mp4",
    "videoId": "{videoId-from-upload-response}"
  }'
```

### 3. Test Static File Serving
```bash
# Test if static files are accessible
curl http://localhost:3001/uploads/raw/{videoId}/original.mp4

# Test HLS master playlist (after processing)
curl http://localhost:3001/uploads/hls/{videoId}/master.m3u8
```

### 4. Test Video Playback Endpoint
```bash
# Get video by ID
curl -X GET http://localhost:3001/api/videos/{videoId} \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test My Videos
```bash
# Get user's videos
curl -X GET http://localhost:3001/api/videos/my-videos \
  -H "Authorization: Bearer $TOKEN"
```

## End-to-End Testing Flow

1. **Upload Video**:
   ```bash
   # Use the frontend upload page or curl command above
   # Verify file exists: ls -la backend/uploads/raw/{videoId}/
   ```

2. **Verify File Saved**:
   ```bash
   ls -la backend/uploads/raw/{videoId}/
   # Should see: original.mp4 (or original.mov, etc.)
   ```

3. **Check Worker Processing**:
   ```bash
   # Check worker logs for processing status
   # Verify HLS output: ls -la backend/uploads/hls/{videoId}/
   # Should see: master.m3u8, 240p.m3u8, 240p_000.ts, etc.
   ```

4. **Admin Approval**:
   ```bash
   # Approve video via admin panel or API
   curl -X POST http://localhost:3001/api/admin/videos/{videoId}/approve \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

5. **Test Playback**:
   - Navigate to `/watch/{videoId}` in frontend
   - Video should load and play correctly

## Troubleshooting

### Issue: Files Not Saving
**Symptoms**: `/backend/uploads/raw/` remains empty after upload

**Solutions**:
1. Check backend logs for upload errors
2. Verify directory permissions:
   ```bash
   chmod -R 755 backend/uploads
   ```
3. Check if `STORAGE_MODE=local` is set in backend `.env`
4. Verify disk space: `df -h`

### Issue: Worker Cannot Find Files
**Symptoms**: Worker logs show "Video file not found"

**Solutions**:
1. Check `UPLOADS_DIR` environment variable in worker
2. Verify file path in database: `SELECT id, "s3Key", status FROM videos WHERE id = '{videoId}';`
3. Check worker logs for path resolution details
4. Ensure worker has access to backend/uploads directory

### Issue: HLS Not Generated
**Symptoms**: No files in `/backend/uploads/hls/{videoId}/`

**Solutions**:
1. Check worker logs for FFmpeg errors
2. Verify FFmpeg is installed: `ffmpeg -version`
3. Check worker has write permissions: `chmod -R 755 backend/uploads/hls`
4. Verify Redis connection (worker uses Redis for job queue)

### Issue: Video Playback Fails
**Symptoms**: "Video Not Found" or "Video is not ready for playback"

**Solutions**:
1. Check video status in database: `SELECT id, status, "hlsPath" FROM videos WHERE id = '{videoId}';`
2. Verify `hlsPath` is set and points to correct location
3. Test static file serving: `curl http://localhost:3001/uploads/hls/{videoId}/master.m3u8`
4. Check browser console for CORS or network errors

### Issue: Permission Errors
**Symptoms**: "EACCES" or "Permission denied" errors

**Solutions**:
```bash
# Fix directory permissions
sudo chown -R $USER:$USER backend/uploads
chmod -R 755 backend/uploads

# If using Docker, ensure volumes are mounted correctly
```

## Database Cleanup

### Remove Stale Video Entries
```sql
-- Find videos without files
SELECT v.id, v.title, v.status, v."s3Key" 
FROM videos v 
WHERE v.status IN ('UPLOADED', 'PROCESSING') 
  AND v."createdAt" < NOW() - INTERVAL '1 day';

-- Delete stale videos (be careful!)
DELETE FROM videos 
WHERE id IN (
  SELECT id FROM videos 
  WHERE status = 'PROCESSING' 
    AND "createdAt" < NOW() - INTERVAL '7 days'
);
```

### Reset Video Status
```sql
-- Reset stuck PROCESSING videos to UPLOADED
UPDATE videos 
SET status = 'UPLOADED' 
WHERE status = 'PROCESSING' 
  AND "createdAt" < NOW() - INTERVAL '1 hour';
```

## Manual Worker Job Trigger

If you need to manually trigger a worker job for testing:

```typescript
// In backend, you can manually add a job:
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const queue = new Queue('video-processing', { connection: redis });

await queue.add('transcode-video', {
  videoId: 'your-video-id',
  s3Key: '/uploads/raw/your-video-id/original.mp4',
  filePath: '/uploads/raw/your-video-id/original.mp4',
  title: 'Test Video',
  description: null,
});
```

## Environment Variables

Ensure these are set correctly:

### Backend (.env)
```env
STORAGE_MODE=local
UPLOADS_DIR=./uploads  # Optional, defaults to backend/uploads
PORT=3001
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Worker (.env)
```env
STORAGE_MODE=local
UPLOADS_DIR=../backend/uploads  # Path relative to worker, or absolute
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
FFMPEG_PATH=ffmpeg  # Or full path if not in PATH
TEMP_DIR=/tmp/transcode
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STORAGE_MODE=local
```

## Verification Checklist

After implementing fixes, verify:

- [ ] Upload saves file to `/backend/uploads/raw/{videoId}/`
- [ ] Video record created in database with status `UPLOADED`
- [ ] Worker picks up job and updates status to `PROCESSING`
- [ ] HLS files generated in `/backend/uploads/hls/{videoId}/`
- [ ] Master playlist exists: `master.m3u8`
- [ ] Worker updates status to `READY` and sets `hlsPath`
- [ ] Static files accessible via `http://localhost:3001/uploads/...`
- [ ] Admin can approve video
- [ ] Video appears in My Videos with correct status
- [ ] Playback works at `/watch/{videoId}`
- [ ] HLS streams load correctly in video player

## Next Steps

1. Monitor logs for any errors during upload/processing
2. Test with various video formats and sizes
3. Verify category-based access control still works
4. Test concurrent uploads
5. Monitor worker queue for stuck jobs

## Support

If issues persist:
1. Check all logs (backend, worker, frontend console)
2. Verify environment variables
3. Check file permissions
4. Verify Redis and database connections
5. Review this document's troubleshooting section

