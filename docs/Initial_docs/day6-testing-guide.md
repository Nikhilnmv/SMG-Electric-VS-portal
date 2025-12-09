# Day 6 Testing Guide - Admin Dashboard & Video Moderation

This guide provides step-by-step instructions to test all Day 6 features: Admin Dashboard, Video Moderation, User Management, and Statistics.

## Prerequisites

### 1. Apply Database Migration

First, ensure the database migration is applied:

```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform/backend"
npx prisma migrate deploy
# or for development:
npx prisma migrate dev
```

Verify the migration:
```bash
# Connect to PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Check VideoStatus enum values
SELECT enum_range(NULL::"VideoStatus");

# Should show: UPLOADED, PROCESSING, READY, APPROVED, REJECTED
```

### 2. Start All Services

```bash
# Start Docker services (if not running)
docker compose up -d postgres redis clickhouse

# Start backend (Terminal 1)
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev

# Start worker (Terminal 2 - optional, only needed if testing video upload)
pnpm --filter worker dev

# Start frontend (Terminal 3)
pnpm --filter frontend dev
```

### 3. Create Test Users

You'll need at least:
- **1 Admin user** - For testing admin features
- **1 Regular user** - For uploading videos to moderate
- **1 Editor user** (optional) - For testing editor permissions

#### Create Admin User

**Option A: Via Database (Quick)**
```bash
# Connect to PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Create admin user (password: admin123)
-- Note: You'll need to hash the password. Use the register endpoint first, then update role.
```

**Option B: Via API then Update Role**
```bash
# 1. Register a user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# 2. Get the user ID from response, then update role in database:
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Update role to ADMIN
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';

# Verify
SELECT id, email, role FROM users WHERE email = 'admin@test.com';
```

**Option C: Via Browser Console**
```javascript
// Register admin user
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@test.com',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Token:', data.data.token);
  localStorage.setItem('vs_platform_token', data.data.token);
  
  // Then update role in database (see Option B, step 2)
});
```

#### Create Regular User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123"}'
```

### 4. Create Test Videos

You need videos with different statuses for testing:

```bash
# Login as regular user to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123"}' | jq -r '.data.token')

# Upload a video (or create test videos directly in database)
# For testing, you can manually set video statuses in database:
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Get user ID
SELECT id FROM users WHERE email = 'user@test.com';

# Create test videos with different statuses
-- Replace {USER_ID} with actual user ID from above
INSERT INTO videos (id, "userId", title, description, status, "s3Key", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, '{USER_ID}', 'Video 1 - UPLOADED', 'Test video', 'UPLOADED', 'raw/test1.mp4', NOW(), NOW()),
  (gen_random_uuid()::text, '{USER_ID}', 'Video 2 - PROCESSING', 'Test video', 'PROCESSING', 'raw/test2.mp4', NOW(), NOW()),
  (gen_random_uuid()::text, '{USER_ID}', 'Video 3 - READY', 'Test video', 'READY', 'raw/test3.mp4', NOW(), NOW()),
  (gen_random_uuid()::text, '{USER_ID}', 'Video 4 - APPROVED', 'Test video', 'APPROVED', 'raw/test4.mp4', NOW(), NOW());
```

## Backend API Testing

### 1. Test Authentication & Authorization

#### Test Admin Access to Stats
```bash
# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | jq -r '.data.token')

# Test GET /api/admin/stats (should work)
curl -X GET http://localhost:3001/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

#### Test Non-Admin Access (should fail)
```bash
# Login as regular user
USER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123"}' | jq -r '.data.token')

# Test GET /api/admin/users (should return 403)
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
# Expected: {"success":false,"error":"Admin access required"}
```

### 2. Test Get Pending Videos

