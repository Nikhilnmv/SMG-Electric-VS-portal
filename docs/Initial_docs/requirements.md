# Video Streaming Platform — Developer Guide

## Overview

This document defines the complete architecture, technical stack, and execution flow for a scalable, production-ready video streaming platform. The application supports both on-demand and live streaming with a focus-oriented user experience that minimizes distractions and enhances task-based video consumption.

## 1. Platform Features

### 1.1 Core Functionality ✅ IMPLEMENTED

- ✅ Resumable video uploads via pre-signed URLs (S3 mode) or direct uploads (local mode)
- ✅ Automated transcoding using FFmpeg with multiple HLS renditions (240p, 360p, 480p, 720p, 1080p)
- ✅ Dual storage modes: AWS S3 or local file storage (configurable via `STORAGE_MODE`)
- ✅ Adaptive Bitrate Streaming (HLS) with master playlist and segment generation
- ✅ CDN-optimized global video delivery (CloudFront for S3 mode)
- ✅ Modular microservices backend (Express API, Worker service, Frontend)

### 1.2 Focus-Oriented Experience ✅ IMPLEMENTED

- ✅ Focus mode with distraction-free video player
- ✅ Focus session tracking with duration and interruption monitoring
- ✅ Focus mode analytics (session duration, interruptions, completion tracking)
- ✅ Minimalist player UI with auto-hiding controls
- ✅ Focus mode entry/exit with session management

### 1.3 Admin Features ✅ IMPLEMENTED

- ✅ Role-based user management (Admin, Editor, User roles)
- ✅ Category-based user roles (DEALER, EMPLOYEE, TECHNICIAN, STAKEHOLDER, INTERN, VENDOR)
- ✅ Video moderation workflow: Upload → Processing → Ready → Review → Approve/Reject → Publish
- ✅ Admin dashboard with statistics (total users, videos, pending approvals, completed videos)
- ✅ Video approval/rejection interface with optional storage deletion
- ✅ User management interface with role and category updates
- ✅ Analytics dashboard with charts and insights

### 1.4 Playback Capabilities ✅ IMPLEMENTED

- ✅ HLS adaptive streaming with Video.js player
- ✅ Resume watching functionality (tracks user progress per video)
- ✅ Video progress tracking and persistence
- ✅ Fullscreen mode support
- ✅ Video player with focus mode integration
- ⏳ Playback speed control (UI ready, implementation pending)
- ⏳ Quality selector (HLS supports adaptive, manual selection pending)
- ⏳ Subtitles and caption tracks (infrastructure ready, implementation pending)

### 1.5 Analytics ✅ IMPLEMENTED

- ✅ Engagement metrics: watch time, completion rate, drop-off points
- ✅ Video performance insights (play count, watch time, completion rate per video)
- ✅ Focus-mode specific metrics (focus sessions, average duration, interruptions)
- ✅ Platform-wide analytics (total events, watch time, active users)
- ✅ ClickHouse-backed analytics processing with event tracking
- ✅ Real-time event tracking (PLAY, PAUSE, PROGRESS, COMPLETE, FOCUS_START, FOCUS_END)
- ⏳ Device and region distribution (infrastructure ready, implementation pending)

### 1.6 Security ✅ IMPLEMENTED

- ✅ JWT authentication with token versioning for security
- ✅ Role-Based Access Control (RBAC) for admin operations
- ✅ Category-based access control for video viewing
- ✅ Pre-signed URLs for upload and playback (S3 mode)
- ✅ Token invalidation on role/category changes
- ✅ Protected API endpoints with authentication middleware
- ⏳ HTTPS enforcement (configured, requires production setup)
- ⏳ Widevine DRM for protected content (infrastructure ready, implementation pending)

### 1.7 Category-Based Video Sharing ✅ IMPLEMENTED

- ✅ Users can view all videos from users in the same category
- ✅ Users can always view their own videos regardless of category
- ✅ Admins can view all videos regardless of category
- ✅ Category-based filtering in video listings
- ✅ Category role assignment during user creation (admin-controlled)
- ✅ Category role management in admin panel
- ✅ Configurable category access enforcement via `ENFORCE_CATEGORY_ACCESS` environment variable

### 1.8 Live Streaming ⏳ PLANNED

- ⏳ RTMP ingestion for broadcasters
- ⏳ Real-time HLS packaging
- ⏳ Low-latency HLS support
- ⏳ Scheduled live sessions with reminders

## 2. System Architecture

### 2.1 Components

| Component              | Technology                             |
|------------------------|----------------------------------------|
| Web Client             | React + Next.js                        |
| Mobile Apps            | Flutter                                |
| Backend API            | Node.js + Express                      |
| Authentication Service | JWT-based auth via Express middleware  |
| Upload Service         | Pre-signed URL generation              |
| Transcoding Pipeline   | FFmpeg executed via background workers |
| Metadata Service       | PostgreSQL-backed metadata management  |
| Object Storage         | AWS S3                                 |
| CDN Layer              | AWS CloudFront                         |
| Analytics Engine       | ClickHouse + event collector           |
| Admin Dashboard        | Next.js-based dashboard                |


