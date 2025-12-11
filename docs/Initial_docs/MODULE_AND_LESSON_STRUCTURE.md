# Module and Lesson Structure

## Overview

The platform has been transformed from a user-upload video system to a structured educational platform with modules and lessons. Only administrators can create content, and users access modules based on their category assignments.

## Database Schema

### Module Model

```prisma
model Module {
  id              String            @id @default(cuid())
  title           String
  description     String?
  allowedCategories String[]        @default([])
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  createdById     String
  createdBy       User              @relation(fields: [createdById], references: [id], onDelete: Cascade)
  lessons         Lesson[]
}
```

**Key Fields:**
- `allowedCategories`: Array of category roles (DEALER, EMPLOYEE, TECHNICIAN, etc.) that can access this module
- `createdById`: ID of the admin user who created the module

### Lesson Model

```prisma
model Lesson {
  id          String        @id @default(cuid())
  moduleId    String
  title       String
  description String?
  videoPath   String?       // folder path for HLS output
  hlsMaster   String?       // master.m3u8 path
  status      LessonStatus  @default(UPLOADED)
  duration    Int?
  thumbnailUrl String?
  order       Int           @default(0) // Order within module
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  module      Module        @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  events      AnalyticsEvent[]
  progress    UserLessonProgress[]
}
```

**Key Fields:**
- `order`: Determines the sequence of lessons within a module
- `status`: UPLOADED → PROCESSING → READY
- `hlsMaster`: Path to the master.m3u8 file for video playback

### UserLessonProgress Model

```prisma
model UserLessonProgress {
  id          String    @id @default(cuid())
  userId      String
  lessonId    String
  completed   Boolean   @default(false)
  progress    Int       @default(0) // 0-100 percentage
  lastWatchedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
}
```

**Purpose:** Tracks individual user progress through lessons, enabling:
- Progress percentage tracking
- Completion status
- Video lock feature (users must complete previous lesson)

## Architecture

### Content Hierarchy

```
Module
  ├── Lesson 1 (order: 0)
  ├── Lesson 2 (order: 1)
  ├── Lesson 3 (order: 2)
  └── ...
```

### Access Control Flow

1. User requests module/lesson
2. System checks: `user.categoryRole ∈ module.allowedCategories`
3. If accessing a lesson, system checks if previous lesson is completed (video lock)
4. If all checks pass, content is served

### Video Processing Flow

1. Admin uploads video for a lesson
2. Video is saved (local storage or S3)
3. Worker processes video → HLS transcoding
4. HLS files saved to `/uploads/hls/<lessonId>/master.m3u8`
5. Lesson status updated to READY
6. Lesson becomes available for viewing

## API Endpoints

### User Endpoints

- `GET /api/modules` - List modules accessible to user's category
- `GET /api/modules/:id` - Get module details with lessons
- `GET /api/lessons/:id` - Get lesson details (with access check)
- `GET /api/lessons/:id/stream` - Get HLS stream URL
- `POST /api/lessons/:id/progress` - Update lesson progress

### Admin Endpoints

- `POST /api/admin/modules` - Create module
- `GET /api/admin/modules` - List all modules
- `GET /api/admin/modules/:id` - Get module details
- `PATCH /api/admin/modules/:id` - Update module
- `DELETE /api/admin/modules/:id` - Delete module
- `POST /api/admin/modules/:moduleId/lessons` - Create lesson
- `POST /api/admin/lessons/:lessonId/upload` - Upload video for lesson
- `PATCH /api/admin/lessons/:lessonId` - Update lesson
- `DELETE /api/admin/lessons/:lessonId` - Delete lesson

## Migration Notes

- Old `Video` model is deprecated but kept for backward compatibility
- Existing videos remain accessible but new content should use Module/Lesson structure
- Analytics events now support both `videoId` (legacy) and `lessonId` (new)

