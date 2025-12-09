# Day 3 Feature Implementation Summary

This document describes all files created and modified during Day 3 implementation for the FFmpeg transcoding pipeline and worker processing.

## 1. Backend Updates After Upload

### Files Created:

#### `backend/src/services/videoService.ts`
- **Purpose**: Centralized video service for video registration and status updates
- **Methods**:
  - `registerUploadedVideo()`: Creates video record with PROCESSING status and enqueues transcoding job
  - `updateVideoStatus()`: Updates video status and optional hlsPath in database
- **Features**:
  - Sets video status to "PROCESSING" immediately
  - Enqueues job to BullMQ "video-processing" queue
  - Job payload includes: videoId, s3Key, title, description
  - Job retry configuration: 3 attempts with exponential backoff

### Files Modified:

#### `backend/src/controllers/videoController.ts`
- Updated `create()` method to use `VideoService.registerUploadedVideo()`
- Now automatically sets status to PROCESSING and enqueues job

#### `backend/package.json`
- Added dependencies: `bullmq`, `ioredis`

## 2. Worker Setup (BullMQ)

### Files Created:

#### `worker/src/config/redis.ts`
- **Purpose**: Redis connection configuration for BullMQ
- **Features**: Configurable host, port, password, and database

#### `worker/src/queue/videoProcessing.ts`
- **Purpose**: Main video processing job handler
- **Function**: `processVideoTranscoding()`
- **Process Flow**:
  1. Downloads source video from S3 to temp directory
  2. Calls FFmpeg transcoding pipeline
  3. Uploads HLS files to S3
  4. Updates database with hlsPath and status READY
  5. Cleans up temporary files
- **Error Handling**: Catches errors, cleans up temp files, updates database

#### `worker/src/index.ts`
- **Purpose**: Worker service entry point
- **Features**:
  - Creates BullMQ worker for "video-processing" queue
  - Listens for jobs and processes them
  - Event handlers for completed, failed, and active jobs
  - Graceful shutdown on SIGTERM/SIGINT
  - Configurable concurrency (default: 2)

### Files Modified:

#### `worker/src/processors/transcodingProcessor.ts`
- Kept for backward compatibility but replaced by new queue handler

## 3. FFmpeg Pipeline

### Files Created:

#### `worker/src/transcoder/ffmpeg.ts`
- **Purpose**: FFmpeg transcoding logic for HLS generation
- **Function**: `runTranscode(inputFile, outputDir, videoId)`
- **Renditions Generated**:
  - 240p: 400k bitrate, 800k bufsize
  - 360p: 800k bitrate, 1600k bufsize
  - 480p: 1400k bitrate, 2800k bufsize
  - 720p: 2800k bitrate, 5600k bufsize
  - 1080p: 5000k bitrate, 10000k bufsize
- **FFmpeg Parameters**:
  - Video: H.264 codec, CRF 20, veryfast preset
  - Audio: AAC, 48kHz, 128k bitrate
  - HLS: 4-second segments, VOD playlist type
  - Independent segments flag for better compatibility
- **Master Playlist**: Automatically generated referencing all renditions
- **Logging**: All FFmpeg output logged to console

## 4. S3 Upload (Worker)

### Files Created:

#### `worker/src/aws/s3.ts`
- **Purpose**: S3 operations for worker
- **Functions**:
  - `downloadFromS3()`: Downloads file from S3 to local filesystem
  - `uploadToS3()`: Uploads single file to S3
  - `uploadMultipleToS3()`: Parallel upload of multiple files
  - `uploadDirectoryToS3()`: Recursively uploads directory contents
- **Features**:
  - Proper content-type detection for .m3u8 and .ts files
  - Parallel uploads for performance
  - Handles nested directories

### Upload Structure:
```
s3://<bucket>/
  hls/
    {videoId}/
      master.m3u8
      240p.m3u8
      240p_000.ts
      240p_001.ts
      ...
      1080p.m3u8
      1080p_000.ts
      ...
```

## 5. Database Updates

### Files Created:

