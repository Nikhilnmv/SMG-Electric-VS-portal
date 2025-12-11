# Migration Guide: From Video Uploads to Modules & Lessons

## Overview

This guide describes the migration from the old user-upload video system to the new module-based educational platform.

## Database Migration

### Step 1: Generate Migration

```bash
cd backend
npx prisma migrate dev --name add_modules_and_lessons
```

This will:
- Create new `modules` table
- Create new `lessons` table
- Create new `user_lesson_progress` table
- Update `analytics_events` to support `lessonId`
- Keep existing `videos` table (deprecated but functional)

### Step 2: Apply Migration to Worker

```bash
cd worker
npx prisma migrate deploy
```

### Step 3: Generate Prisma Client

```bash
# In backend
npx prisma generate

# In worker
npx prisma generate
```

## Breaking Changes

### Removed User Features

- ❌ User video upload (`/api/videos/upload-local`, `/api/upload/presigned-url`)
- ❌ "My Videos" page (`/my-videos`)
- ❌ "Upload Video" page (`/upload`) - removed from user navigation

### New Admin Features

- ✅ Module management (`/api/admin/modules`)
- ✅ Lesson management (`/api/admin/modules/:moduleId/lessons`)
- ✅ Lesson video upload (`/api/admin/lessons/:lessonId/upload`)

### New User Features

- ✅ Module browsing (`/modules`)
- ✅ Lesson viewing (`/lesson/:lessonId`)
- ✅ Progress tracking (automatic)

## API Changes

### Deprecated Endpoints

These endpoints still work but are deprecated:
- `POST /api/videos` - Use admin module/lesson endpoints instead
- `GET /api/videos/my-videos` - Removed from UI
- `POST /api/videos/upload-local` - Use admin lesson upload instead

### New Endpoints

**User Endpoints:**
- `GET /api/modules` - List accessible modules
- `GET /api/modules/:id` - Get module details
- `GET /api/lessons/:id` - Get lesson details
- `GET /api/lessons/:id/stream` - Get HLS URL
- `POST /api/lessons/:id/progress` - Update progress

**Admin Endpoints:**
- `POST /api/admin/modules` - Create module
- `GET /api/admin/modules` - List all modules
- `PATCH /api/admin/modules/:id` - Update module
- `DELETE /api/admin/modules/:id` - Delete module
- `POST /api/admin/modules/:moduleId/lessons` - Create lesson
- `POST /api/admin/lessons/:lessonId/upload` - Upload video
- `PATCH /api/admin/lessons/:lessonId` - Update lesson
- `DELETE /api/admin/lessons/:lessonId` - Delete lesson

## Frontend Changes

### Removed Pages

- `/upload` - User upload page (removed)
- `/my-videos` - User videos page (removed)

### New Pages

- `/modules` - Module listing page
- `/modules/[moduleId]` - Module detail page
- `/lesson/[lessonId]` - Lesson player page

### Updated Navigation

- Removed "Upload Video" from user navigation
- Removed "My Videos" from user navigation
- Added "Modules" to user navigation
- Added "Modules & Lessons" to admin navigation

## Data Migration (Optional)

### Migrating Existing Videos to Lessons

If you have existing videos you want to convert to lessons:

```sql
-- Example: Create a module for existing videos
INSERT INTO modules (id, title, description, "allowedCategories", "createdById", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Legacy Videos',
  'Videos migrated from old system',
  ARRAY[]::text[],
  (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
  NOW(),
  NOW()
);

-- Create lessons from videos (example - adjust as needed)
INSERT INTO lessons (id, "moduleId", title, description, "videoPath", "hlsMaster", status, "createdAt", "updatedAt", "order")
SELECT 
  gen_random_uuid(),
  (SELECT id FROM modules WHERE title = 'Legacy Videos' LIMIT 1),
  v.title,
  v.description,
  v."s3Key",
  v."hlsPath",
  CASE 
    WHEN v.status = 'APPROVED' THEN 'READY'
    WHEN v.status = 'PROCESSING' THEN 'PROCESSING'
    ELSE 'UPLOADED'
  END,
  v."createdAt",
  v."updatedAt",
  ROW_NUMBER() OVER (ORDER BY v."createdAt")
FROM videos v;
```

**Note:** This is a basic example. Adjust based on your specific needs.

## Worker Changes

### New Queue

- `lesson-processing` queue added alongside `video-processing`
- Processes lesson videos the same way as video videos
- Outputs to `/uploads/hls/<lessonId>/master.m3u8`

### Worker Updates

The worker now handles both:
- Old video processing (backward compatible)
- New lesson processing

## Testing Checklist

After migration:

- [ ] Database migration completed successfully
- [ ] Prisma client generated
- [ ] Admin can create modules
- [ ] Admin can create lessons
- [ ] Admin can upload videos for lessons
- [ ] Worker processes lesson videos
- [ ] Users can view modules (category-restricted)
- [ ] Users can view lessons
- [ ] Video lock feature works (cannot skip lessons)
- [ ] Progress tracking works
- [ ] Analytics events track lessons
- [ ] Old videos still accessible (if not migrated)

## Rollback Plan

If you need to rollback:

1. **Database**: Restore from backup before migration
2. **Code**: Checkout previous git commit
3. **Dependencies**: Reinstall previous package versions

## Support

For issues during migration:
1. Check migration logs
2. Verify database schema matches Prisma schema
3. Ensure all services are restarted after migration
4. Check worker logs for processing issues