### 2.2 End-to-End Flow

#### Upload

1. Client requests a pre-signed S3 URL
2. Video uploaded directly to S3

#### Processing

1. Backend stores video metadata in PostgreSQL
2. Background worker triggers FFmpeg transcoding

#### Transcoding

1. Multiple HLS renditions created (240p → 1080p)
2. Master playlist and segments exported to S3

#### CDN Distribution

1. CloudFront pulls HLS files from S3
2. Edge caching applied globally

#### Playback

1. Player retrieves HLS manifest
2. Adaptive bitrate selects optimal rendition

#### Analytics

1. Player events sent to event collector
2. Stored and aggregated inside ClickHouse

## 3. Final Tech Stack

### 3.1 Backend

- **Language**: Node.js
- **Framework**: Express.js
- **Video Processing**: FFmpeg
- **Authentication**: JWT
- **Worker Queue**: BullMQ (Redis-based)

### 3.2 Frontend

- **Web Application**: Next.js (React + TypeScript)
- **Video Player**: Video.js + hls.js
- **Admin Dashboard**: Next.js with server-side rendering

### 3.3 Databases

- **Primary Metadata Store**: PostgreSQL
- **Caching Layer**: Redis
- **Analytics Database**: ClickHouse

### 3.4 Storage & Delivery

- **Object Storage**: AWS S3
- **CDN Delivery**: AWS CloudFront
- **Transcoding Output**: HLS playlists + segments on S3

### 3.5 Infrastructure / DevOps

