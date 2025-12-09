# Full Project Flow Summary

**Complete System Overview** - How the entire video streaming platform works from end to end

---

## System Architecture Overview

```
┌─────────────┐
│   Frontend  │ (Next.js - Port 3000)
│             │
│  - Upload   │
│  - Watch    │
│  - Admin    │
└──────┬──────┘
       │ HTTP/REST API
       │ JWT Authentication
       │
┌──────▼──────┐
│   Backend   │ (Express - Port 3001)
│             │
│  - Auth     │
│  - Videos   │
│  - Upload   │
│  - Admin    │
│  - Analytics│
└──────┬──────┘
       │
       ├──► PostgreSQL (Metadata)
       │    - Users
       │    - Videos
       │    - Analytics Events
       │
       ├──► Redis (Job Queue)
       │    - BullMQ Jobs
       │
       ├──► ClickHouse (Analytics)
       │    - Event Tracking
       │    - Aggregations
       │
       └──► Storage (S3 or Local)
            │
            │ Jobs via BullMQ
            │
       ┌────▼──────┐
       │   Worker │ (Node.js + FFmpeg)
       │          │
       │  - Transcode│
       │  - HLS Gen │
       └───────────┘
```

---

## Complete Request Flows

### 1. User Registration Flow

```
User → Frontend (/register)
  ↓
POST /api/auth/register
  ↓
Backend: authController.register()
  ↓
- Validate email/password
- Hash password (bcrypt)
- Create user in PostgreSQL
- Generate JWT token
  ↓
Return: { user, token }
  ↓
Frontend: Store token in localStorage
  ↓
Redirect to /dashboard
```

**Key Points**:
- Password hashed with bcrypt (10 rounds)
- JWT token includes: id, email, role, categoryRole, tokenVersion
- Token stored in localStorage
- Token expiration: 7 days

---

### 2. Video Upload Flow

#### Local Storage Mode

```
User → Frontend (/upload)
  ↓
Select video file
  ↓
POST /api/videos/upload-local (multipart/form-data)
  ↓
Backend: uploadController.uploadLocal()
  ↓
- Save file to backend/uploads/raw/{videoId}/original.mp4
- Return: { videoId, filePath }
  ↓
Frontend: POST /api/videos/register
  ↓
Backend: videoController.create()
  ↓
- Create video record (status: PROCESSING)
- Enqueue job to BullMQ queue
  ↓
Worker picks up job
  ↓
- Read file from local storage
- Transcode with FFmpeg (5 renditions)
- Save HLS files to backend/uploads/hls/{videoId}/
- Update database (status: READY, hlsPath)
  ↓
Video ready for playback
```

#### S3 Mode

```
User → Frontend (/upload)
  ↓
Select video file
  ↓
POST /api/upload/presigned-url
  ↓
Backend: s3Service.generatePresignedUploadUrl()
  ↓
- Generate presigned PUT URL (1 hour expiration)
- Return: { uploadUrl, fileKey }
  ↓
Frontend: PUT file directly to S3
  ↓
Frontend: POST /api/videos/register
  ↓
Backend: videoController.create()
  ↓
- Create video record (status: PROCESSING)
- Enqueue job to BullMQ queue
  ↓
Worker picks up job
  ↓
- Download file from S3
- Transcode with FFmpeg (5 renditions)
- Upload HLS files to S3
- Update database (status: READY, hlsPath)
  ↓
Video ready for playback via CloudFront
```

**Key Points**:
- Storage mode determined by `STORAGE_MODE` environment variable
- Video status: UPLOADED → PROCESSING → READY → APPROVED
- Transcoding happens asynchronously via worker
- HLS files generated: 240p, 360p, 480p, 720p, 1080p

---

### 3. Video Playback Flow

```
User → Frontend (/watch/{videoId})
  ↓
GET /api/videos/{videoId}
  ↓
Backend: videoController.getById()
  ↓
- Check category access control
- Fetch video from database
- Get user progress (if authenticated)
- Return: { video, userProgress }
  ↓
Frontend: Construct HLS URL
  ↓
- Local: http://localhost:3001/uploads/hls/{videoId}/master.m3u8
- S3: https://cloudfront.net/hls/{videoId}/master.m3u8
  ↓
Video.js Player:
  ↓
- Load HLS manifest
- Adaptive bitrate selection
- Load video segments (.ts files)
- Play video
  ↓
Analytics Events:
  ↓
- PLAY event on start
- PROGRESS events every 5 seconds
- PAUSE event on pause
- COMPLETE event on finish
  ↓
POST /api/analytics/event
  ↓
Backend: analyticsController.trackEvent()
  ↓
- Store event in ClickHouse
- Update aggregations
```

