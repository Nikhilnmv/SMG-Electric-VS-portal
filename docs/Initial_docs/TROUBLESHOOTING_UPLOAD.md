# Troubleshooting Video Upload Issues

## Problem: Videos Upload Successfully But Don't Appear in "My Videos"

### Root Cause
The video list endpoint (`GET /api/videos`) only shows videos with `status: 'APPROVED'`, but newly uploaded videos start with `status: 'PROCESSING'` and are updated to `status: 'READY'` after transcoding. They only become `APPROVED` after admin approval.

### Solution Implemented
1. **New Endpoint**: Created `GET /api/videos/my-videos` that shows ALL videos for the current user, regardless of status
2. **Frontend Update**: Updated the "My Videos" page to use the new endpoint
3. **Status Flow**: 
   - `PROCESSING` → Video is being transcoded by worker
   - `READY` → Video transcoding complete, waiting for admin approval
   - `APPROVED` → Video is visible to all users (in main video list)
   - `REJECTED` → Video was rejected by admin

### Verification Steps

1. **Check if videos are being created:**
   ```bash
   # Check uploaded files
   ls -la backend/uploads/raw/
   
   # Check backend logs for video creation
   # Look for "Video created" or "registerUploadedVideo" messages
   ```

2. **Check video status in database:**
   - Videos should be created with `status: 'PROCESSING'`
   - After worker processes, status should change to `status: 'READY'`
   - After admin approval, status should be `status: 'APPROVED'`

3. **Check worker is running:**
   ```bash
   # Check if worker process is running
   ps aux | grep worker
   
   # Check worker logs for processing messages
   # Look for "Starting video processing" and "Video processing completed"
   ```

4. **Test the API directly:**
   ```bash
   # Get auth token from browser localStorage
   TOKEN="your-jwt-token"
   
   # Test my-videos endpoint
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/videos/my-videos
   
   # Should return: { "success": true, "data": [...] }
   ```

5. **Check browser console:**
   - Open browser DevTools (F12)
   - Go to "My Videos" page
   - Check Console tab for API responses
   - Check Network tab for API calls to `/api/videos/my-videos`

### Common Issues

#### Issue 1: Videos not appearing in "My Videos"
**Symptoms**: Upload shows success, but "My Videos" page is empty

**Possible Causes**:
- User not authenticated (check localStorage for token)
- API endpoint not working (check Network tab in browser)
- Database connection issue (check backend logs)

**Fix**:
1. Check browser console for errors
2. Verify authentication token is valid
3. Check backend is running on port 3001
4. Verify database connection

#### Issue 2: Videos stuck in PROCESSING status
**Symptoms**: Videos show "Processing" status indefinitely

**Possible Causes**:
- Worker not running
- Worker not processing jobs from queue
- Redis connection issue
- FFmpeg not installed or not in PATH

**Fix**:
1. Check worker is running: `ps aux | grep worker`
2. Check Redis is running: `redis-cli ping`
3. Check worker logs for errors
4. Verify FFmpeg is installed: `ffmpeg -version`

#### Issue 3: Files not being saved
**Symptoms**: Upload succeeds but no files in `backend/uploads/raw/`

**Possible Causes**:
- Directory permissions issue
- STORAGE_MODE not set to 'local'
- Multer configuration issue

**Fix**:
1. Check `STORAGE_MODE=local` in `backend/.env`
2. Check directory permissions: `ls -la backend/uploads/`
3. Check backend logs for file save errors

### Testing the Complete Flow

1. **Upload a video:**
   - Go to `/upload`
   - Select a video file
   - Enter title and description
   - Click "Upload Video"
   - Should see "Video uploaded successfully!" message

2. **Check "My Videos":**
   - Go to `/my-videos`
   - Should see the uploaded video with status "PROCESSING" or "READY"
   - Video should show title, description, and status badge

3. **Check worker processing:**
   - Watch worker logs for processing messages
   - After processing, video status should change to "READY"
   - HLS files should be created in `backend/uploads/hls/{videoId}/`

4. **Admin approval (if needed):**
   - Admin can approve videos from `/admin/videos`
   - After approval, videos appear in main video list (`/`)
   - Status changes to "APPROVED"

### Environment Variables Checklist

**Backend (`backend/.env`):**
```bash
STORAGE_MODE=local
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
REDIS_URL=redis://localhost:6379
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_STORAGE_MODE=local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Worker (`worker/.env`):**
```bash
STORAGE_MODE=local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
REDIS_URL=redis://localhost:6379
```

### API Endpoints Reference

- `POST /api/videos/upload-local` - Upload video file (local storage)
- `POST /api/videos/register` - Register video in database
- `GET /api/videos/my-videos` - Get all videos for current user (all statuses)
- `GET /api/videos` - Get approved videos (filtered by category)
- `GET /api/videos/:id` - Get video by ID

### Next Steps

If videos still don't appear:
1. Check backend logs for errors
2. Check worker logs for processing errors
3. Verify database has video records: Check Prisma Studio or database directly
4. Test API endpoints directly with curl/Postman
5. Check browser console and Network tab for API errors

