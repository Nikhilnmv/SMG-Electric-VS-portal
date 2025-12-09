# Maintainer Handbook

**Complete guide for running, testing, debugging, and extending the VS Platform**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Running the Platform](#running-the-platform)
4. [Testing](#testing)
5. [Debugging](#debugging)
6. [Modifying Features](#modifying-features)
7. [Database Management](#database-management)
8. [Storage Management](#storage-management)
9. [Troubleshooting](#troubleshooting)
10. [Extending the Platform](#extending-the-platform)

---

## Quick Start

### Prerequisites

- Node.js 18+ (check `.nvmrc`)
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose
- FFmpeg (`brew install ffmpeg` on macOS)

### Initial Setup

```bash
# Clone repository
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"

# Install dependencies
pnpm install

# Start Docker services
docker compose up -d postgres redis clickhouse

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp worker/.env.example worker/.env

# Run database migrations
cd backend
npx prisma migrate deploy
npx prisma generate
cd ../worker
npx prisma generate

# Start all services
pnpm dev
```

---

## Project Structure

### Directory Overview

```
.
├── frontend/          # Next.js web application
├── backend/          # Express API server
├── worker/           # Background job workers
├── packages/types/   # Shared TypeScript types
├── infra/            # Infrastructure as Code
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

### Key Files

**Frontend**:
- `frontend/src/app/` - Next.js pages
- `frontend/src/components/` - React components
- `frontend/src/lib/` - Utilities and API client
- `frontend/src/hooks/` - Custom React hooks

**Backend**:
- `backend/src/controllers/` - Request handlers
- `backend/src/routes/` - Route definitions
- `backend/src/services/` - Business logic
- `backend/src/middleware/` - Auth and error handling
- `backend/prisma/` - Database schema and migrations

**Worker**:
- `worker/src/queue/` - BullMQ job handlers
- `worker/src/transcoder/` - FFmpeg integration
- `worker/src/services/` - Storage services

---

## Running the Platform

### Development Mode

```bash
# Terminal 1: Backend
pnpm --filter backend dev

# Terminal 2: Worker
pnpm --filter worker dev

# Terminal 3: Frontend
pnpm --filter frontend dev
```

### Production Mode

```bash
# Build all services
pnpm build

# Start with Docker Compose
docker compose up -d
```

### Individual Services

```bash
# Backend only
cd backend && pnpm dev

# Worker only
cd worker && pnpm dev

# Frontend only
cd frontend && pnpm dev
```

---

## Testing

### Manual Testing

1. **Health Checks**:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3000
   ```

2. **Authentication**:
   - Login: http://localhost:3000/login
   - User Creation (Admin only): http://localhost:3000/admin/users/create
   - Note: Public registration is disabled. Only admins can create user accounts.

3. **Video Upload**:
   - Navigate to: http://localhost:3000/upload
   - Select video file
   - Enter title and description
   - Click "Upload Video"

4. **Video Playback**:
   - Navigate to: http://localhost:3000/watch/{videoId}
   - Verify video plays

5. **Admin Panel**:
   - Login as admin
   - Navigate to: http://localhost:3000/admin
   - Test moderation features

### API Testing

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | jq -r '.data.token')

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/videos
```

### Database Testing

```bash
# Connect to PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Check users
SELECT id, email, role, "categoryRole" FROM users;

# Check videos
SELECT id, title, status, "categoryRole" FROM videos;

# Check analytics events
SELECT * FROM "AnalyticsEvent" ORDER BY timestamp DESC LIMIT 10;
```

---

## Debugging

### Backend Debugging

1. **Check Logs**:
   ```bash
   # Backend logs show in terminal
   # Look for error messages
   ```

2. **Database Queries**:
   ```bash
   # Use Prisma Studio
   cd backend
   npx prisma studio
   ```

3. **API Testing**:
   ```bash
   # Use curl or Postman
   curl -v http://localhost:3001/api/videos
   ```

### Frontend Debugging

1. **Browser DevTools**:
   - Open DevTools (F12)
   - Check Console for errors
   - Check Network tab for API calls
   - Check Application tab for localStorage

2. **React DevTools**:
   - Install React DevTools extension
   - Inspect component state
   - Check props and hooks

### Worker Debugging

1. **Check Worker Logs**:
   ```bash
   # Worker logs show in terminal
   # Look for job processing messages
   ```

2. **Check Redis Queue**:
   ```bash
   # Connect to Redis
   redis-cli
   
   # Check queue
   KEYS bull:video-processing:*
   ```

3. **Check File System**:
   ```bash
   # Check uploads directory
   ls -la backend/uploads/raw/
   ls -la backend/uploads/hls/
   ```

---

## Modifying Features

### Adding a New API Endpoint

1. **Create Controller Method**:
   ```typescript
   // backend/src/controllers/exampleController.ts
   export const newMethod = async (req: AuthRequest, res: Response) => {
     // Implementation
   };
   ```

2. **Add Route**:
   ```typescript
   // backend/src/routes/example.ts
   router.get('/new-endpoint', requireAuth, exampleController.newMethod);
   ```

3. **Register Route**:
   ```typescript
   // backend/src/index.ts
   app.use('/api/example', exampleRouter);
   ```

### Adding a New Frontend Page

1. **Create Page**:
   ```typescript
   // frontend/src/app/new-page/page.tsx
   export default function NewPage() {
     return <MainLayout>...</MainLayout>;
   }
   ```

2. **Add Navigation** (if needed):
   ```typescript
   // frontend/src/components/layout/MainLayout.tsx
   { label: 'New Page', href: '/new-page', icon: Icon },
   ```

### Modifying Database Schema

1. **Update Schema**:
   ```prisma
   // backend/prisma/schema.prisma
   model NewModel {
     id String @id @default(uuid())
     // ... fields
   }
   ```

2. **Create Migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name add_new_model
   ```

3. **Update Types**:
   ```bash
   npx prisma generate
   ```

### Modifying Roles/Categories

1. **Update Enum**:
   ```prisma
   // backend/prisma/schema.prisma
   enum CategoryRole {
     DEALER
     EMPLOYEE
     // ... add new category
   }
   ```

2. **Run Migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name add_new_category
   ```

3. **Update Frontend**:
   ```typescript
   // frontend/src/app/admin/users/create/page.tsx
   // Add new category to dropdown
   ```

---

## Database Management

### Migrations

```bash
# Create new migration
cd backend
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Seeding

```bash
# Create seed file
# backend/prisma/seed.ts

# Run seed
npx prisma db seed
```

### Backup and Restore

```bash
# Backup
docker exec vs-platform-postgres pg_dump -U postgres vs_platform > backup.sql

# Restore
docker exec -i vs-platform-postgres psql -U postgres vs_platform < backup.sql
```

---

## Storage Management

### Local Storage

**Location**: `backend/uploads/`

**Structure**:
```
uploads/
  raw/          # Original video files
  hls/          # Transcoded HLS files
  thumbnails/   # Video thumbnails
```

**Cleanup**:
```bash
# Remove old files
find backend/uploads/raw -mtime +30 -delete
find backend/uploads/hls -mtime +30 -delete
```

### S3 Storage

**Configuration**:
```env
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
```

**Migration from Local to S3**:
1. Set `STORAGE_MODE=s3` in all services
2. Configure AWS credentials
3. Restart services
4. New uploads will use S3

---

## Troubleshooting

### Common Issues

1. **Services Not Starting**:
   - Check Docker services: `docker compose ps`
   - Check environment variables
   - Check port conflicts

2. **Database Connection Errors**:
   - Verify PostgreSQL is running
   - Check DATABASE_URL
   - Verify database exists

3. **Worker Not Processing**:
   - Check worker is running
   - Check Redis connection
   - Check FFmpeg is installed
   - Check file paths

4. **Video Not Playing**:
   - Check HLS files exist
   - Check video status is READY
   - Check CORS configuration
   - Check browser console for errors

5. **Authentication Issues**:
   - Check JWT_SECRET is set
   - Check token expiration
   - Check token format

### Diagnostic Scripts

```bash
# Check worker status
./scripts/check-worker-status.sh

# Check upload issues
./scripts/check-upload-issues.sh

# Test analytics
./scripts/test-analytics.sh
```

---

## Extending the Platform

### Adding New Features

1. **Plan the Feature**:
   - Define requirements
   - Design database schema
   - Plan API endpoints
   - Design UI

2. **Implement Backend**:
   - Create database migration
   - Create controller methods
   - Add routes
   - Add services

3. **Implement Frontend**:
   - Create pages/components
   - Add API client methods
   - Update navigation
   - Add error handling

4. **Test**:
   - Manual testing
   - API testing
   - Integration testing

### Adding New Storage Backend

1. **Create Storage Service**:
   ```typescript
   // backend/src/services/newStorage.ts
   export const saveFile = async (file: File) => {
     // Implementation
   };
   ```

2. **Update Upload Controller**:
   ```typescript
   if (process.env.STORAGE_MODE === 'new') {
     await newStorage.saveFile(file);
   }
   ```

3. **Update Worker**:
   ```typescript
   if (process.env.STORAGE_MODE === 'new') {
     await newStorage.downloadFile(key);
     await newStorage.uploadHLS(hlsFiles);
   }
   ```

### Adding New Analytics Events

1. **Update Event Type**:
   ```typescript
   // packages/types/src/index.ts
   export type EventType = 'PLAY' | 'PAUSE' | ... | 'NEW_EVENT';
   ```

2. **Track Event**:
   ```typescript
   // frontend/src/components/VideoPlayer.tsx
   analyticsApi.trackEvent(videoId, 'NEW_EVENT', progress);
   ```

3. **Handle in Backend**:
   ```typescript
   // backend/src/controllers/analyticsController.ts
   // Event is automatically stored in ClickHouse
   ```

---

## Environment Variables Reference

### Backend

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Storage
STORAGE_MODE=local  # or 's3'
UPLOADS_DIR=./uploads

# S3 (if STORAGE_MODE=s3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket

# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Category Access
ENFORCE_CATEGORY_ACCESS=true
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STORAGE_MODE=local
NEXT_PUBLIC_JWT_STORAGE_KEY=vs_platform_token
NEXT_PUBLIC_CLOUD_FRONT_URL=  # For S3 mode
```

### Worker

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage
STORAGE_MODE=local
UPLOADS_DIR=../backend/uploads

# FFmpeg
FFMPEG_PATH=ffmpeg
TEMP_DIR=/tmp/transcode
TRANSCODING_CONCURRENCY=2

# Category
HLS_PREFIX_BY_CATEGORY=false
```

---

## Useful Commands

```bash
# Install dependencies
pnpm install

# Run all services
pnpm dev

# Build all services
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Database
cd backend && npx prisma studio
cd backend && npx prisma migrate dev
cd backend && npx prisma generate

# Docker
docker compose up -d
docker compose down
docker compose ps
docker compose logs -f

# Redis
redis-cli
redis-cli ping

# ClickHouse
curl http://localhost:8123
```

---

## File Locations Reference

### Important Files

- **Database Schema**: `backend/prisma/schema.prisma`
- **API Routes**: `backend/src/routes/`
- **Controllers**: `backend/src/controllers/`
- **Frontend Pages**: `frontend/src/app/`
- **Components**: `frontend/src/components/`
- **Shared Types**: `packages/types/src/index.ts`
- **Worker Jobs**: `worker/src/queue/`
- **FFmpeg Config**: `worker/src/transcoder/ffmpeg.ts`

---

## Getting Help

1. **Check Documentation**:
   - This handbook
   - Day-by-day implementation docs
   - Error archive
   - Troubleshooting guides

2. **Check Logs**:
   - Backend logs
   - Worker logs
   - Browser console
   - Docker logs

3. **Check Database**:
   - Use Prisma Studio
   - Check migrations
   - Verify schema

4. **Check Configuration**:
   - Environment variables
   - Docker services
   - File permissions

---

**This handbook should be your first reference when working on the platform.**

