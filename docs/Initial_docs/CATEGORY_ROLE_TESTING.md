# Category Role Feature - Testing Guide

This document provides step-by-step testing instructions for the multi-category user roles and category-based video access control feature.

## Prerequisites

1. Database is running and accessible
2. Backend, frontend, and worker services are running
3. Redis is running (for worker queue)

## Test Checklist

### ✅ 1. Database Migration

**Steps:**
```bash
cd backend
pnpm prisma migrate dev
```

**Expected Result:**
- Migration runs successfully
- `CategoryRole` enum created
- `users` table has `categoryRole` and `tokenVersion` columns
- `videos` table has `categoryRole` column

**Verification:**
```bash
# Check schema
pnpm prisma studio
# Navigate to users and videos tables, verify columns exist
```

### ✅ 2. Backfill Existing Users

**Steps:**
```bash
cd backend
pnpm tsx scripts/backfillCategoryRole.ts
```

**Expected Result:**
- All existing users have `categoryRole` set (default: INTERN)
- Script reports number of users updated/skipped

**Verification:**
- Check database: all users should have `categoryRole` set
- No users should have `null` categoryRole

### ✅ 3. User Registration with Category

**Steps:**
1. Navigate to `/register`
2. Fill in registration form
3. Select category from dropdown (e.g., "Employee")
4. Submit form

**Expected Result:**
- User is created successfully
- JWT token is returned
- Decode JWT and verify it contains:
  - `categoryRole: "EMPLOYEE"`
  - `tokenVersion: 0`

**Verification:**
```javascript
// In browser console after registration
const token = localStorage.getItem('vs_platform_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload.categoryRole); // Should be "EMPLOYEE"
console.log(payload.tokenVersion); // Should be 0
```

### ✅ 4. Login Returns CategoryRole

**Steps:**
1. Navigate to `/login`
2. Login with existing user
3. Check response

**Expected Result:**
- Login successful
- Response includes `user.categoryRole`
- JWT token includes `categoryRole` and `tokenVersion`

**Verification:**
- Check network tab: response should include `categoryRole`
- Check localStorage: JWT should contain categoryRole

### ✅ 5. Video Upload Sets CategoryRole

**Steps:**
1. Login as user with category "EMPLOYEE"
2. Navigate to `/upload`
3. Upload a video
4. Check database