**Key Points**:
- Category-based access control enforced
- Resume watching from last position
- Progress tracked every 5 seconds
- Analytics events sent to ClickHouse

---

### 4. Video Moderation Flow

```
Admin → Frontend (/admin)
  ↓
GET /api/admin/videos/pending
  ↓
Backend: adminController.getPendingVideos()
  ↓
- Fetch videos with status: UPLOADED, PROCESSING, READY
- Include user email
- Return list
  ↓
Admin reviews video
  ↓
Option 1: Approve
  ↓
POST /api/admin/videos/{id}/approve
  ↓
Backend: adminController.approveVideo()
  ↓
- Update status to APPROVED
- Video now visible to users
  ↓
Option 2: Reject
  ↓
POST /api/admin/videos/{id}/reject
  ↓
Backend: adminController.rejectVideo()
  ↓
- Update status to REJECTED
- Optionally delete files from storage
- Video hidden from users
```

**Key Points**:
- Only admins and editors can moderate
- Rejection can optionally delete files
- Status change: READY → APPROVED or REJECTED

---

### 5. Analytics Flow

```
User watches video
  ↓
Frontend: VideoPlayer component
  ↓
Events triggered:
- PLAY, PAUSE, PROGRESS, COMPLETE
- FOCUS_START, FOCUS_END
  ↓
POST /api/analytics/event (batched)
  ↓
Backend: analyticsController.trackEvent()
  ↓
- Validate event
- Store in ClickHouse (events_raw table)
- Materialized views update aggregations
  ↓
Admin views analytics
  ↓
GET /api/admin/analytics/overview
  ↓
Backend: Query ClickHouse
  ↓
- Total events
- Watch time
- Completion rate
- Active users
  ↓
Return aggregated data
  ↓
Frontend: Display charts and metrics
```

**Key Points**:
- Events stored in ClickHouse for fast queries
- Materialized views for aggregations
- Real-time analytics dashboard
- Video-specific and platform-wide metrics

---

## Video Lifecycle

### Status Transitions

```
UPLOADED
  ↓ (Worker picks up job)
PROCESSING
  ↓ (Transcoding completes)
READY
  ↓ (Admin approves)
APPROVED
  ↓ (Visible to users)
```

**Alternative Path**:
```
READY
  ↓ (Admin rejects)
REJECTED
  ↓ (Hidden from users, optionally deleted)
```

### Category Assignment

```
User uploads video
  ↓
Backend: videoService.registerUploadedVideo()
  ↓
- Fetch user's categoryRole from database
- Assign video.categoryRole = user.categoryRole
- Store in database
  ↓
Video inherits user's category
```

**Key Points**:
- Videos inherit category from uploader
- Category determines visibility
- Admins can view all categories

---

## Category-Based Access Lifecycle

### User Registration

```
User registers
  ↓
Selects categoryRole (DEALER, EMPLOYEE, etc.)
  ↓
Backend stores categoryRole
  ↓
JWT token includes categoryRole
  ↓
Token version: 0
```

### Video Viewing

```
User requests video list
  ↓
Backend: videoController.list()
  ↓
Check user role:
- ADMIN → All videos
- Other → Filter by categoryRole
  ↓
Return filtered videos
```

### Category Change

```
Admin changes user category
  ↓
Backend: adminController.updateUserCategory()
  ↓
- Update user.categoryRole
- Increment tokenVersion
  ↓
User's existing tokens invalidated
  ↓
User must re-login
```

**Key Points**:
- Category determines video visibility
- Token versioning for security
- Admins bypass category restrictions

---

## Data Flow Diagrams

### Upload → Processing → Playback

```
┌─────────┐
│ Upload  │
└────┬────┘
     │
     ▼
┌─────────┐     ┌─────────┐
│ Backend │────▶│  Queue  │
└────┬────┘     └────┬────┘
     │               │
     ▼               ▼
┌─────────┐     ┌─────────┐
│Database │     │ Worker  │
│PROCESSING│     │Transcode│
└─────────┘     └────┬────┘
                     │
                     ▼
                ┌─────────┐
                │   HLS   │
                │  Files  │
                └────┬────┘
                     │
                     ▼
                ┌─────────┐
                │Database │
                │  READY  │
                └────┬────┘
                     │
                     ▼
                ┌─────────┐
                │ Playback│
                └─────────┘
```

