# Testing Guide: Modules & Lessons System

## Prerequisites

✅ **Database migrations applied**
✅ **Prisma clients generated**
✅ **All services running** (backend, worker, frontend)

## Test Environment Setup

### 1. Verify Services Are Running

```bash
# Check backend
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000

# Check worker (should be running in terminal)
# Look for: "Worker service started"
```

### 2. Verify Database Schema

```bash
cd backend
npx prisma studio
# Open http://localhost:5555
# Verify you see: modules, lessons, user_lesson_progress tables
```

### 3. Create Test Users

You'll need:
- **1 Admin user** (for content creation)
- **2 Regular users** with different categories (for access control testing)

**Using Admin Panel:**
1. Log in as admin
2. Go to `/admin/users`
3. Create users:
   - User 1: `dealer@test.com`, Category: `DEALER`
   - User 2: `employee@test.com`, Category: `EMPLOYEE`

---

## Test Suite 1: Admin Module Management

### Test 1.1: Create Module

**Steps:**
1. Log in as admin
2. Navigate to `/admin/modules` (or use API directly)
3. Create a new module

**API Test:**
```bash
curl -X POST http://localhost:3001/api/admin/modules \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Module - Electrical Safety",
    "description": "Introduction to electrical safety protocols",
    "allowedCategories": ["DEALER", "EMPLOYEE"]
  }'
```

**Expected Result:**
- ✅ Status 201 Created
- ✅ Response includes module ID
- ✅ Module appears in admin module list

**Verify:**
- Check database: `SELECT * FROM modules WHERE title = 'Test Module - Electrical Safety';`
- Module should have `allowedCategories` = `['DEALER', 'EMPLOYEE']`

---

### Test 1.2: List All Modules (Admin)

**API Test:**
```bash
curl http://localhost:3001/api/admin/modules \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Returns array of all modules (regardless of categories)
- ✅ Each module includes lesson count

---

### Test 1.3: Update Module

**API Test:**
```bash
curl -X PATCH http://localhost:3001/api/admin/modules/MODULE_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Module Title",
    "allowedCategories": ["DEALER", "EMPLOYEE", "TECHNICIAN"]
  }'
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Module title updated
- ✅ Categories updated

---

### Test 1.4: Delete Module

**API Test:**
```bash
curl -X DELETE http://localhost:3001/api/admin/modules/MODULE_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Module deleted from database
- ✅ All associated lessons cascade deleted

---

## Test Suite 2: Admin Lesson Management

### Test 2.1: Create Lesson

**API Test:**
```bash
curl -X POST http://localhost:3001/api/admin/modules/MODULE_ID/lessons \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lesson 1: Basic Safety Rules",
    "description": "Understanding fundamental safety protocols",
    "order": 0
  }'
```

**Expected Result:**
- ✅ Status 201 Created
- ✅ Lesson created with correct `moduleId`
- ✅ Order set correctly

**Verify:**
- Check database: `SELECT * FROM lessons WHERE moduleId = 'MODULE_ID';`
- Lesson should have `status` = `'UPLOADED'`

---

### Test 2.2: Upload Video for Lesson

**API Test:**
```bash
curl -X POST http://localhost:3001/api/admin/lessons/LESSON_ID/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "video=@/path/to/test-video.mp4" \
  -F "thumbnail=@/path/to/thumbnail.jpg"
```

**Expected Result:**
- ✅ Status 201 Created
- ✅ Video file saved
- ✅ Processing job enqueued
- ✅ Lesson status changes to `PROCESSING` then `READY`

**Verify Worker Processing:**
```bash
# Check worker logs - should see:
# "Starting lesson processing for lesson LESSON_ID"
# "Transcoding completed"
# "Lesson processing completed successfully"
```

**Verify Database:**
```sql
SELECT id, title, status, "hlsMaster" FROM lessons WHERE id = 'LESSON_ID';
-- Status should be 'READY'
-- hlsMaster should be set
```

**Verify HLS Files:**
```bash
# Local storage
ls -la backend/uploads/hls/LESSON_ID/

# Should see:
# - master.m3u8
# - Various .ts segment files
```

---

### Test 2.3: Update Lesson

**API Test:**
```bash
curl -X PATCH http://localhost:3001/api/admin/lessons/LESSON_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Lesson Title",
    "order": 1
  }'
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Lesson updated

---

### Test 2.4: Create Multiple Lessons in Order

**Steps:**
1. Create Lesson 1 (order: 0)
2. Create Lesson 2 (order: 1)
3. Create Lesson 3 (order: 2)

**Verify:**
- Lessons appear in correct order when fetching module
- Order field increments correctly

---

## Test Suite 3: User Module Access

### Test 3.1: List Modules (User - Category Restricted)

**Setup:**
- Create module with `allowedCategories: ["DEALER"]`
- Log in as DEALER user