- **Containerization**: Docker
- **Orchestration**: Kubernetes (AWS EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki
- **Infrastructure-as-Code**: Terraform

## 4. Development Execution Flow

### 4.1 Phase 1 — MVP ✅ COMPLETED

- ✅ Next.js web app with login (admin-controlled user creation)
- ✅ Video upload via pre-signed S3 URL or direct local upload
- ✅ Basic HLS playback with Video.js
- ✅ Focus-mode UI with session tracking

### 4.2 Phase 2 — Backend & Transcoding ✅ COMPLETED

- ✅ Express API for video metadata management
- ✅ FFmpeg transcoding worker pipeline with BullMQ
- ✅ PostgreSQL integration with Prisma ORM
- ✅ Redis-based job queues (BullMQ)
- ✅ Local storage mode for development
- ✅ Video status workflow: UPLOADED → PROCESSING → READY → APPROVED/REJECTED

### 4.3 Phase 3 — Admin Tools & Analytics ✅ COMPLETED

- ✅ Admin dashboard (Next.js) with statistics
- ✅ Video moderation workflow (approve/reject)
- ✅ ClickHouse analytics ingestion
- ✅ Engagement charts and metrics
- ✅ User management with role and category updates
- ✅ Category-based access control

### 4.4 Phase 4 — Live Streaming ⏳ PLANNED

- ⏳ RTMP ingestion endpoint
- ⏳ FFmpeg-based live HLS packaging
- ⏳ CloudFront low-latency optimization
- ⏳ Live session viewer page

### 4.5 Phase 5 — Scaling & Optimization ⏳ PLANNED

- ⏳ Auto-scaling Kubernetes deployments
- ⏳ PostgreSQL read replicas
- ⏳ Redis caching strategies
- ⏳ Load testing + bottleneck fixes

## 5. Security & Compliance

- HTTPS enforced across all services
- JWT for user authentication & roles
- Pre-signed URLs for uploads and HLS manifests
- Widevine DRM for secure playback
- Strict RBAC in admin dashboard
- GDPR-compliant data storage policies
- Audit logs for sensitive operations

## 6. Testing Strategy

### 6.1 Test Types

- **Unit Testing**: Backend APIs, utility functions
- **Integration Testing**: Upload → Process → Playback
- **End-to-End Testing**: Real HLS playback in browser
- **Performance Testing**: CDN throughput & latency
- **Security Testing**: Token validation, URL protections

## 7. UI/UX & Accessibility

- Minimalist focus-centric player UI
- Task-based navigation and categories
- Subtitles, closed captions
- Keyboard shortcuts
- Screen reader support
- High-contrast and dark mode themes

## 8. Live Streaming Architecture

1. Broadcaster streams via RTMP
2. Ingest server processes stream
3. FFmpeg repackages into HLS (LL-HLS supported)
4. Segments pushed to S3
5. CloudFront distributes segments globally
6. Viewer plays via HLS-compatible player

## 9. Scalability & Maintenance

### 9.1 Scaling Techniques

- Horizontal scaling via Kubernetes
- Stateless backend services
- Redis caching for metadata
- PostgreSQL read replicas & partitioning
- Global CDN caching
- Canary deployments for safe rollouts
- Terraform-managed infrastructure for consistency

## 10. Implemented Workflows

### 10.1 Video Upload Workflow ✅

1. **User initiates upload:**
   - User selects video file on upload page
   - System generates unique video ID

2. **File upload:**
   - **S3 Mode**: Client requests pre-signed URL, uploads directly to S3
   - **Local Mode**: Client uploads directly to backend via multipart/form-data

3. **Video registration:**
   - Backend creates video record with status `PROCESSING`
   - Video assigned to user's category role automatically
   - Video metadata stored in PostgreSQL

4. **Transcoding:**
   - Job queued in BullMQ (Redis)
   - Worker processes video with FFmpeg
   - Multiple HLS renditions created (240p-1080p)
   - Master playlist generated
   - Files saved to storage (S3 or local)

5. **Status update:**
   - Video status updated to `READY` after successful transcoding
   - Video appears in admin pending approvals list

### 10.2 Video Moderation Workflow ✅

1. **Pending videos:**
   - Admin views videos with status: `UPLOADED`, `PROCESSING`, or `READY`
   - Videos listed with uploader email, upload date, and status

2. **Review process:**
   - Admin can preview video (if HLS path available)
   - Admin reviews video metadata and content

3. **Approval/Rejection:**
   - **Approve**: Status changed to `APPROVED`, video becomes visible to users
   - **Reject**: Status changed to `REJECTED`, optional storage deletion
   - Only `READY` or `UPLOADED` videos can be approved

4. **Post-approval:**
   - Approved videos visible to users in same category
   - Videos appear in main video listing (filtered by category)

### 10.3 Video Playback Workflow ✅

1. **Video discovery:**
   - Users see videos from their category in main listing
   - Users see their own videos in "My Videos" page
   - Admins see all videos

2. **Access control:**
   - System checks user's category role
   - Users can view: own videos (always), same-category videos (if approved)
   - Admins can view all videos

3. **Playback:**
   - Video metadata fetched from backend
   - HLS manifest URL constructed (CloudFront or local)
   - Video.js player loads and plays HLS stream
   - Adaptive bitrate selection based on bandwidth

4. **Progress tracking:**
   - User progress saved periodically (debounced)
   - Progress stored in analytics events
   - Resume prompt shown on next visit

### 10.4 Focus Mode Workflow ✅

1. **Enter focus mode:**
   - User clicks video to watch
   - Focus session automatically starts
   - Distraction-free player UI activated

2. **During playback:**
   - Cursor auto-hides after 3 seconds
   - Focus session duration tracked
   - Interruptions tracked (tab switching, window blur)
   - Progress updates sent to analytics

3. **Session completion:**
   - Video completion tracked
   - Focus session metrics logged
   - Session duration and interruptions recorded

4. **Analytics:**
   - Focus sessions aggregated in ClickHouse
   - Admin dashboard shows focus metrics
   - Average focus duration calculated

### 10.5 Category-Based Access Workflow ✅

1. **User creation (admin-controlled):**
   - Admin creates user account with category role assignment
   - Category role stored in user profile
   - Category role included in JWT token
   - Public registration is disabled

2. **Video upload:**
   - Video automatically assigned user's category role
   - Category role stored with video metadata

3. **Video viewing:**
   - System filters videos by category role
   - Users see all approved videos from their category
   - Users can always view their own videos
   - Admins bypass category restrictions

4. **Category management:**
   - Admins can update user category roles
   - Token version incremented on category change
   - User must re-login after category change

### 10.6 Analytics Workflow ✅

1. **Event tracking:**
   - Player events sent to analytics API
   - Events: PLAY, PAUSE, PROGRESS, COMPLETE, FOCUS_START, FOCUS_END
   - Events stored in ClickHouse for fast aggregation

2. **Analytics queries:**
   - Platform-wide metrics (total events, watch time, active users)
   - Video-specific metrics (play count, completion rate, drop-off points)
   - Focus mode metrics (sessions, duration, interruptions)

3. **Dashboard display:**
   - Admin dashboard shows aggregated metrics
   - Charts and graphs for visualization
   - Real-time data from ClickHouse

## 11. Current Implementation Status

### ✅ Fully Implemented Features

- User authentication and authorization (JWT)
- Video upload (S3 and local storage modes)
- Video transcoding with FFmpeg (HLS multi-bitrate)
- Video playback with Video.js
- Focus mode with session tracking
- Admin dashboard with statistics
- Video moderation (approve/reject)
- User management (roles and categories)
- Category-based access control
- Analytics tracking and dashboard
- Resume watching functionality
- Progress tracking
- Local storage mode for development

### ⏳ Partially Implemented / Pending

- Playback speed control (UI ready, needs implementation)
- Quality selector (adaptive works, manual selection pending)
- Subtitles/captions (infrastructure ready)
- Device/region analytics (infrastructure ready)
- HTTPS enforcement (requires production setup)
- Widevine DRM (infrastructure ready)

### ⏳ Not Yet Implemented

- Live streaming (RTMP ingestion, live HLS)
- Task-based playlists
- Content scheduling
- Auto-scaling infrastructure
- Performance optimizations

## Final Note

This finalized guide represents the definitive implementation blueprint for the platform, using a fixed, production-grade technology stack and architecture. All choices are made intentionally to support scalability, reliability, and maintainability for a real-world deployment.

**Last Updated**: December 2024
**Implementation Status**: Core features complete, advanced features in progress