#### `worker/src/utils/database.ts`
- **Purpose**: Database utilities for worker
- **Features**:
  - Prisma client initialization
  - `updateVideoStatus()`: Updates video status and hlsPath
  - Uses same DATABASE_URL as backend

### Database Updates:
- After successful processing:
  - `video.status` = "READY"
  - `video.hlsPath` = "hls/{videoId}/master.m3u8"

## 6. Backend Route Updates

### Files Modified:

#### `backend/src/controllers/videoController.ts`
- Updated `getById()` to include hlsPath in response
- Returns full video metadata including HLS path for playback

## File Structure

```
worker/
├── src/
│   ├── index.ts                    # Worker entry point
│   ├── config/
│   │   └── redis.ts                # Redis connection
│   ├── queue/
│   │   └── videoProcessing.ts      # Video processing job handler
│   ├── transcoder/
│   │   └── ffmpeg.ts               # FFmpeg transcoding pipeline
│   ├── aws/
│   │   └── s3.ts                   # S3 operations
│   ├── utils/
│   │   └── database.ts             # Database utilities
│   └── processors/                 # Legacy (kept for compatibility)
│       └── liveStreamProcessor.ts
```

## Processing Flow

1. **Video Upload**:
   - User uploads video via frontend
   - Backend receives registration request
   - `VideoService.registerUploadedVideo()` is called

2. **Job Enqueue**:
   - Video record created with status "PROCESSING"
   - Job added to "video-processing" queue
   - Job payload: { videoId, s3Key, title, description }

3. **Worker Processing**:
   - Worker picks up job from queue
   - Downloads source video from S3
   - Runs FFmpeg transcoding (5 renditions)
   - Generates master playlist
   - Uploads all HLS files to S3
   - Updates database: status="READY", hlsPath="hls/{videoId}/master.m3u8"
   - Cleans up temporary files

4. **Video Ready**:
   - Video can be retrieved via GET /api/videos/:id
   - Response includes hlsPath for playback

## Configuration

### Environment Variables:

**Backend**:
- `REDIS_HOST` / `REDIS_URL`: Redis connection
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)
- `REDIS_DB`: Redis database (default: 0)

**Worker**:
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)
- `REDIS_DB`: Redis database (default: 0)
- `DATABASE_URL`: PostgreSQL connection string
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `S3_BUCKET`: S3 bucket name
- `FFMPEG_PATH`: Path to ffmpeg binary (default: ffmpeg)
- `TEMP_DIR`: Temporary directory for processing (default: /tmp/transcode)
- `TRANSCODING_CONCURRENCY`: Number of concurrent jobs (default: 2)

## Error Handling

- **FFmpeg Errors**: Caught and logged, job fails and retries
- **S3 Errors**: Caught and logged, job fails and retries
- **Database Errors**: Caught and logged, job fails and retries
- **Cleanup**: Temp files always cleaned up, even on error
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)

## Testing

### 1. Start Services:
```bash
# Start databases
docker compose up -d

# Start backend
pnpm --filter backend dev

# Start worker
pnpm --filter worker dev
```

### 2. Upload a Video:
- Use frontend upload page at http://localhost:3000/upload
- Or use API directly

### 3. Monitor Processing:
- Watch worker logs for transcoding progress
- Check Redis queue status
- Verify files in S3 bucket
- Check database for status updates

### 4. Verify Result:
```bash
# Get video details
curl http://localhost:3001/api/videos/{videoId}

# Response should include:
# - status: "READY"
# - hlsPath: "hls/{videoId}/master.m3u8"
```

## Performance Considerations

- **Parallel Uploads**: Multiple files uploaded simultaneously
- **Configurable Concurrency**: Adjust based on server capacity
- **Temp Directory**: Uses local filesystem for processing
- **Cleanup**: Automatic cleanup prevents disk space issues
- **Retry Logic**: Handles transient failures gracefully

## Next Steps

- Add video duration extraction during transcoding
- Create Rendition records in database
- Add thumbnail generation
- Implement progress tracking for long-running jobs
- Add monitoring and alerting for failed jobs
- Optimize FFmpeg parameters based on content analysis