```bash
# Get pending videos (UPLOADED or READY status)
curl -X GET http://localhost:3001/api/admin/videos/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Video 1 - UPLOADED",
      "userId": "...",
      "uploadDate": "2024-12-08T...",
      "status": "UPLOADED",
      "hlsPath": null,
      "userEmail": "user@test.com"
    },
    {
      "id": "...",
      "title": "Video 3 - READY",
      "userId": "...",
      "uploadDate": "2024-12-08T...",
      "status": "READY",
      "hlsPath": "hls/.../master.m3u8",
      "userEmail": "user@test.com"
    }
  ]
}
```

### 3. Test Get Statistics

```bash
curl -X GET http://localhost:3001/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 2,
    "totalVideos": 4,
    "completedVideos": 1,
    "pendingApprovals": 2
  }
}
```

### 4. Test Get Users

```bash
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "email": "admin@test.com",
      "role": "ADMIN",
      "createdAt": "2024-12-08T..."
    },
    {
      "id": "...",
      "email": "user@test.com",
      "role": "USER",
      "createdAt": "2024-12-08T..."
    }
  ]
}
```

### 5. Test Approve Video

```bash
# Get a pending video ID first
VIDEO_ID=$(curl -s -X GET http://localhost:3001/api/admin/videos/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

# Approve the video
curl -X POST http://localhost:3001/api/admin/videos/$VIDEO_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "Video 3 - READY",
    "status": "APPROVED",
    ...
  },
  "message": "Video approved successfully"
}
```

**Verify in Database:**
```sql
SELECT id, title, status FROM videos WHERE id = '{VIDEO_ID}';
-- Should show status = 'APPROVED'
```

### 6. Test Reject Video

```bash
# Get another pending video ID
VIDEO_ID=$(curl -s -X GET http://localhost:3001/api/admin/videos/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

# Reject without deleting from S3
curl -X POST http://localhost:3001/api/admin/videos/$VIDEO_ID/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteFromStorage": false}' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "Video 1 - UPLOADED",
    "status": "REJECTED",
    ...
  },
  "message": "Video rejected successfully"
}
```

**Test Reject with S3 Deletion:**
```bash
# Reject and delete from S3 (if S3 is configured)
curl -X POST http://localhost:3001/api/admin/videos/$VIDEO_ID/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteFromStorage": true}' | jq '.'
```

**Verify in Database:**
```sql
SELECT id, title, status FROM videos WHERE id = '{VIDEO_ID}';
-- Should show status = 'REJECTED'
```

### 7. Test Error Cases

#### Test Approve Already Approved Video
```bash
# Try to approve an already approved video (should fail)
curl -X POST http://localhost:3001/api/admin/videos/{APPROVED_VIDEO_ID}/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
# Expected: Error message about invalid status
```

#### Test Approve Non-Existent Video
```bash
curl -X POST http://localhost:3001/api/admin/videos/non-existent-id/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
# Expected: {"success":false,"error":"Video not found"}
```

#### Test Without Authentication
```bash
curl -X GET http://localhost:3001/api/admin/stats | jq '.'
# Expected: {"success":false,"error":"No token provided"}
```

## Frontend Testing

### 1. Test Admin Dashboard Access

#### Test Admin User Access
1. **Login as Admin:**
   - Go to http://localhost:3000/login
   - Login with `admin@test.com` / `admin123`
   - Or set token in browser console:
     ```javascript
     // First login to get token
     fetch('http://localhost:3001/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         email: 'admin@test.com',
         password: 'admin123'
       })
     })
     .then(r => r.json())
     .then(data => {
       localStorage.setItem('vs_platform_token', data.data.token);
       window.location.href = '/admin';
     });
     ```

2. **Navigate to Admin Panel:**
   - Click "Admin Panel" in sidebar (should be visible)
   - Or go directly to http://localhost:3000/admin
   - Should load successfully

#### Test Non-Admin User Access
1. **Login as Regular User:**
   ```javascript
   fetch('http://localhost:3001/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'user@test.com',
       password: 'user123'
     })
   })
   .then(r => r.json())
   .then(data => {
     localStorage.setItem('vs_platform_token', data.data.token);
     window.location.href = '/admin';
   });
   ```

