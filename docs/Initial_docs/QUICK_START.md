# Quick Start Guide - Educational Platform

## Current Status

✅ **Frontend**: Running on http://localhost:3000
✅ **Databases**: PostgreSQL, Redis, ClickHouse running in Docker
✅ **Migrations**: Applied (modules, lessons, user_lesson_progress tables created)
✅ **Prisma Clients**: Generated

## Step 1: Start All Services

Open terminals and run:

```bash
# Navigate to project root
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"

# Terminal 1: Start backend
pnpm --filter backend dev

# Terminal 2: Start worker
pnpm --filter worker dev

# Terminal 3: Start frontend (if not already running)
pnpm --filter frontend dev
```

Wait for all services to show "listening" or "started" messages.

## Step 2: Create Admin User (First Time Setup)

**Note**: Public registration is disabled. Only admins can create user accounts.

**Quick Method - Use the Admin Creation Script:**

```bash
# From project root
chmod +x scripts/create-admin-user.sh
./scripts/create-admin-user.sh admin@yourcompany.com SecurePassword123
```

**Alternative: Use Prisma Studio**

```bash
cd backend
npx prisma studio
# Open http://localhost:5555
# Navigate to users table
# Create new user with role = ADMIN
```

## Step 3: Log In

1. Navigate to http://localhost:3000/login
2. Enter your admin credentials
3. You'll be redirected to the dashboard

## Step 4: Create Your First Module (Admin)

### Option A: Using Admin UI

1. Navigate to `/admin/modules` (will be available after admin UI is built)
2. Click "Create Module"
3. Fill in:
   - **Title**: "Introduction to Electrical Safety"
   - **Description**: "Learn the fundamentals of electrical safety"
   - **Allowed Categories**: Select categories (e.g., DEALER, EMPLOYEE)
4. Click "Create"

### Option B: Using API

```bash
# Get your auth token from browser localStorage
TOKEN="your-token-here"

curl -X POST http://localhost:3001/api/admin/modules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Electrical Safety",
    "description": "Learn the fundamentals of electrical safety",
    "allowedCategories": ["DEALER", "EMPLOYEE"]
  }'
```

Save the `id` from the response - this is your `MODULE_ID`.

## Step 5: Add Lessons to Module

### Create Lesson

```bash
curl -X POST http://localhost:3001/api/admin/modules/MODULE_ID/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lesson 1: Basic Safety Rules",
    "description": "Understanding fundamental safety protocols",
    "order": 0
  }'
```

Save the `id` from the response - this is your `LESSON_ID`.

## Step 6: Upload Video for Lesson

```bash
curl -X POST http://localhost:3001/api/admin/lessons/LESSON_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@/path/to/your/video.mp4" \
  -F "thumbnail=@/path/to/thumbnail.jpg"
```

**Note**: 
- Video file should be a supported format (MP4, MOV, etc.)
- Thumbnail is optional
- File size limit: 500MB

## Step 7: Monitor Video Processing

**Check Worker Logs** (in worker terminal):
- You should see: "Starting lesson processing for lesson {id}"
- FFmpeg transcoding progress
- "Lesson processing completed successfully"

**Check Lesson Status:**
```bash
curl http://localhost:3001/api/admin/modules/MODULE_ID \
  -H "Authorization: Bearer $TOKEN"
```

Status will change:
- `UPLOADED` → Video uploaded, waiting for processing
- `PROCESSING` → Video is being transcoded
- `READY` → Video is ready for playback (includes hlsMaster)

## Step 8: Test User Access

### Create Test User

1. Go to `/admin/users`
2. Create a user with category matching your module's `allowedCategories`
3. Log out and log in as this user

### Access Module

1. Navigate to `/modules`
2. You should see your module listed
3. Click on the module to see lessons
4. Click on a lesson to watch the video

## Step 9: Test Video Lock Feature

1. Create a second lesson in your module
2. As a regular user, try to access lesson 2 directly
3. You should see: "You must complete the previous lesson before accessing this one"
4. Complete lesson 1 (watch ≥90% of video)
5. Now lesson 2 should be accessible

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:3001/health

# If not, start it:
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev
```

### Worker Not Processing

```bash
# Check if worker is running
ps aux | grep worker

# Check Redis connection
# Verify video file format
# Check worker logs for errors
```

### Migration Issues

```bash
# Check migration status
cd backend
npx prisma migrate status

# If migrations not applied:
npx prisma migrate deploy
npx prisma generate
```

### Authentication Issues

- Make sure token is in localStorage:
  ```javascript
  localStorage.getItem('vs_platform_token')
  ```
- If missing, log in again

### Video Not Processing

- Check worker logs for errors
- Verify video file format is supported
- Check Redis connection
- Verify storage mode (local vs S3) is configured correctly

### Access Denied Errors

- Verify user's category is in module's `allowedCategories`
- Check if previous lesson is completed (for video lock)
- Verify user is authenticated

## Expected Flow

1. ✅ Admin creates module
2. ✅ Admin adds lessons to module
3. ✅ Admin uploads videos for lessons
4. ✅ Worker processes videos to HLS
5. ✅ Lessons become ready for playback
6. ✅ Users access modules (category-restricted)
7. ✅ Users watch lessons in order (video lock enforced)
8. ✅ Progress tracked automatically
9. ✅ Analytics events recorded

## Next Steps

- **Create More Content**: Add more modules and lessons
- **Test Access Control**: Create users with different categories
- **Test Video Lock**: Verify sequential learning works
- **Review Analytics**: Check lesson engagement metrics
- **Read Documentation**: See detailed guides in `/docs/Initial_docs/`

## Documentation

- [Module and Lesson Structure](./MODULE_AND_LESSON_STRUCTURE.md)
- [Admin Content Management Flow](./ADMIN_CONTENT_MANAGEMENT_FLOW.md)
- [User Learning Flow](./USER_LEARNING_FLOW.md)
- [Access Control Rules](./ACCESS_CONTROL_RULES.md)
- [Testing Guide](./TESTING_GUIDE_MODULES_LESSONS.md)
- [Migration Guide](./MIGRATION_TO_MODULES.md)
