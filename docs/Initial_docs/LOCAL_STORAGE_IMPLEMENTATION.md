# Local File Storage Implementation

## Overview

This document describes the local file storage implementation that replaces AWS S3 for development and testing. The system supports both local storage and S3 storage modes, controlled by environment variables.

## Architecture

### Storage Modes

- **Local Mode** (`STORAGE_MODE=local`): Files stored in `backend/uploads/` directory
- **S3 Mode** (`STORAGE_MODE=s3`): Files stored in AWS S3 (existing implementation)

### Directory Structure

```
backend/
  uploads/
    raw/
      {videoId}/
        original.mp4
    hls/
      {videoId}/
        master.m3u8
        segment_*.ts
      {categoryRole}/{videoId}/  (if HLS_PREFIX_BY_CATEGORY=true)
        master.m3u8
        segment_*.ts
```

## Implementation Details

### Backend Changes

#### 1. Local Storage Service (`backend/src/services/localStorage.ts`)

- `saveLocalFile()`: Saves uploaded file to local directory
- `getLocalFilePath()`: Retrieves local file path
- `getHlsDirPath()`: Gets HLS directory path
- `getHlsUrlPath()`: Gets HLS URL path for playback
- `deleteLocalVideo()`: Deletes video files

#### 2. Upload Controller (`backend/src/controllers/uploadController.ts`)

- `uploadLocal`: New endpoint for direct file uploads (multipart/form-data)
- `generatePresignedUrl`: Only available in S3 mode
- Uses multer for file handling

#### 3. Video Service (`backend/src/services/videoService.ts`)

- Updated to support both `fileKey` (S3) and `filePath` (local)
- Automatically uses correct storage based on `STORAGE_MODE`

#### 4. Static File Serving (`backend/src/index.ts`)

- Serves `/uploads` directory as static files when in local mode
- Files accessible at: `http://localhost:3001/uploads/...`

### Worker Changes

#### 1. Local Storage Service (`worker/src/services/localStorage.ts`)

- `getLocalFilePath()`: Converts file path to absolute path
- `getHlsDirPath()`: Gets HLS output directory
- `getHlsUrlPath()`: Generates HLS URL path

#### 2. Video Processing (`worker/src/queue/videoProcessing.ts`)

- Checks `STORAGE_MODE` environment variable
- **Local mode**: Copies file from uploads directory, saves HLS to local storage
- **S3 mode**: Downloads from S3, uploads HLS to S3 (existing behavior)

### Frontend Changes

#### 1. Upload Page (`frontend/src/app/upload/page.tsx`)

- Checks `NEXT_PUBLIC_STORAGE_MODE` environment variable
- **Local mode**: Direct file upload via FormData to `/api/videos/upload-local`
- **S3 mode**: Presigned URL upload (existing behavior)

#### 2. Watch Page (`frontend/src/app/watch/[videoId]/page.tsx`)

- Detects local storage paths (starting with `/uploads`)
- Constructs URL: `http://localhost:3001/uploads/hls/{videoId}/master.m3u8`
- Falls back to CloudFront URL for S3 mode

## API Endpoints

### Local Storage Endpoints

#### POST /api/videos/upload-local

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `video` (file)
- Headers: `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "clx123...",
    "filePath": "/uploads/raw/clx123.../original.mp4"
  }
}
```

#### POST /api/videos/register

**Request:**
```json
{
  "title": "Video Title",
  "description": "Video description",
  "filePath": "/uploads/raw/clx123.../original.mp4",
  "videoId": "clx123..."
}
```

**Note:** `videoId` is optional but recommended to use the same ID from upload-local.

### S3 Endpoints (Unchanged)

- `POST /api/upload/presigned-url` - Only available in S3 mode

## Environment Variables

### Backend

```bash
# Storage mode: 'local' or 's3'
STORAGE_MODE=local

# Optional: HLS path prefixing by category
HLS_PREFIX_BY_CATEGORY=false

# Uploads directory (default: backend/uploads)
UPLOADS_DIR=./uploads
```

### Frontend

```bash
# Storage mode: 'local' or 's3'
NEXT_PUBLIC_STORAGE_MODE=local

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# CloudFront URL (only used in S3 mode)
NEXT_PUBLIC_CLOUD_FRONT_URL=
```

### Worker

```bash
# Storage mode: 'local' or 's3'
STORAGE_MODE=local

# Uploads directory (should match backend)
UPLOADS_DIR=../backend/uploads

# Optional: HLS path prefixing by category
HLS_PREFIX_BY_CATEGORY=false
```

## File Flow

### Local Storage Flow