**Expected Result:**
- Video is uploaded successfully
- Video record in database has `categoryRole = "EMPLOYEE"` (matches user's categoryRole)
- Video status is PROCESSING

**Verification:**
```sql
-- In database
SELECT id, title, "categoryRole", status FROM videos WHERE "userId" = '<user_id>';
-- categoryRole should match user's categoryRole
```

### ✅ 6. Category-Based Video Listing

**Steps:**
1. Login as user A (category: EMPLOYEE)
2. Upload video A
3. Login as user B (category: DEALER)
4. Upload video B
5. Login as user A again
6. Navigate to `/my-videos` or call `GET /api/videos`

**Expected Result:**
- User A only sees videos with `categoryRole = "EMPLOYEE"`
- User A does NOT see videos with `categoryRole = "DEALER"`
- Video cards show category badges

**Verification:**
- Check API response: only EMPLOYEE videos returned
- Check UI: only EMPLOYEE videos displayed
- Check video cards: category badge shows "EMPLOYEE"

### ✅ 7. Category-Based Video Access (403 Forbidden)

**Steps:**
1. Login as user A (category: EMPLOYEE)
2. Upload video A
3. Login as user B (category: DEALER)
4. Attempt to access video A directly: `GET /api/videos/<video_a_id>`
5. Attempt to watch video A: Navigate to `/watch/<video_a_id>`

**Expected Result:**
- API returns `403 Forbidden` with error message
- Frontend shows user-friendly error: "You do not have access to this video. It belongs to a different category."

**Verification:**
- Check network tab: 403 status code
- Check error message in UI
- User cannot watch the video

### ✅ 8. Admin Can Access All Videos

**Steps:**
1. Login as ADMIN user
2. Navigate to `/my-videos` or call `GET /api/videos`
3. Attempt to access videos from different categories

**Expected Result:**
- Admin sees ALL videos regardless of category
- Admin can access any video by ID
- No 403 errors for admin

**Verification:**
- Check API response: all videos returned
- Check UI: all videos displayed
- Admin can watch videos from any category

### ✅ 9. Admin Category Management

**Steps:**
1. Login as ADMIN
2. Navigate to `/admin/users`
3. Find a user (e.g., user A with category EMPLOYEE)
4. Change category from dropdown (e.g., change to DEALER)
5. Confirm the change
6. Check database

**Expected Result:**
- Category updated successfully
- Success notification shown
- User's `tokenVersion` incremented
- User's existing token is invalidated

**Verification:**
```sql
-- Check user's tokenVersion incremented
SELECT id, email, "categoryRole", "tokenVersion" FROM users WHERE id = '<user_a_id>';
-- tokenVersion should be incremented
```

### ✅ 10. Token Invalidation After Category Change

**Steps:**
1. Login as user A (category: EMPLOYEE)
2. Save the JWT token
3. As ADMIN, change user A's category to DEALER
4. Use saved token to make API request: `GET /api/videos`

**Expected Result:**
- Request with old token returns `403 Forbidden`
- Error message: "Token has been invalidated. Please log in again."

**Verification:**
- Check network tab: 403 status
- Check error message
- User must log in again to get new token

### ✅ 11. Worker HLS Path Prefixing (Optional)

**Prerequisites:**
- Set `HLS_PREFIX_BY_CATEGORY=true` in worker environment

**Steps:**
1. Login as user with category "TECHNICIAN"
2. Upload a video
3. Wait for worker to process video
4. Check S3 bucket

**Expected Result:**
- Worker processes video successfully
- HLS files stored at: `hls/TECHNICIAN/{videoId}/master.m3u8`
- Database `hlsPath` reflects the category prefix

**Verification:**
```sql
-- Check hlsPath in database
SELECT id, title, "categoryRole", "hlsPath" FROM videos WHERE id = '<video_id>';
-- hlsPath should be: hls/TECHNICIAN/{videoId}/master.m3u8
```

**Note:** If `HLS_PREFIX_BY_CATEGORY=false` (default), path should be: `hls/{videoId}/master.m3u8`

### ✅ 12. Frontend Category Badges

**Steps:**
1. Login as any user
2. Navigate to `/my-videos`
3. Check video cards
4. Navigate to `/watch/<video_id>`
5. Check video info section

**Expected Result:**
- Video cards show category badge (e.g., "EMPLOYEE")
- Watch page shows category badge next to title
- Badges are styled consistently

**Verification:**
- Visual check: badges appear on all video displays
- Badge text matches video's categoryRole

### ✅ 13. Edge Cases

#### 13.1 Legacy Users Without CategoryRole

**Steps:**
1. Manually set a user's categoryRole to NULL in database (if possible)
2. Run backfill script
3. Check user record

**Expected Result:**
- Backfill script sets categoryRole to INTERN
- User can now use the system normally

#### 13.2 Direct API Bypass Attempt

**Steps:**
1. Login as user A (category: EMPLOYEE)
2. Get video ID from different category (DEALER)
3. Attempt direct API call: `GET /api/videos/<dealer_video_id>`

**Expected Result:**
- Server returns 403 Forbidden
- Client cannot bypass category filtering

**Verification:**
- Check server logs: request rejected
- Check response: 403 status

#### 13.3 Missing CategoryRole in JWT

**Steps:**
1. Manually create JWT without categoryRole (if possible)
2. Attempt to use token

**Expected Result:**
- Middleware should handle gracefully
- User may see limited functionality

## Automated Test Script

Create a test script to automate some of these tests:

```bash
# Example test script structure
./test-category-role.sh
```

## Performance Testing

1. **Load Test**: Test with 1000+ users across all categories
2. **Query Performance**: Verify category filtering doesn't impact query performance
3. **Token Validation**: Test tokenVersion check performance under load

## Security Testing

1. **SQL Injection**: Verify category filtering uses parameterized queries
2. **JWT Tampering**: Attempt to modify categoryRole in JWT token
3. **Authorization Bypass**: Attempt to access admin endpoints without admin role

## Regression Testing

After implementing this feature, verify existing functionality still works:

- ✅ User registration (without category - should default to INTERN)
- ✅ User login
- ✅ Video upload
- ✅ Video playback
- ✅ Admin video approval/rejection
- ✅ Analytics tracking
- ✅ Focus mode

## Reporting Issues

If you encounter issues during testing:

1. Check server logs for errors
2. Verify database schema is up to date
3. Check environment variables are set correctly
4. Verify Prisma client is regenerated: `pnpm prisma generate`
5. Check JWT token contains required fields

## Success Criteria

All tests should pass:
- ✅ Migration runs successfully
- ✅ Users can register with category
- ✅ Videos inherit uploader's category
- ✅ Category-based filtering works
- ✅ 403 errors shown for unauthorized access
- ✅ Admin can access all videos
- ✅ Admin can change user categories
- ✅ Token invalidation works
- ✅ Frontend displays category badges
- ✅ Worker handles categoryRole correctly

