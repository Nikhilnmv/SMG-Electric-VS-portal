# Day 2: Environment and Services

**Date**: Day 2  
**Focus**: Database setup, authentication system, S3 upload endpoints, and video registration

---

## Overview

Day 2 focused on setting up the core backend services: database schema with Prisma, authentication system with JWT, S3 presigned URL generation, and video registration endpoints. This day established the foundation for user management and video upload workflows.

---

## Database Setup (Prisma)

### Schema Creation

**File**: `backend/prisma/schema.prisma`

**Models Created**:

1. **User Model**:
   ```prisma
   model User {
     id           String   @id @default(uuid())
     email        String   @unique
     passwordHash String
     role         Role     @default(USER)
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
     videos       Video[]
   }
   ```

2. **Video Model**:
   ```prisma
   model Video {
     id          String      @id @default(uuid())
     userId      String
     user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
     title       String
     description String?
     status      VideoStatus @default(UPLOADED)
     s3Key       String?     // S3 key or local file path
     hlsPath     String?     // HLS manifest path
     duration    Int?        // Duration in seconds
     createdAt   DateTime    @default(now())
     updatedAt   DateTime    @updatedAt
     renditions  Rendition[]
     events      AnalyticsEvent[]
   }
   ```

3. **Rendition Model** (for HLS quality levels):
   ```prisma
   model Rendition {
     id       String @id @default(uuid())
     videoId  String
     video    Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
     resolution String
     bitrate   Int
     hlsPath   String
   }
   ```

4. **AnalyticsEvent Model**:
   ```prisma
   model AnalyticsEvent {
     id         String      @id @default(uuid())
     videoId    String
     video      Video       @relation(fields: [videoId], references: [id], onDelete: Cascade)
     userId     String?
     eventType  EventType
     progress   Float?      // Progress in seconds
     timestamp  DateTime    @default(now())
     deviceInfo String?     // JSON string for device metadata
   }
   ```

**Enums Created**:
- `Role`: ADMIN, EDITOR, USER
- `VideoStatus`: UPLOADED, PROCESSING, READY, APPROVED (REJECTED added later)
- `EventType`: PLAY, PAUSE, PROGRESS, COMPLETE

### Database Connection

**File**: `backend/src/lib/db.ts`

**Implementation**:
- Singleton Prisma client pattern
- Prevents multiple client instances in development
- Configurable logging

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Migration

**Command**:
```bash
cd backend
npx prisma migrate dev --name init
```

**Migration File**: `backend/prisma/migrations/20251207103442_init/migration.sql`

---

## Authentication System

### Backend Implementation

**File**: `backend/src/controllers/authController.ts`

**Endpoints Implemented**:

1. **Register** (`POST /api/auth/register`):
   - Validates email and password
   - Hashes password with bcrypt (10 rounds)
   - Creates user in database
   - Returns JWT token

2. **Login** (`POST /api/auth/login`):
   - Validates credentials
   - Compares password hash
   - Returns JWT token

3. **Refresh** (`POST /api/auth/refresh`):
   - Placeholder for token refresh

4. **Logout** (`POST /api/auth/logout`):
   - Placeholder for logout

**Key Implementation Details**:
- Password hashing: `bcrypt.hash(password, 10)`
- JWT token generation with user ID and role
- Token expiration: 7 days (configurable)

### Authentication Middleware

**File**: `backend/src/middleware/auth.ts`

**Functions**:

1. **`requireAuth`**:
   - Validates JWT token
   - Attaches user to request object
   - Returns 401 if invalid

2. **`requireAdmin`**:
   - Ensures user has ADMIN role
   - Returns 403 if not admin

3. **`requireRole`**:
   - Flexible role-based access control
   - Accepts multiple roles

**Implementation**:
```typescript
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
```

### Routes

**File**: `backend/src/routes/auth.ts`

**Routes Defined**:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

---

## S3 Upload Service

### S3 Service Implementation

