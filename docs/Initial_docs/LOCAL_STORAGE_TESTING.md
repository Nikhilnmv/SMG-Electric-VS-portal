# Local Storage Testing Guide

## Quick Start

### 1. Environment Setup

**Backend `.env`:**
```bash
STORAGE_MODE=local
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
REDIS_URL=redis://localhost:6379
```

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_STORAGE_MODE=local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Worker `.env`:**
```bash
STORAGE_MODE=local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
REDIS_URL=redis://localhost:6379
```

### 2. Install Dependencies

```bash
# Install multer in backend
cd backend
pnpm install

# Install dependencies in all packages
pnpm install
```

### 3. Create Uploads Directory

```bash
mkdir -p backend/uploads/raw
mkdir -p backend/uploads/hls
```

### 4. Start Services

```bash
# Terminal 1: Backend
cd backend
pnpm dev

# Terminal 2: Frontend
cd frontend
pnpm dev

# Terminal 3: Worker
cd worker
pnpm dev
```

## Test Scenarios

### Test 1: File Upload

1. Navigate to `http://localhost:3000/upload`
2. Select a video file (MP4, MOV, etc.)
3. Enter title: "Test Video"
4. Click "Upload Video"
5. **Expected:** 
   - Progress bar shows upload progress
   - Success message appears
   - File exists in `backend/uploads/raw/{videoId}/original.mp4`

**Verify:**
```bash
ls -la backend/uploads/raw/
# Should show a directory with videoId
```

### Test 2: Video Registration

After upload completes:
1. Check browser network tab for `/api/videos/register` request
2. **Expected:**
   - Status: 201 Created
   - Response includes video object with `status: PROCESSING`

**Verify in database:**
```sql
SELECT id, title, status, "s3Key" FROM videos ORDER BY "createdAt" DESC LIMIT 1;
-- s3Key should be: /uploads/raw/{videoId}/original.mp4
```

### Test 3: Video Transcoding

1. Wait for worker to process video (check worker logs)
2. **Expected:**
   - Worker logs show: "Starting video processing"
   - Worker logs show: "Transcoding completed"
   - Worker logs show: "HLS files saved to local storage"

**Verify:**
```bash
ls -la backend/uploads/hls/
# Should show directory with videoId
ls -la backend/uploads/hls/{videoId}/
# Should show master.m3u8 and .ts segment files
```

**Verify in database:**
```sql
SELECT id, title, status, "hlsPath" FROM videos WHERE id = '{videoId}';
-- status should be: READY
-- hlsPath should be: /uploads/hls/{videoId}/master.m3u8
```

### Test 4: Video Playback

1. Navigate to video page: `http://localhost:3000/watch/{videoId}`
2. **Expected:**
   - Video player loads
   - HLS manifest loads from: `http://localhost:3001/uploads/hls/{videoId}/master.m3u8`
   - Video plays successfully

**Verify HLS URL:**
```bash
curl http://localhost:3001/uploads/hls/{videoId}/master.m3u8
# Should return HLS manifest content
```

### Test 5: Category-Based HLS Paths

If `HLS_PREFIX_BY_CATEGORY=true`:

1. Upload video as user with category "EMPLOYEE"
2. **Expected:**
   - HLS files in: `backend/uploads/hls/EMPLOYEE/{videoId}/`
   - `hlsPath` in DB: `/uploads/hls/EMPLOYEE/{videoId}/master.m3u8`

**Verify:**
```bash
ls -la backend/uploads/hls/EMPLOYEE/{videoId}/
```

### Test 6: Multiple Videos

1. Upload 3 different videos
2. **Expected:**
   - Each has unique videoId
   - Each has separate directory in `uploads/raw/`
   - Each processes independently

**Verify:**
```bash
ls backend/uploads/raw/
# Should show 3 directories
```

### Test 7: Error Handling

1. Try uploading without file
2. **Expected:** Error message: "Please select a file"

1. Try uploading without title
2. **Expected:** Error message: "Please enter a title"

1. Try uploading non-video file
2. **Expected:** Error message: "Only video files are allowed"

### Test 8: Storage Mode Switching

1. Set `STORAGE_MODE=s3` in backend
2. Try to upload
3. **Expected:** Error: "Local upload is only available in local storage mode"

1. Set `STORAGE_MODE=local` again
2. Upload should work

## Verification Checklist

- [ ] Upload directory created
- [ ] Multer installed in backend
- [ ] Environment variables set correctly
- [ ] File uploads successfully
- [ ] File saved to `uploads/raw/{videoId}/original.mp4`
- [ ] Video registered in database
- [ ] Worker processes video
- [ ] HLS files created in `uploads/hls/{videoId}/`
- [ ] Database updated with `hlsPath`
- [ ] Video plays in browser
- [ ] HLS manifest accessible via HTTP
- [ ] Static file serving works

## Common Issues

### Issue: Multer Error

**Error:** `Cannot find module 'multer'`

**Solution:**
```bash
cd backend
pnpm install multer @types/multer
```

### Issue: Directory Not Found

**Error:** `ENOENT: no such file or directory`

**Solution:**
```bash
mkdir -p backend/uploads/raw backend/uploads/hls
```

### Issue: Permission Denied

**Error:** `EACCES: permission denied`

**Solution:**
```bash
chmod -R 755 backend/uploads
```

### Issue: CORS Error

**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution:** Check backend CORS configuration allows frontend origin

### Issue: File Too Large

**Error:** `File too large`

**Solution:** Increase multer limit in `uploadController.ts`:
```typescript
limits: {
  fileSize: 1000 * 1024 * 1024, // 1GB
}
```

## Performance Testing

### Upload Speed

1. Upload a 100MB video file
2. Measure time from start to completion
3. **Expected:** Should complete in reasonable time (depends on disk speed)

### Concurrent Uploads

1. Upload 3 videos simultaneously
2. **Expected:** All uploads complete successfully
3. Verify all files saved correctly

### Disk Space

1. Monitor disk usage:
```bash
du -sh backend/uploads/
```

2. Upload multiple large videos
3. Verify disk space is used correctly

## Cleanup

### Remove Test Files

```bash
# Remove all uploaded files
rm -rf backend/uploads/raw/*
rm -rf backend/uploads/hls/*

# Or remove specific video
rm -rf backend/uploads/raw/{videoId}
rm -rf backend/uploads/hls/{videoId}
```

### Database Cleanup

```sql
-- Delete test videos
DELETE FROM videos WHERE title LIKE 'Test%';
```

## Next Steps

After successful testing:

1. Add file size limits
2. Implement cleanup job for old files
3. Add disk usage monitoring
4. Document backup procedures
5. Set up production storage strategy

