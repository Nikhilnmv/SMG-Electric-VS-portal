Upto day 3
# Testing Guide - Video Upload Flow

## Prerequisites

✅ All services should be running:
- PostgreSQL (port 5432)
- Redis (port 6379)
- ClickHouse (ports 8123, 9000)
- Backend API (port 3001)
- Frontend (port 3000)
- Worker (processing jobs)

## Step-by-Step Upload Process

### Step 1: Access the Frontend

1. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

2. You should see the home page with:
   - "Video Streaming Platform" heading
   - "Upload Video" button
   - "Login" button

### Step 2: Register/Login

**Option A: Register a New User**

1. Click "Login" button
2. Since we don't have a register link yet, you can register via API:
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```
3. Save the token from the response

**Option B: Use Existing User**

If you already have a user, use the login page:
1. Click "Login"
2. Enter your email and password
3. Click "Login" button
4. You'll be redirected to home page

### Step 3: Upload a Video

1. **Click "Upload Video"** button on the home page

2. **Select a Video File**:
   - Click the file input or drag & drop
   - Select a video file (MP4, MOV, AVI, etc.)
   - File must be a video (MIME type: video/*)

3. **Enter Video Details**:
   - **Title** (required): Enter a title for your video
   - **Description** (optional): Add a description

4. **Click "Upload Video"** button

5. **Monitor Upload Progress**:
   - Progress bar will show upload status
   - You'll see percentage completion
   - Wait for upload to complete

### Step 4: What Happens Behind the Scenes

1. **Frontend**:
   - Requests presigned S3 URL from backend
   - Uploads video directly to S3
   - Registers video metadata with backend

2. **Backend**:
   - Creates video record with status "PROCESSING"
   - Enqueues transcoding job to BullMQ

3. **Worker**:
   - Picks up job from queue
   - Downloads video from S3
   - Transcodes to HLS (5 renditions)
   - Uploads HLS files to S3
   - Updates database: status="READY", hlsPath set

### Step 5: Verify Upload

**Check Video Status via API**:
```bash
# Replace {videoId} with actual video ID from upload response
curl http://localhost:3001/api/videos/{videoId}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "...",
    "status": "READY",
    "hlsPath": "hls/{videoId}/master.m3u8",
    ...
  }
}
```

## Monitoring

### Check Worker Logs

The worker will log:
- Job started
- Download progress
- FFmpeg transcoding for each resolution
- Upload progress
- Completion status

### Check Backend Logs

The backend will log:
- Video registration
- Job enqueued
- API requests

### Check Database

```bash
# Connect to PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Check videos
SELECT id, title, status, "hlsPath", "createdAt" FROM videos ORDER BY "createdAt" DESC LIMIT 5;
```

## Troubleshooting

### Issue: "Please log in to upload videos"

**Solution**: Make sure you're logged in. Check localStorage for token:
```javascript
// In browser console
localStorage.getItem('vs_platform_token')
```

### Issue: Upload fails with "Failed to get upload URL"

**Possible Causes**:
- Backend not running
- Not authenticated (no token)
- AWS credentials not configured

**Solution**:
- Check backend is running: `curl http://localhost:3001/health`
- Verify authentication token
- Check backend `.env` for AWS credentials

### Issue: Video stuck in PROCESSING status

**Possible Causes**:
- Worker not running
- Redis connection issue
- FFmpeg not installed
- S3 upload failed

**Solution**:
- Check worker is running: `ps aux | grep worker`
- Check Redis: `docker compose ps redis`
- Verify FFmpeg: `ffmpeg -version`
- Check worker logs for errors

### Issue: FFmpeg errors

**Possible Causes**:
- FFmpeg not installed
- Invalid video format
- Insufficient disk space

**Solution**:
- Install FFmpeg: `brew install ffmpeg` (macOS)
- Check video format compatibility
- Verify temp directory has space

## Testing with cURL (Alternative)

If you prefer to test via API directly:

```bash
# 1. Register/Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.token')

# 2. Get upload URL
UPLOAD_DATA=$(curl -s -X POST http://localhost:3001/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentType":"video/mp4","fileSize":1000000}')

UPLOAD_URL=$(echo $UPLOAD_DATA | jq -r '.data.uploadUrl')
FILE_KEY=$(echo $UPLOAD_DATA | jq -r '.data.fileKey')

# 3. Upload video (replace with actual file path)
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --upload-file /path/to/video.mp4

# 4. Register video
curl -X POST http://localhost:3001/api/videos/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Test Video\",
    \"description\": \"Test upload\",
    \"fileKey\": \"$FILE_KEY\"
  }"
```

## Next Steps

After successful upload:
- Video will be transcoded (takes time depending on video length)
- Check status via API
- Once status is "READY", video can be played
- HLS path will be available for playback

