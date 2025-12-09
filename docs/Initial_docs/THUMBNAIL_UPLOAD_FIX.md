# Thumbnail Upload and Duplicate Upload Fix

## Issues Identified

1. **Multiple Uploads**: Multiple video files and thumbnails were being created for a single upload
2. **No HLS Files**: Transcoding wasn't happening, resulting in no HLS files in the `hls` directory
3. **"Failed to create video" Error**: Generic error message made debugging difficult

## Root Causes

1. **Duplicate Submissions**: Upload button could be clicked multiple times, creating multiple files with different IDs
2. **No VideoId Consistency**: Each upload attempt generated a new UUID, causing duplicate files
3. **Missing Error Details**: Error handling was too generic, hiding actual issues
4. **Worker Not Running**: Transcoding jobs require the worker service to be running

## Fixes Applied

### 1. Double-Click Prevention
- Added check in `handleUpload()` to prevent multiple simultaneous uploads
- Button is disabled during upload process

### 2. Consistent VideoId Generation
- Generate `videoId` on frontend before upload
- Pass `videoId` to backend to ensure same ID is used for file upload and registration
- Prevents duplicate file creation on retries

### 3. Improved Error Handling
- Added detailed error logging in video controller
- Specific error messages for Prisma constraint violations
- Better error messages for development vs production

### 4. Duplicate Prevention
- Check if video with same ID already exists before creating
- Skip file save if file already exists (prevents overwriting on retry)
- Return 409 Conflict status for duplicate video IDs

### 5. File Overwrite Protection
- Check if file/thumbnail already exists before saving
- Return existing file path if already present
- Prevents duplicate file creation on retry

## Files Modified

### Frontend
- `frontend/src/app/upload/page.tsx`
  - Added UUID generator function
  - Generate videoId before upload
  - Pass videoId in form data
  - Added double-click prevention

### Backend
- `backend/src/controllers/uploadController.ts`
  - Accept videoId from form data
  - Pass videoId to saveLocalFile
- `backend/src/controllers/videoController.ts`
  - Check for existing video before creating
  - Improved error handling and logging
  - Specific error messages for different error types
- `backend/src/services/localStorage.ts`
  - Check if file exists before saving (prevent overwrite)
  - Check if thumbnail exists before saving

## Database Migration Required

The `thumbnailUrl` field was added to the Video model. You need to apply the migration:

```bash
cd backend
npx prisma migrate deploy
# or for development:
npx prisma migrate dev
```

If you get database connection errors, make sure:
1. Docker services are running: `docker compose ps`
2. Database URL is correct in `.env` file
3. PostgreSQL container is accessible

## Verification Steps

### 1. Apply Database Migration
```bash
cd backend
npx prisma migrate deploy
```

### 2. Check Worker Status
```bash
# Check if worker is running
ps aux | grep "worker.*dev"

# If not running, start it:
pnpm --filter worker dev
```

### 3. Check Redis
```bash
docker compose ps redis
# Should show "Up" status
```

### 4. Test Upload
1. Go to upload page
2. Select a video file
3. Select a thumbnail (optional)
4. Enter title and description
5. Click "Upload Video" once
6. Wait for upload to complete

### 5. Verify Files
```bash
# Check upload directories
ls -la backend/uploads/raw/
ls -la backend/uploads/thumbnails/
ls -la backend/uploads/hls/

# Should see:
# - One directory per video in raw/
# - One directory per video in thumbnails/ (if thumbnail uploaded)
# - One directory per video in hls/ (after transcoding completes)
```

### 6. Check Worker Logs
The worker should show:
```
→ Video processing job {id} started
[Job] Starting video processing for video {videoId}
[Job] Transcoding completed
✓ Video processing job {id} completed successfully
```

## Troubleshooting

### Issue: Still seeing multiple uploads

**Check:**
1. Browser console for errors
2. Network tab for duplicate requests
3. Backend logs for duplicate registration attempts

**Solution:**
- Clear browser cache
- Check if form is submitting multiple times
- Verify double-click prevention is working

### Issue: No HLS files created

**Check:**
1. Is worker running? `ps aux | grep worker`
2. Is Redis running? `docker compose ps redis`
3. Worker logs for errors
4. Is FFmpeg installed? `ffmpeg -version`

**Solution:**
```bash
# Start worker
pnpm --filter worker dev

# Check worker logs for errors
# Common issues:
# - FFmpeg not installed
# - Insufficient disk space
# - Video file format not supported
```

### Issue: "Failed to create video" error

**Check:**
1. Backend logs for detailed error message
2. Database migration applied?
3. Database connection working?

**Solution:**
- Apply database migration: `npx prisma migrate deploy`
- Check backend logs for specific error
- Verify database connection in `.env`

### Issue: Database migration fails

**Check:**
1. Database connection string in `.env`
2. PostgreSQL container is running
3. Database exists

**Solution:**
```bash
# Check Docker services
docker compose ps

# Start PostgreSQL if not running
docker compose up -d postgres

# Verify connection
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform -c "SELECT 1;"
```

## Testing Checklist

- [ ] Database migration applied
- [ ] Worker service is running
- [ ] Redis is running
- [ ] Upload single video with thumbnail
- [ ] Verify only one set of files created
- [ ] Verify HLS files are created after transcoding
- [ ] Check video appears in video list with thumbnail
- [ ] Try uploading again (should not create duplicates)

## Next Steps

1. **Apply Migration**: Run `npx prisma migrate deploy` in backend directory
2. **Start Worker**: Ensure worker service is running for transcoding
3. **Test Upload**: Try uploading a video with thumbnail
4. **Monitor Logs**: Check backend and worker logs for any errors
5. **Verify Results**: Check that files are created correctly and transcoding completes

## Scripts

A diagnostic script is available:
```bash
./scripts/check-upload-issues.sh
```

This will check:
- Worker process status
- Redis connection
- Upload directory counts
- Potential duplicate uploads