1. **Upload:**
   - User selects video file
   - Frontend sends `multipart/form-data` to `/api/videos/upload-local`
   - Backend saves to `uploads/raw/{videoId}/original.mp4`
   - Returns `videoId` and `filePath`

2. **Registration:**
   - Frontend calls `/api/videos/register` with `filePath` and `videoId`
   - Backend creates video record with `s3Key = filePath`
   - Enqueues transcoding job

3. **Transcoding:**
   - Worker reads file from `uploads/raw/{videoId}/original.mp4`
   - Transcodes to HLS in temp directory
   - Saves HLS files to `uploads/hls/{videoId}/`
   - Updates database with `hlsPath = /uploads/hls/{videoId}/master.m3u8`

4. **Playback:**
   - Frontend requests video metadata
   - Gets `hlsPath = /uploads/hls/{videoId}/master.m3u8`
   - Constructs URL: `http://localhost:3001/uploads/hls/{videoId}/master.m3u8`
   - Video player loads HLS manifest and segments

### S3 Flow (Unchanged)

1. Get presigned URL
2. Upload to S3
3. Register video
4. Worker downloads from S3, transcodes, uploads HLS to S3
5. Playback via CloudFront

## Testing

### Setup

1. **Set environment variables:**
   ```bash
   # Backend .env
   STORAGE_MODE=local
   
   # Frontend .env.local
   NEXT_PUBLIC_STORAGE_MODE=local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   
   # Worker .env
   STORAGE_MODE=local
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   pnpm install  # Installs multer
   ```

3. **Create uploads directory:**
   ```bash
   mkdir -p backend/uploads/raw
   mkdir -p backend/uploads/hls
   ```

### Test Upload

1. Start backend: `cd backend && pnpm dev`
2. Start frontend: `cd frontend && pnpm dev`
3. Start worker: `cd worker && pnpm dev`
4. Navigate to `/upload`
5. Select video file, enter title
6. Click "Upload Video"
7. Verify file appears in `backend/uploads/raw/{videoId}/`
8. Wait for worker to process
9. Verify HLS files in `backend/uploads/hls/{videoId}/`
10. Navigate to video and verify playback

### Verify File Structure

```bash
# Check uploads directory
ls -la backend/uploads/raw/
ls -la backend/uploads/hls/

# Check specific video
ls -la backend/uploads/raw/{videoId}/
ls -la backend/uploads/hls/{videoId}/
```

## Migration from S3 to Local

1. Set `STORAGE_MODE=local` in all services
2. Restart services
3. New uploads will use local storage
4. Existing S3 videos will continue to work (if CloudFront URL is set)

## Migration from Local to S3

1. Set `STORAGE_MODE=s3` in all services
2. Configure AWS credentials
3. Restart services
4. New uploads will use S3
5. Local videos will not be accessible (consider migrating files)

## Troubleshooting

### Issue: "No file uploaded"

**Solution:** Check that form field name is `video` in frontend and multer config.

### Issue: "Failed to save file"

**Solution:** 
- Check uploads directory permissions
- Verify directory exists: `mkdir -p backend/uploads/raw backend/uploads/hls`

### Issue: "Cannot find video file"

**Solution:**
- Verify file exists: `ls backend/uploads/raw/{videoId}/`
- Check file path in database: `SELECT id, "s3Key" FROM videos WHERE id = '{videoId}';`

### Issue: "HLS files not found"

**Solution:**
- Check worker logs for errors
- Verify HLS directory: `ls backend/uploads/hls/{videoId}/`
- Check worker `STORAGE_MODE` matches backend

### Issue: "Video won't play"

**Solution:**
- Check browser console for CORS errors
- Verify static file serving is enabled in backend
- Check HLS manifest URL: `curl http://localhost:3001/uploads/hls/{videoId}/master.m3u8`

## Security Considerations

### Local Storage

- Files are stored on server filesystem
- No automatic backup (implement backup strategy)
- File size limited by disk space
- Access controlled by Express static middleware

### Recommendations

- Use local storage only for development/testing
- Implement file size limits
- Add cleanup job for old files
- Consider file encryption for sensitive content
- Monitor disk usage

## Performance

### Local Storage Advantages

- No network latency for uploads
- No AWS costs
- Faster for local development
- Easier debugging

### Local Storage Limitations

- Not scalable (single server)
- No CDN distribution
- Manual backup required
- Disk space management needed

## Future Enhancements

- Automatic cleanup of old/unused files
- File size quotas per user
- Disk usage monitoring
- Backup automation
- Support for multiple storage backends (local, S3, Azure, etc.)