**API Test:**
```bash
curl http://localhost:3001/api/modules \
  -H "Authorization: Bearer DEALER_USER_TOKEN"
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Returns only modules where user's category is in `allowedCategories`
- ✅ Includes user progress for each module

**Test with Different Category:**
- Log in as EMPLOYEE user
- Same module should NOT appear (if not in allowedCategories)

---

### Test 3.2: Get Module Details (User)

**API Test:**
```bash
curl http://localhost:3001/api/modules/MODULE_ID \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Returns module with lessons
- ✅ Includes user progress for each lesson
- ✅ Only shows lessons with status = 'READY'

**Test Access Denied:**
- Try accessing module with category not in `allowedCategories`
- Expected: Status 403 Forbidden

---

## Test Suite 4: User Lesson Access & Video Lock

### Test 4.1: Access First Lesson (Should Work)

**API Test:**
```bash
curl http://localhost:3001/api/lessons/LESSON_1_ID \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Lesson details returned
- ✅ No access restrictions (first lesson)

---

### Test 4.2: Access Second Lesson Without Completing First (Should Fail)

**Setup:**
1. Create module with 2 lessons
2. Upload videos for both
3. Log in as user
4. Try to access lesson 2 directly

**API Test:**
```bash
curl http://localhost:3001/api/lessons/LESSON_2_ID \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Result:**
- ✅ Status 403 Forbidden
- ✅ Error message: "You must complete the previous lesson before accessing this one"
- ✅ Response includes `requiredLessonId` and `requiredLessonTitle`

---

### Test 4.3: Complete First Lesson, Then Access Second

**Steps:**
1. Access lesson 1
2. Watch video (or simulate completion)
3. Update progress to completed:

```bash
curl -X POST http://localhost:3001/api/lessons/LESSON_1_ID/progress \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 100,
    "completed": true
  }'
```

4. Try accessing lesson 2 again

**Expected Result:**
- ✅ Status 200 OK
- ✅ Lesson 2 accessible
- ✅ Video lock bypassed

---

### Test 4.4: Get Stream URL

**API Test:**
```bash
curl http://localhost:3001/api/lessons/LESSON_ID/stream \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Returns HLS URL
- ✅ URL is accessible and playable

**Verify HLS Playback:**
- Copy `hlsUrl` from response
- Test in browser or VLC player
- Should play video correctly

---

## Test Suite 5: Progress Tracking

### Test 5.1: Update Lesson Progress

**API Test:**
```bash
curl -X POST http://localhost:3001/api/lessons/LESSON_ID/progress \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 50,
    "completed": false
  }'
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Progress saved in database

**Verify Database:**
```sql
SELECT * FROM user_lesson_progress 
WHERE "userId" = 'USER_ID' AND "lessonId" = 'LESSON_ID';
-- Should show progress = 50, completed = false
```

---

### Test 5.2: Mark Lesson as Completed

**API Test:**
```bash
curl -X POST http://localhost:3001/api/lessons/LESSON_ID/progress \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 100,
    "completed": true
  }'
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ `completed` = true in database
- ✅ Next lesson becomes accessible

---

### Test 5.3: Module Progress Calculation

**Steps:**
1. Create module with 3 lessons
2. Complete 2 out of 3 lessons
3. Fetch module details

**Expected Result:**
- ✅ `userProgress.progressPercentage` = 66% (2/3)
- ✅ `userProgress.completedLessons` = 2
- ✅ `userProgress.totalLessons` = 3

---

## Test Suite 6: Analytics Integration

### Test 6.1: Track Lesson Event

**API Test:**
```bash
curl -X POST http://localhost:3001/api/analytics/event \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "LESSON_ID",
    "eventType": "PLAY",
    "currentTime": 0,
    "duration": 120
  }'
