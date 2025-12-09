# Worker - Background Job Processing

Background job workers for video transcoding and live stream packaging using BullMQ and FFmpeg.

## Features

- Video transcoding to HLS format
- Multiple quality renditions (240p - 1080p)
- Live stream RTMP to HLS packaging
- Job queue management with BullMQ
- Redis-based job storage

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start worker
pnpm --filter worker dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- Redis connection for job queue
- Database connection for status updates
- AWS S3 credentials for media storage
- FFmpeg configuration

## Job Types

- `transcoding` - Video transcoding jobs
- `live-streaming` - Live stream packaging jobs

## Project Structure

```
src/
├── config/        # Configuration files
├── processors/    # Job processors
└── services/      # Business logic (FFmpeg, S3, DB)
```

## Building

```bash
pnpm --filter worker build
```

## Docker

```bash
docker build -t worker -f worker/Dockerfile .
```

Note: The Docker image includes FFmpeg for video processing.

