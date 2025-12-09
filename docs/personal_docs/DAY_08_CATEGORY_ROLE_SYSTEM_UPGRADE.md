# Day 8: Category Role System Upgrade

**Date**: Day 8  
**Focus**: Multi-category user roles, category-based video access control, token versioning

---

## Overview

Day 8 implemented a comprehensive category-based access control system. Users are assigned to categories (DEALER, EMPLOYEE, TECHNICIAN, STAKEHOLDER, INTERN, VENDOR), and videos are filtered by category. This enables secure, segmented video sharing within the platform.

---

## Database Schema Changes

### New Enum: CategoryRole

**File**: `backend/prisma/schema.prisma`

```prisma
enum CategoryRole {
  DEALER
  EMPLOYEE
  TECHNICIAN
  STAKEHOLDER
  INTERN
  VENDOR
}
```

### User Model Updates

- Added `categoryRole CategoryRole @default(INTERN)`
- Added `tokenVersion Int @default(0)` for token invalidation

### Video Model Updates

- Added `categoryRole CategoryRole` (required, set from uploader's categoryRole)

### Migration

**File**: `backend/prisma/migrations/20251209120000_add_category_role_and_token_version/migration.sql`

---

## Backend Implementation

### Authentication Updates

**File**: `backend/src/controllers/authController.ts`

**Changes**:
- `register()`: Accepts and validates `categoryRole`
- `register()`: Includes `categoryRole` and `tokenVersion` in JWT
- `login()`: Includes `categoryRole` and `tokenVersion` in JWT

### Video Controller Updates

**File**: `backend/src/controllers/videoController.ts`

**Changes**:
- `list()`: Filters videos by `categoryRole` (unless admin)
- `getById()`: Enforces category-based access control
- Returns 403 Forbidden for unauthorized category access

**Access Rules**:
- Users can view: own videos (always), same-category videos (if approved)
- Admins can view: all videos

### Admin Controller Updates

**File**: `backend/src/controllers/adminController.ts`

**New Endpoint**: `updateUserCategory()`
- Updates user's categoryRole
- Increments tokenVersion (invalidates existing tokens)
- User must re-login after category change

### Middleware Updates

**File**: `backend/src/middleware/auth.ts`

**Changes**:
- `requireAuth()`: Now async
- Added tokenVersion validation against database
- Returns 403 if tokenVersion doesn't match

### Video Service Updates

**File**: `backend/src/services/videoService.ts`

**Changes**:
- `registerUploadedVideo()`: Fetches user's categoryRole
- Sets video's categoryRole from user's categoryRole (server-side)

---

## Frontend Implementation

### Registration Page

**File**: `frontend/src/app/register/page.tsx`

**Changes**:
- Added category dropdown with 6 options
- Added category validation
- Sends `categoryRole` in registration request

### Admin Users Page

**File**: `frontend/src/app/admin/users/page.tsx`

**Changes**:
- Added "Category" column to user table
- Added category dropdown per user row
- Added `handleCategoryChange()` function
- Category change API call

### Watch Page

**File**: `frontend/src/app/watch/[videoId]/page.tsx`

**Changes**:
- Added 403 error handling with user-friendly message
- Added category badge display next to video title

### My Videos Page

**File**: `frontend/src/app/my-videos/page.tsx`

**Changes**:
- Added category badge to video cards

### Auth Utilities

**File**: `frontend/src/lib/auth.ts`

**Added**: `getUserCategoryRole()` function

### Types Updates

**File**: `packages/types/src/index.ts`

**Changes**:
- Added `CategoryRole` type export
- Updated `User` interface to include `categoryRole`
- Updated `JWTPayload` interface to include `categoryRole` and `tokenVersion`
- Updated `Video` interface to include `categoryRole`

---

## Worker Updates

**File**: `worker/src/queue/videoProcessing.ts`

**Changes**:
- Added categoryRole retrieval from database
- Implements optional HLS path prefixing by category
- Uses `HLS_PREFIX_BY_CATEGORY` environment variable

---

## Backfill Script

**File**: `backend/scripts/backfillCategoryRole.ts`

**Purpose**: Backfills categoryRole for existing users
- Sets default INTERN for users without categoryRole

**Usage**:
```bash
cd backend
pnpm tsx scripts/backfillCategoryRole.ts
```

---

## Environment Variables

### Backend
```env
ENFORCE_CATEGORY_ACCESS=true  # Enable/disable category-based access control
HLS_PREFIX_BY_CATEGORY=false  # Enable HLS path prefixing by category
```

---

## Breaking Changes

1. **Video Listing Requires Authentication**:
   - `GET /api/videos` now requires authentication
   - Previously public, now protected

2. **Video Access Requires Authentication**:
   - `GET /api/videos/:id` now requires authentication
   - Previously public, now protected

3. **JWT Token Structure**:
   - JWT now includes `categoryRole` and `tokenVersion`
   - Old tokens without these fields may not work correctly

4. **User Registration**:
   - Registration form now requires category selection
   - API accepts optional `categoryRole` (defaults to INTERN)

---

## Testing

### Test Scenarios

1. **Category Access Control**:
   - User in DEALER category can only see DEALER videos
   - User can always see their own videos
   - Admin can see all videos

2. **Category Change**:
   - Admin changes user category
   - User's existing token becomes invalid
   - User must re-login

3. **Video Upload**:
   - Video inherits uploader's category
   - Video only visible to same category users

---

## Files Created/Modified

### Created
- `backend/prisma/migrations/20251209120000_add_category_role_and_token_version/migration.sql`
- `backend/scripts/backfillCategoryRole.ts`

### Modified
- `backend/prisma/schema.prisma`
- `worker/prisma/schema.prisma`
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/videoController.ts`
- `backend/src/controllers/adminController.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/services/videoService.ts`
- `backend/src/routes/videos.ts`
- `backend/src/routes/admin.ts`
- `worker/src/queue/videoProcessing.ts`
- `worker/src/utils/database.ts`
- `packages/types/src/index.ts`
- `frontend/src/lib/auth.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/app/register/page.tsx`
- `frontend/src/app/admin/users/page.tsx`
- `frontend/src/app/watch/[videoId]/page.tsx`
- `frontend/src/app/my-videos/page.tsx`
- `frontend/src/lib/api.ts`

---

## Key Decisions

1. **Category-Based Access**: Users can only view videos from their category
2. **Token Versioning**: Invalidates tokens when category changes for security
3. **Server-Side Assignment**: Video category assigned server-side from user's category
4. **Admin Override**: Admins bypass category restrictions

---

## Next Steps

After Day 8, the following were planned:
- Reliability and security enhancements
- Terraform infrastructure blueprint
- Performance optimizations

---

**Previous**: [Day 7: Analytics Implementation](./DAY_07_ANALYTICS_IMPLEMENTATION.md)  
**Next**: [Day 9: Reliability and Security](./DAY_09_RELIABILITY_AND_SECURITY.md)

**Reference**: `docs/day8-CATEGORY_ROLE_IMPLEMENTATION_SUMMARY.md`, `docs/USER_CATEGORY_FEATURE.md`, `docs/CATEGORY_ROLE_TESTING.md`