2. **Try to Access Admin Panel:**
   - Should be redirected to homepage (`/`)
   - "Admin Panel" link should NOT be visible in sidebar

### 2. Test Statistics Cards

1. **View Dashboard:**
   - Go to http://localhost:3000/admin (as admin)
   - Check that 4 stat cards are displayed:
     - Total Users
     - Total Videos
     - Pending Approvals
     - Completed Videos

2. **Verify Numbers:**
   - Numbers should match database counts
   - Check browser console for any errors

### 3. Test Pending Videos Table

1. **View Pending Videos Tab:**
   - Should be the default tab
   - Table should display pending videos

2. **Check Table Columns:**
   - Thumbnail (placeholder icon)
   - Title
   - Status (color-coded badge)
   - Uploaded By (user email)
   - Upload Date (formatted)
   - Actions (View, Approve, Reject buttons)

3. **Test Status Badges:**
   - UPLOADED → Yellow badge
   - PROCESSING → Blue badge
   - READY → Teal badge
   - APPROVED → Green badge (shouldn't appear in pending)
   - REJECTED → Red badge (shouldn't appear in pending)

4. **Test Approve Action:**
   - Click "Approve" button on a video
   - Video should disappear from table immediately (optimistic update)
   - Stats should update (Pending Approvals decreases, Completed Videos increases)
   - Check browser console for success/error messages

5. **Test Reject Action:**
   - Click "Reject" button on a video
   - Confirmation dialog should appear
   - Click "OK" to confirm
   - Optional: Second dialog for S3 deletion
   - Video should disappear from table
   - Stats should update

6. **Test View Action:**
   - Click "View" button (if video has hlsPath)
   - Should open `/watch/{videoId}` in new tab
   - Video should play (if HLS is configured)

7. **Test Empty State:**
   - If no pending videos, should show:
     - Video icon
     - "No videos pending review" message

### 4. Test User Management Table

1. **Switch to Users Tab:**
   - Click "Users" tab
   - Table should display all users

2. **Check Table Columns:**
   - Email
   - Role (color-coded badge)
   - Joined At (formatted date)

3. **Verify User Data:**
   - All users should be listed
   - Roles should display correctly (ADMIN, USER, EDITOR)
   - Dates should be formatted properly

4. **Test Empty State:**
   - If no users, should show:
     - Users icon
     - "No users found" message

### 5. Test Loading States

1. **Initial Load:**
   - Page should show spinner while loading
   - Then display content

2. **Action Loading:**
   - When clicking Approve/Reject:
     - Button should show loading state
     - Button should be disabled
     - Other buttons should still work

### 6. Test Error Handling

1. **Network Error:**
   - Disconnect internet or stop backend
   - Try to load admin page
   - Should show error message at top

2. **API Error:**
   - Check browser console for API errors
   - Error messages should be user-friendly

## Database Verification

### Check Video Statuses

```sql
-- Connect to database
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

-- View all videos with statuses
SELECT id, title, status, "createdAt" 
FROM videos 
ORDER BY "createdAt" DESC;

-- Count videos by status
SELECT status, COUNT(*) 
FROM videos 
GROUP BY status;

-- Check pending videos (UPLOADED or READY)
SELECT id, title, status, "userId"
FROM videos
WHERE status IN ('UPLOADED', 'READY')
ORDER BY "createdAt" DESC;
```

### Check User Roles

```sql
-- View all users with roles
SELECT id, email, role, "createdAt"
FROM users
ORDER BY "createdAt" DESC;

-- Count users by role
SELECT role, COUNT(*)
FROM users
GROUP BY role;
```

### Verify Statistics

```sql
-- Total users
SELECT COUNT(*) as total_users FROM users;

-- Total videos
SELECT COUNT(*) as total_videos FROM videos;

-- Completed videos (READY or APPROVED)
SELECT COUNT(*) as completed_videos 
FROM videos 
WHERE status IN ('READY', 'APPROVED');

-- Pending approvals (UPLOADED or PROCESSING)
SELECT COUNT(*) as pending_approvals 
FROM videos 
WHERE status IN ('UPLOADED', 'PROCESSING');
```

## Complete Test Scenario

### End-to-End Test Flow

1. **Setup:**
   ```bash
   # Apply migration
   cd backend && npx prisma migrate deploy
   
   # Create admin user (see Prerequisites)
   # Create regular user
   # Create test videos with different statuses
   ```

2. **Backend API Tests:**
   ```bash
   # Test all endpoints (see Backend API Testing section)
   # Verify responses match expected format
   # Test error cases
   ```

3. **Frontend Tests:**
   - Login as admin
   - Navigate to admin dashboard
   - Verify stats cards
   - Test pending videos table
   - Approve a video
   - Reject a video
   - Switch to users tab
   - Verify user list

4. **Access Control Tests:**
   - Login as regular user
   - Try to access /admin (should redirect)
   - Verify admin link not in sidebar

5. **Database Verification:**
   - Check video statuses changed correctly
   - Verify statistics match database counts

## Troubleshooting

### Migration Not Applied

**Error:** `REJECTED` status not found

**Solution:**
```bash
cd backend
npx prisma migrate deploy
# or
npx prisma migrate dev
```

### Admin User Not Working

**Error:** Can't access admin routes

**Solution:**
```sql
-- Verify user role
SELECT email, role FROM users WHERE email = 'admin@test.com';

-- Update to ADMIN if needed
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';
```

### No Pending Videos Showing

**Check:**
```sql
-- Verify videos exist with UPLOADED or READY status
SELECT id, title, status FROM videos WHERE status IN ('UPLOADED', 'READY');
```

**Create test videos if needed:**
```sql
-- Get user ID
SELECT id FROM users WHERE email = 'user@test.com';

-- Create test video (replace {USER_ID})
INSERT INTO videos (id, "userId", title, status, "s3Key", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, '{USER_ID}', 'Test Video', 'UPLOADED', 'raw/test.mp4', NOW(), NOW());
```

### Frontend Not Loading Data

**Check:**
1. Backend is running: `curl http://localhost:3001/health`
2. Token is valid: Check browser console for 401/403 errors
3. API URL is correct: Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`

**Debug:**
```javascript
// In browser console
fetch('http://localhost:3001/api/admin/stats', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('vs_platform_token')}`
  }
})
.then(r => r.json())
.then(console.log);
```

### S3 Deletion Not Working

**Note:** S3 deletion requires AWS credentials configured. If not configured, rejection will still work but won't delete files.

**Check AWS Configuration:**
```bash
# Check backend .env
grep AWS backend/.env
```

**Test S3 Connection:**
```bash
# In backend directory
node -e "
const { S3Client } = require('@aws-sdk/client-s3');
const client = new S3Client({ region: process.env.AWS_REGION });
console.log('S3 client created');
"
```

## Quick Test Checklist

- [ ] Migration applied successfully
- [ ] Admin user created and can login
- [ ] Test videos created with different statuses
- [ ] Backend API endpoints return correct data
- [ ] Admin dashboard loads for admin user
- [ ] Non-admin user redirected from /admin
- [ ] Stats cards display correct numbers
- [ ] Pending videos table displays correctly
- [ ] Approve button works and updates UI
- [ ] Reject button works with confirmation
- [ ] View button opens video in new tab
- [ ] User list displays correctly
- [ ] Status badges show correct colors
- [ ] Loading states work correctly
- [ ] Error messages display properly
- [ ] Database reflects status changes

## Next Steps

After successful testing:
1. Test with real video uploads
2. Test with multiple users and videos
3. Test edge cases (bulk operations, etc.)
4. Performance testing with large datasets
5. Integration testing with full workflow

---

**Tip:** Keep this guide open while testing and check off items as you complete them! ✅

