# Architecture Documentation

## System Overview

The video streaming platform is built as a microservices architecture with the following components:

### Components

1. **Frontend** - Next.js web application
2. **Backend API** - Express.js REST API
3. **Worker Service** - Background job processing
4. **Infrastructure** - AWS cloud resources

## Data Flow

### Video Upload Flow

1. Client requests presigned S3 URL from backend
2. Client uploads video directly to S3
3. Client notifies backend of upload completion
4. Backend creates video record in PostgreSQL
5. Backend queues transcoding job in BullMQ
6. Worker processes video with FFmpeg
7. HLS files uploaded to S3
8. CloudFront distributes content globally

### Video Playback Flow

1. Client requests video metadata from backend
2. Backend returns HLS manifest URL (CloudFront)
3. Video.js player loads HLS manifest
4. Player adaptively selects quality based on bandwidth
5. Player events sent to analytics collector
6. Analytics stored in ClickHouse

## Technology Stack

See [requirements.md](./requirements.md) for detailed technology stack.

## Deployment Architecture

- **Containerization**: Docker
- **Orchestration**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki

## Security

- JWT authentication
- HTTPS enforcement
- Pre-signed URLs for uploads
- RBAC for admin operations
- Widevine DRM for protected content