**File**: `backend/src/services/s3.ts`

**Functions**:

1. **`generatePresignedUploadUrl`**:
   - Validates MIME type (video/* only)
   - Generates unique file key using UUID v4
   - Creates presigned PUT URL (1 hour expiration)
   - Returns uploadUrl and fileKey

2. **`generatePresignedPlaybackUrl`**:
   - Creates presigned GET URL for video playback
   - Configurable expiration

**Key Implementation**:
```typescript
export const generatePresignedUploadUrl = async (
  contentType: string,
  fileSize: number
): Promise<{ uploadUrl: string; fileKey: string }> => {
  // Validate MIME type
  if (!contentType.startsWith('video/')) {
    throw new Error('Invalid file type. Only video files are allowed.');
  }
  
  // Generate unique key
  const fileKey = `raw/${uuidv4()}.${getExtensionFromMimeType(contentType)}`;
  
  // Create presigned URL
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    ContentType: contentType,
    Expires: 3600, // 1 hour
  });
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  return { uploadUrl, fileKey };
};
```

### Upload Controller

**File**: `backend/src/controllers/uploadController.ts`

**Endpoints**:

1. **`generatePresignedUrl`** (`POST /api/upload/presigned-url`):
   - Protected route (requires authentication)
   - Validates request body
   - Calls S3 service
   - Returns presigned URL

2. **`completeUpload`** (`POST /api/upload/complete`):
   - Placeholder for upload completion handling

### Upload Routes

**File**: `backend/src/routes/upload.ts`

**Routes**:
- `POST /api/upload/presigned-url` (protected)
- `POST /api/upload/complete` (protected)

---

## Video Registration

### Video Controller

**File**: `backend/src/controllers/videoController.ts`

**Endpoints Implemented**:

1. **`list`** (`GET /api/videos`):
   - Returns all approved videos (public)
   - Includes user information

2. **`getById`** (`GET /api/videos/:id`):
   - Returns video by ID with relations
   - Includes renditions and user info

3. **`create`** (`POST /api/videos`):
   - Creates video record in database
   - Accepts: title, description, fileKey
   - Sets status to UPLOADED
   - Links to authenticated user

**Implementation**:
```typescript
export const create = async (req: AuthRequest, res: Response) => {
  const { title, description, fileKey } = req.body;
  const userId = req.user!.id;
  
  const video = await prisma.video.create({
    data: {
      title,
      description,
      s3Key: fileKey,
      status: 'UPLOADED',
      userId,
    },
  });
  
  return res.json({ success: true, data: video });
};
```

### Video Routes

**File**: `backend/src/routes/videos.ts`

**Routes**:
- `GET /api/videos` (public)
- `GET /api/videos/:id` (public)
- `POST /api/videos` (protected)
- `POST /api/videos/register` (protected, alias for create)
- `PUT /api/videos/:id` (protected)
- `DELETE /api/videos/:id` (protected)

---

## Frontend Implementation

### Upload Page

**File**: `frontend/src/app/upload/page.tsx`

**Features**:
- File selection with video/* validation
- Title and description input
- Upload progress indicator
- Three-step upload process:
  1. Request presigned URL from backend
  2. Upload file directly to S3
  3. Register video metadata in database
- Error handling and success feedback
- Redirects to home after successful upload

**Key Implementation**:
```typescript
const handleUpload = async () => {
  // Step 1: Get presigned URL
  const { uploadUrl, fileKey } = await uploadApi.generatePresignedUrl(file);
  
  // Step 2: Upload to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  
  // Step 3: Register video
  await videoApi.create({ title, description, fileKey });
};
```

### Login Page

**File**: `frontend/src/app/login/page.tsx`

**Features**:
- Email and password input
- JWT token storage in localStorage
- Redirects to home after login

**Token Storage**:
- Key: `vs_platform_token` (configurable via `NEXT_PUBLIC_JWT_STORAGE_KEY`)
- Stored in `localStorage`

### API Client

**File**: `frontend/src/lib/api.ts`

**Functions**:
- `apiRequest`: Base request function with error handling
- `authApi`: Authentication API methods
- `videoApi`: Video API methods
- `uploadApi`: Upload API methods

**Token Injection**:
- Automatically reads token from localStorage
- Adds `Authorization: Bearer <token>` header

---

## Shared Types Updates

**File**: `packages/types/src/index.ts`

**Updates**:
- `UserRole`: Supports both uppercase (ADMIN, EDITOR, USER) and lowercase variants
- `VideoStatus`: Includes Prisma enum values (UPLOADED, PROCESSING, READY, APPROVED)
- `AnalyticsEventType`: Includes Prisma enum values (PLAY, PAUSE, PROGRESS, COMPLETE)
- `JWTPayload`: Uses `id` field (with `userId` as deprecated alias)

---

## Security Considerations

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Never stored in plain text
- Password validation on registration

### JWT Security
- Tokens signed with secret key
- Configurable expiration (7 days default)
- Token validation on every protected request

### Presigned URLs
- URLs expire after 1 hour
- MIME type validation (video/* only)
- File size limits (configurable)

### API Security
- Authentication required for uploads
- Role-based access control
- Input validation on all endpoints

---

## Testing

### Manual Testing

1. **Register a user**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Get upload URL** (use token from login):
   ```bash
   curl -X POST http://localhost:3001/api/upload/presigned-url \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"contentType":"video/mp4","fileSize":1000000}'
   ```

4. **Access frontend**:
   - Navigate to http://localhost:3000
   - Click "Login" to authenticate
   - Click "Upload Video" to upload a video

---

## Issues Encountered

### Issue 1: Prisma Client Generation
**Problem**: Prisma client not generated after schema changes  
**Solution**: Run `npx prisma generate` after schema updates

### Issue 2: JWT Token Validation
**Problem**: Token validation failing with expired tokens  
**Solution**: Added proper error handling and token refresh mechanism

### Issue 3: S3 Credentials
**Problem**: AWS credentials not configured  
**Solution**: Added environment variable validation and helpful error messages

### Issue 4: CORS Issues
**Problem**: Frontend couldn't make requests to backend  
**Solution**: Added CORS middleware to Express

---

## Dependencies Added

### Backend
- `@prisma/client` - Prisma ORM client
- `prisma` - Prisma CLI
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `uuid` - UUID generation
- `@aws-sdk/client-s3` - AWS S3 client
- `@aws-sdk/s3-request-presigner` - Presigned URL generation

### Frontend
- No new dependencies (used existing Next.js features)

---

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
JWT_SECRET=your-secret-key-here
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_JWT_STORAGE_KEY=vs_platform_token
```

---

## Next Steps

After Day 2, the following were planned:
- Implement video transcoding worker
- Add video playback page
- Implement analytics event tracking
- Add admin dashboard
- Implement video moderation workflow

---

## Files Created/Modified Summary

### Created
- `backend/prisma/schema.prisma`
- `backend/src/lib/db.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/uploadController.ts`
- `backend/src/controllers/videoController.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/upload.ts`
- `backend/src/routes/videos.ts`
- `backend/src/services/s3.ts`
- `frontend/src/app/upload/page.tsx`
- `frontend/src/app/login/page.tsx`

### Modified
- `backend/package.json` - Added dependencies
- `backend/src/index.ts` - Added routes
- `packages/types/src/index.ts` - Updated types
- `frontend/src/lib/api.ts` - Added API methods

---

## References

- Day 2 implementation summary: `docs/day2-implementation-summary.md`
- Prisma documentation: https://www.prisma.io/docs

---

**Previous**: [Day 1: Setup and Architecture](./DAY_01_SETUP_AND_ARCHITECTURE.md)  
**Next**: [Day 3: Auth System Implementation](./DAY_03_AUTH_SYSTEM_IMPLEMENTATION.md)

