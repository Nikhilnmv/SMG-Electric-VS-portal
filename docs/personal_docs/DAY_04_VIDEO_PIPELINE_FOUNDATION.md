# Day 4: Video Pipeline Foundation

**Date**: Day 4  
**Focus**: Video upload flow, local storage implementation, worker setup, FFmpeg transcoding pipeline

---

## Overview

Day 4 implemented the complete video upload and processing pipeline. This included setting up the worker service with BullMQ, implementing FFmpeg transcoding for HLS generation, creating local storage support (as an alternative to S3), and establishing the video processing workflow.

---

## Local Storage Implementation

### Why Local Storage?

**Decision**: Implemented dual storage mode (S3 and local) to support development without AWS credentials.

**Benefits**:
- No AWS setup required for development
- Faster iteration during development
- Easier debugging (files accessible on filesystem)
- Cost savings during development

### Backend Local Storage Service

**File**: `backend/src/services/localStorage.ts`

**Functions**:
- `saveLocalFile()`: Saves uploaded file to local directory
- `getLocalFilePath()`: Retrieves local file path
- `getHlsDirPath()`: Gets HLS directory path
- `getHlsUrlPath()`: Gets HLS URL path for playback
- `deleteLocalVideo()`: Deletes video files

**Directory Structure**:
```
backend/uploads/
  raw/
    {videoId}/
      original.mp4
  hls/
    {videoId}/
      master.m3u8
      240p.m3u8
      240p_000.ts
      ...
      1080p.m3u8
      1080p_000.ts
  thumbnails/
    {videoId}/
      thumbnail.png
```

### Upload Controller Updates

**File**: `backend/src/controllers/uploadController.ts`

**New Endpoint**: `POST /api/videos/upload-local`
- Accepts multipart/form-data
- Saves file to local storage
- Returns videoId and filePath
- Uses multer for file handling

**Implementation**:
```typescript
export const uploadLocal = async (req: AuthRequest, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  const videoId = req.body.videoId || uuidv4();
  const filePath = await localStorageService.saveLocalFile(videoId, file);
  
  return res.json({
    success: true,
    data: { videoId, filePath },
  });
};
```

### Static File Serving

**File**: `backend/src/index.ts`

**Added**:
```typescript
if (process.env.STORAGE_MODE === 'local') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}
```

---

## Worker Service Setup

### BullMQ Configuration

**File**: `worker/src/config/redis.ts`

**Redis Connection**:
```typescript
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};
```

### Video Processing Queue

**File**: `worker/src/queue/videoProcessing.ts`

**Job Handler**:
1. Downloads source video from S3 or reads from local storage
2. Calls FFmpeg transcoding pipeline
3. Uploads HLS files to S3 or saves to local storage
4. Updates database with hlsPath and status READY
5. Cleans up temporary files

**Error Handling**:
- Catches errors at each step
- Updates video status on failure
- Cleans up temp files even on error
- Retries failed jobs (3 attempts with exponential backoff)

### Worker Entry Point

**File**: `worker/src/index.ts`

**Features**:
- Creates BullMQ worker for "video-processing" queue
- Listens for jobs and processes them
- Event handlers for completed, failed, and active jobs
- Graceful shutdown on SIGTERM/SIGINT
- Configurable concurrency (default: 2)

---

## FFmpeg Transcoding Pipeline

### FFmpeg Service

**File**: `worker/src/transcoder/ffmpeg.ts`

**Function**: `runTranscode(inputFile, outputDir, videoId)`

**Renditions Generated**:
- **240p**: 400k bitrate, 800k bufsize
- **360p**: 800k bitrate, 1600k bufsize
- **480p**: 1400k bitrate, 2800k bufsize
- **720p**: 2800k bitrate, 5600k bufsize
- **1080p**: 5000k bitrate, 10000k bufsize

**FFmpeg Parameters**:
- Video: H.264 codec, CRF 20, veryfast preset
- Audio: AAC, 48kHz, 128k bitrate
- HLS: 4-second segments, VOD playlist type
- Independent segments flag for better compatibility

**Master Playlist Generation**:
- Automatically generated referencing all renditions
- Includes quality labels and bitrate information

**Logging**:
- All FFmpeg output logged to console
- Progress tracking for long-running transcodes

---

## Video Service Updates

**File**: `backend/src/services/videoService.ts`

**Function**: `registerUploadedVideo()`

**Process**:
1. Creates video record with PROCESSING status
2. Enqueues job to BullMQ "video-processing" queue
3. Job payload includes: videoId, s3Key/filePath, title, description
4. Job retry configuration: 3 attempts with exponential backoff

**Implementation**:
```typescript
export const registerUploadedVideo = async (
  userId: string,
  title: string,
  description: string | undefined,
  fileKey: string | undefined,
  filePath: string | undefined
) => {
  const video = await prisma.video.create({
    data: {
      userId,
      title,
      description,
      s3Key: fileKey || filePath,
      status: 'PROCESSING',
    },
  });
  
  await videoQueue.add('video-processing', {
    videoId: video.id,
    s3Key: fileKey,
    filePath: filePath,
    title,
    description,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
  
  return video;
};
```

---

## Frontend Upload Flow

### Upload Page Updates