```

**Expected Result:**
- ✅ Status 200 OK
- ✅ Event saved to ClickHouse
- ✅ Event saved to PostgreSQL

**Verify Database:**
```sql
SELECT * FROM analytics_events 
WHERE "lessonId" = 'LESSON_ID' AND "eventType" = 'PLAY';
-- Should have record
```

---

### Test 6.2: Track Multiple Events

Track: PLAY, PAUSE, PROGRESS, COMPLETE

**Expected Result:**
- ✅ All events tracked
- ✅ Progress events update periodically
- ✅ COMPLETE event marks lesson as completed

---

## Test Suite 7: Frontend UI Testing

### Test 7.1: Modules Page

**Steps:**
1. Log in as regular user
2. Navigate to `/modules`

**Expected:**
- ✅ Page loads without errors
- ✅ Shows modules accessible to user's category
- ✅ Shows progress bars for each module
- ✅ Clicking module navigates to module detail page

---

### Test 7.2: Module Detail Page

**Steps:**
1. Navigate to `/modules/MODULE_ID`

**Expected:**
- ✅ Shows module title and description
- ✅ Shows overall progress bar
- ✅ Lists all lessons in order
- ✅ Shows completion status for each lesson
- ✅ Locked lessons are visually indicated
- ✅ Clicking unlocked lesson navigates to lesson player

---

### Test 7.3: Lesson Player Page

**Steps:**
1. Navigate to `/lesson/LESSON_ID`

**Expected:**
- ✅ Video player loads
- ✅ HLS video plays correctly
- ✅ Progress updates automatically
- ✅ Completion status updates when ≥90% watched
- ✅ Back button returns to module

**Test Video Lock:**
- Try to access locked lesson directly via URL
- Should show error message
- Should redirect or show access denied

---

### Test 7.4: Admin Module Management UI

**Steps:**
1. Log in as admin
2. Navigate to `/admin/modules`

**Expected:**
- ✅ Shows list of all modules
- ✅ Can create new module
- ✅ Can edit existing modules
- ✅ Can delete modules
- ✅ Can add lessons to modules
- ✅ Can upload videos for lessons

---

## Test Suite 8: Edge Cases & Error Handling

### Test 8.1: Access Module with Empty Categories

**Setup:**
- Create module with `allowedCategories: []`

**Expected:**
- ✅ All users can access (empty array = accessible to all)

---

### Test 8.2: Access Lesson Not Ready

**Setup:**
- Create lesson but don't upload video (status = UPLOADED)

**Expected:**
- ✅ User cannot access lesson
- ✅ Error: "Lesson is not ready for viewing"

---

### Test 8.3: Admin Bypass

**Setup:**
- Admin tries to access locked lesson

**Expected:**
- ✅ Admin can access any lesson regardless of completion status
- ✅ Admin can access any module regardless of categories

---

### Test 8.4: Invalid IDs

**API Test:**
```bash
curl http://localhost:3001/api/modules/invalid-id \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected:**
- ✅ Status 404 Not Found
- ✅ Clear error message

---

## Test Suite 9: Performance & Scalability

### Test 9.1: Multiple Lessons in Module

**Setup:**
- Create module with 10+ lessons

**Expected:**
- ✅ All lessons load correctly
- ✅ Order maintained
- ✅ Progress calculated correctly

---

### Test 9.2: Concurrent Video Processing

**Setup:**
- Upload multiple lesson videos simultaneously

**Expected:**
- ✅ All videos process correctly
- ✅ Worker handles concurrent jobs
- ✅ No race conditions

---

## Test Checklist Summary

### Admin Features
- [ ] Create module
- [ ] List all modules
- [ ] Update module
- [ ] Delete module
- [ ] Create lesson
- [ ] Upload video for lesson
- [ ] Update lesson
- [ ] Delete lesson
- [ ] Video processing completes successfully

### User Features
- [ ] View modules (category-restricted)
- [ ] View module details
- [ ] Access lessons
- [ ] Video lock prevents skipping
- [ ] Progress tracking works
- [ ] Lesson completion unlocks next lesson
- [ ] Stream URL works

### Analytics
- [ ] Lesson events tracked
- [ ] Progress events saved
- [ ] Completion events recorded

### Frontend
- [ ] Modules page loads
- [ ] Module detail page works
- [ ] Lesson player works
- [ ] Admin UI functional
- [ ] Navigation updated correctly

### Edge Cases
- [ ] Empty categories = accessible to all
- [ ] Admin bypass works
- [ ] Error handling correct
- [ ] Invalid IDs handled

---

## Troubleshooting

### Migration Issues

```bash
# Check migration status
cd backend
npx prisma migrate status

# Reset if needed (WARNING: Deletes data)
npx prisma migrate reset
```

### Worker Not Processing

```bash
# Check worker logs
# Verify Redis connection
# Check video file format
```

### Access Denied Errors

- Verify user's category is in module's `allowedCategories`
- Check if previous lesson is completed (for video lock)
- Verify user is authenticated

### Video Not Playing

- Check lesson status is `READY`
- Verify HLS files exist
- Check CORS settings
- Verify storage mode (local vs S3)

---

## Success Criteria

✅ All admin operations work correctly
✅ Category-based access control enforced
✅ Video lock feature prevents skipping
✅ Progress tracking accurate
✅ Analytics events recorded
✅ Frontend UI functional
✅ No console errors
✅ Database integrity maintained

---

## Next Steps After Testing

1. **Fix any issues** found during testing
2. **Document** any platform-specific configurations
3. **Train** admin users on content creation
4. **Monitor** production usage
5. **Gather feedback** from users

---

## Support

For issues during testing:
1. Check logs (backend, worker, frontend)
2. Verify database state
3. Check API responses
4. Review error messages
5. Consult documentation files