### Analytics Flow

```
┌─────────┐
│  Player │
└────┬────┘
     │ Events
     ▼
┌─────────┐
│ Backend │
└────┬────┘
     │
     ▼
┌─────────┐
│ClickHouse│
│events_raw│
└────┬────┘
     │
     ▼
┌─────────┐
│Materialized│
│   Views   │
└────┬────┘
     │
     ▼
┌─────────┐
│Analytics│
│Dashboard│
└─────────┘
```

---

## Key Components Interaction

### Frontend ↔ Backend

- **Authentication**: JWT tokens in localStorage
- **API Requests**: RESTful endpoints
- **Error Handling**: Try-catch with user-friendly messages
- **State Management**: React hooks and context

### Backend ↔ Database

- **ORM**: Prisma for type-safe queries
- **Migrations**: Version-controlled schema changes
- **Relations**: User → Videos, Video → Events

### Backend ↔ Worker

- **Queue**: BullMQ with Redis
- **Jobs**: Video processing jobs
- **Retries**: 3 attempts with exponential backoff

### Worker ↔ Storage

- **Local**: Direct file system access
- **S3**: AWS SDK for uploads/downloads
- **HLS**: Multiple quality renditions

### Backend ↔ Analytics

- **ClickHouse**: Event storage and aggregation
- **Queries**: Fast analytical queries
- **Materialized Views**: Pre-aggregated metrics

---

## Security Flow

### Authentication

```
Request → requireAuth middleware
  ↓
Extract token from Authorization header
  ↓
Verify JWT signature
  ↓
Check token expiration
  ↓
Fetch user from database
  ↓
Check tokenVersion matches
  ↓
Attach user to request
  ↓
Continue to route handler
```

### Authorization

```
Request → requireRole middleware
  ↓
Check user.role
  ↓
Check user.categoryRole (for videos)
  ↓
Allow or deny (403)
```

---

## Error Handling Flow

```
Error occurs
  ↓
Caught by try-catch
  ↓
Logged with context
  ↓
Error handler middleware
  ↓
User-friendly error message
  ↓
Return error response
  ↓
Frontend displays error
```

---

## Performance Optimizations

### Video Processing

- **Parallel Renditions**: All qualities generated simultaneously
- **Configurable Concurrency**: Multiple workers possible
- **Retry Logic**: Handles transient failures

### Analytics

- **Batched Events**: Multiple events sent together
- **Materialized Views**: Pre-aggregated data
- **Partitioning**: ClickHouse partitions by month

### Frontend

- **Debouncing**: Progress updates debounced
- **Lazy Loading**: Components loaded on demand
- **Caching**: API responses cached where appropriate

---

## Complete System State

### Database State

- **Users**: id, email, role, categoryRole, tokenVersion
- **Videos**: id, title, status, categoryRole, hlsPath
- **Events**: id, videoId, userId, eventType, timestamp

### Redis State

- **Job Queue**: Pending, active, completed, failed jobs
- **Job Data**: videoId, file paths, metadata

### Storage State

- **Raw Videos**: Original uploaded files
- **HLS Files**: Transcoded segments and playlists
- **Thumbnails**: Video thumbnails

### ClickHouse State

- **Events**: All analytics events
- **Aggregations**: Daily statistics per video/user

---

## Integration Points

### External Services

1. **AWS S3**: Object storage (optional)
2. **CloudFront**: CDN for video delivery (optional)
3. **PostgreSQL**: Primary database
4. **Redis**: Job queue
5. **ClickHouse**: Analytics database

### Internal Services

1. **Frontend**: User interface
2. **Backend**: API server
3. **Worker**: Background processing

---

## Complete Feature Matrix

| Feature | Frontend | Backend | Worker | Database | Analytics |
|---------|----------|---------|--------|----------|-----------|
| User Auth | ✅ | ✅ | ❌ | ✅ | ❌ |
| Video Upload | ✅ | ✅ | ❌ | ✅ | ❌ |
| Video Processing | ❌ | ✅ | ✅ | ✅ | ❌ |
| Video Playback | ✅ | ✅ | ❌ | ✅ | ✅ |
| Admin Panel | ✅ | ✅ | ❌ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ❌ | ❌ | ✅ |
| Category Access | ✅ | ✅ | ❌ | ✅ | ❌ |

---

**This document provides a complete understanding of how all components interact in the video streaming platform.**