**File**: `frontend/src/app/upload/page.tsx`

**Storage Mode Detection**:
- Checks `NEXT_PUBLIC_STORAGE_MODE` environment variable
- **Local mode**: Direct file upload via FormData
- **S3 mode**: Presigned URL upload

**Local Mode Flow**:
1. User selects video file
2. Frontend sends multipart/form-data to `/api/videos/upload-local`
3. Backend saves file and returns videoId
4. Frontend calls `/api/videos/register` with videoId and metadata
5. Backend creates video record and enqueues transcoding job

**S3 Mode Flow**:
1. User selects video file
2. Frontend requests presigned URL
3. Frontend uploads directly to S3
4. Frontend calls `/api/videos/register` with fileKey
5. Backend creates video record and enqueues transcoding job

---

## Processing Flow

### Complete Workflow

1. **Video Upload**:
   - User uploads video via frontend
   - Backend receives registration request
   - `VideoService.registerUploadedVideo()` is called

2. **Job Enqueue**:
   - Video record created with status "PROCESSING"
   - Job added to "video-processing" queue
   - Job payload: { videoId, s3Key/filePath, title, description }

3. **Worker Processing**:
   - Worker picks up job from queue
   - Downloads/reads source video
   - Runs FFmpeg transcoding (5 renditions)
   - Generates master playlist
   - Uploads/saves all HLS files
   - Updates database: status="READY", hlsPath="hls/{videoId}/master.m3u8"
   - Cleans up temporary files

4. **Video Ready**:
   - Video can be retrieved via GET /api/videos/:id
   - Response includes hlsPath for playback

---

## Issues Encountered

### Issue 1: Worker Not Processing Jobs
**Problem**: Jobs stuck in queue, worker not picking them up  
**Solution**: 
- Verified Redis connection
- Checked queue name matches
- Ensured worker process is running
- Fixed BullMQ configuration

### Issue 2: FFmpeg Not Found
**Problem**: Worker failing with "FFmpeg not found" error  
**Solution**: 
- Installed FFmpeg: `brew install ffmpeg` (macOS)
- Added FFMPEG_PATH environment variable
- Verified FFmpeg in PATH

### Issue 3: File Path Resolution
**Problem**: Worker couldn't find video files in local storage  
**Solution**: 
- Fixed path resolution in worker
- Ensured UPLOADS_DIR environment variable matches backend
- Used absolute paths for file operations

### Issue 4: HLS Files Not Saving
**Problem**: Transcoding completed but HLS files not saved  
**Solution**: 
- Fixed storage mode detection in worker
- Ensured directory permissions
- Added error handling for file operations

---

## Environment Variables

### Backend
```env
STORAGE_MODE=local  # or 's3'
UPLOADS_DIR=./uploads
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
```

### Worker
```env
STORAGE_MODE=local  # or 's3'
UPLOADS_DIR=../backend/uploads
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
FFMPEG_PATH=ffmpeg  # or full path
TEMP_DIR=/tmp/transcode
TRANSCODING_CONCURRENCY=2
```

### Frontend
```env
NEXT_PUBLIC_STORAGE_MODE=local  # or 's3'
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Testing

### Manual Testing

1. **Start Services**:
   ```bash
   docker compose up -d
   pnpm --filter backend dev
   pnpm --filter worker dev
   pnpm --filter frontend dev
   ```

2. **Upload a Video**:
   - Navigate to `/upload`
   - Select video file
   - Enter title and description
   - Click "Upload Video"

3. **Monitor Processing**:
   - Watch worker logs for transcoding progress
   - Check Redis queue status
   - Verify files in uploads directory
   - Check database for status updates

4. **Verify Result**:
   ```bash
   curl http://localhost:3001/api/videos/{videoId}
   # Response should include:
   # - status: "READY"
   # - hlsPath: "hls/{videoId}/master.m3u8"
   ```

---

## Files Created/Modified

### Created
- `backend/src/services/localStorage.ts`
- `worker/src/config/redis.ts`
- `worker/src/queue/videoProcessing.ts`
- `worker/src/transcoder/ffmpeg.ts`
- `worker/src/utils/database.ts`
- `worker/src/services/localStorage.ts`

### Modified
- `backend/src/controllers/uploadController.ts`
- `backend/src/controllers/videoController.ts`
- `backend/src/services/videoService.ts`
- `backend/src/index.ts` - Added static file serving
- `frontend/src/app/upload/page.tsx`
- `worker/src/index.ts`

---

## Performance Considerations

- **Parallel Uploads**: Multiple files uploaded simultaneously
- **Configurable Concurrency**: Adjust based on server capacity
- **Temp Directory**: Uses local filesystem for processing
- **Cleanup**: Automatic cleanup prevents disk space issues
- **Retry Logic**: Handles transient failures gracefully

---

## Next Steps

After Day 4, the following were planned:
- Video playback implementation
- HLS player integration
- Focus mode UI
- Resume watching functionality

---

**Previous**: [Day 3: Auth System Implementation](./DAY_03_AUTH_SYSTEM_IMPLEMENTATION.md)  
**Next**: [Day 5: Admin Panel and User Management](./DAY_05_ADMIN_PANEL_AND_USER_MANAGEMENT.md)

