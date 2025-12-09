# User Category Role Feature

## Overview

This document describes the multi-category user roles and category-based video access control feature implemented across the video streaming platform. This feature allows the platform to segment users and videos by category roles, ensuring that users can only access videos from their own category (unless they are administrators).

## Feature Summary

The platform now supports:
- **Category Roles**: DEALER, EMPLOYEE, TECHNICIAN, STAKEHOLDER, INTERN, VENDOR
- **Category-based Access Control**: Users can only view videos from their own category
- **Admin Override**: Administrators can view all videos regardless of category
- **Token Versioning**: Token invalidation when user category is changed
- **Admin Management**: Admins can manage user categories via the admin panel

## Database Schema Changes

### New Enum: CategoryRole

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

## API Changes

### Authentication Endpoints

#### POST /api/auth/register

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "categoryRole": "EMPLOYEE"  // Optional, defaults to INTERN
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "role": "USER",
      "categoryRole": "EMPLOYEE",
      "createdAt": "..."
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/login

**Response now includes categoryRole:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "role": "USER",
      "categoryRole": "EMPLOYEE",
      "createdAt": "..."
    },
    "token": "jwt_token_here"
  }
}
```

**JWT Payload:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "role": "USER",
  "categoryRole": "EMPLOYEE",
  "tokenVersion": 0,
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Video Endpoints

#### GET /api/videos

**Behavior:**
- **Admin users**: Returns all approved videos
- **Regular users**: Returns only videos matching their categoryRole
- Requires authentication

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Video Title",
      "categoryRole": "EMPLOYEE",
      "status": "APPROVED",
      ...
    }
  ]
}
```

#### GET /api/videos/:id

**Behavior:**
- **Admin users**: Can access any video
- **Regular users**: Can only access videos matching their categoryRole
- Returns `403 Forbidden` if user tries to access video from different category

**Error Response (403):**
```json
{
  "success": false,
  "error": "You do not have access to this video. It belongs to a different category."
}
```

### Admin Endpoints

#### PATCH /api/admin/users/:id/category

**Request Body:**
```json
{
  "categoryRole": "DEALER"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "role": "USER",
    "categoryRole": "DEALER",
    "tokenVersion": 1,
    "createdAt": "..."
  },
  "message": "User category updated from EMPLOYEE to DEALER. User will need to log in again."
}
```

**Behavior:**
- Updates user's categoryRole
- Increments tokenVersion (invalidates existing tokens)
- User must log in again to get new token

#### GET /api/admin/users

**Response now includes categoryRole:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "email": "user@example.com",
      "role": "USER",
      "categoryRole": "EMPLOYEE",
      "createdAt": "..."
    }
  ]
}
```

## Frontend Changes

### Registration Page

- Added category dropdown with options:
  - Dealer
  - Employee
  - Technician
  - Stakeholder
  - Intern (default)
  - Vendor
- Category selection is required

### Admin Panel - User Management

- Added "Category" column to user table
- Dropdown per user to change category
- Shows current category for each user
- Updates category via `PATCH /api/admin/users/:id/category`

### Video Pages

- **Video Cards**: Display category badge
- **Watch Page**: Shows category badge and handles 403 errors gracefully
- **My Videos**: Shows category badges on video cards

### Auth Context

- `useAuth()` hook now includes `categoryRole` in state
- `getUserCategoryRole()` function available in auth lib

## Worker Changes

### HLS Path Prefixing (Optional)

If `HLS_PREFIX_BY_CATEGORY=true` is set in environment:

- HLS files are stored under: `hls/{categoryRole}/{videoId}/`
- Default behavior: `hls/{videoId}/`

**Environment Variable:**
```bash
HLS_PREFIX_BY_CATEGORY=false  # Default: false
```

## Environment Variables

### Backend

```bash
# Category access control (default: true)
ENFORCE_CATEGORY_ACCESS=true

# HLS path prefixing by category (default: false)
HLS_PREFIX_BY_CATEGORY=false
```

## Migration & Deployment

### Running Migrations

```bash
# Backend
cd backend
pnpm prisma migrate dev

# Worker (if using separate Prisma client)
cd worker
pnpm prisma migrate dev
```

### Backfilling Existing Users

After migration, run the backfill script to ensure all users have categoryRole:

```bash
cd backend
pnpm tsx scripts/backfillCategoryRole.ts
```

This script:
- Sets `categoryRole` to `INTERN` for any users without it
- Reports users that were updated
- Lists any users still without categoryRole (should be 0)

### Migration Rollback

If you need to rollback the migration:

```sql
-- Remove columns
ALTER TABLE "videos" DROP COLUMN "categoryRole";
ALTER TABLE "users" DROP COLUMN "tokenVersion";
ALTER TABLE "users" DROP COLUMN "categoryRole";

-- Drop enum
DROP TYPE "CategoryRole";
```

**Note:** This will cause data loss. Only use in development.

## Testing Guide

### 1. Migration Testing

```bash
# Run migration
cd backend
pnpm prisma migrate dev

# Verify schema
pnpm prisma studio  # Check users and videos tables
```

### 2. Registration & Login Testing

1. Register six users, each with a different category
2. Verify JWT contains `categoryRole` and `tokenVersion`
3. Login and verify response includes `categoryRole`

### 3. Upload Testing

1. Login as user with category "EMPLOYEE"
2. Upload a video
3. Verify video record has `categoryRole = "EMPLOYEE"` (from user's categoryRole)

### 4. Access Control Testing

1. Login as user A (category: EMPLOYEE)
2. Upload video as user A
3. Login as user B (category: DEALER)
4. Attempt to list videos → Should only see DEALER videos
5. Attempt to access user A's video → Should get 403 Forbidden
6. Login as ADMIN
7. Should see all videos regardless of category

### 5. Admin Category Management Testing

1. Login as ADMIN
2. Go to Admin → User Management
3. Change user A's category from EMPLOYEE to DEALER
4. Verify:
   - User A's tokenVersion incremented
   - User A's existing token is invalidated
   - User A must log in again
   - User A now sees DEALER videos only

### 6. Worker Testing

1. Upload video as user with category "TECHNICIAN"
2. Verify worker processes video
3. If `HLS_PREFIX_BY_CATEGORY=true`, verify S3 path: `hls/TECHNICIAN/{videoId}/`
4. If `HLS_PREFIX_BY_CATEGORY=false`, verify S3 path: `hls/{videoId}/`

### 7. Edge Cases

- **Legacy users without categoryRole**: Backfill script should set to INTERN
- **Direct API calls**: Verify category filtering cannot be bypassed
- **Token expiration**: Verify tokenVersion check works correctly

## Security Considerations

1. **Server-side Enforcement**: All category filtering happens server-side. Client cannot bypass.
2. **Token Versioning**: When admin changes user category, tokenVersion increments, invalidating existing tokens.
3. **JWT Validation**: Middleware checks tokenVersion against database on each request.
4. **Admin Override**: Only ADMIN role can view all videos and change user categories.

## Troubleshooting

### Issue: Users can't see any videos

**Solution:**
- Check user's categoryRole is set correctly
- Verify `ENFORCE_CATEGORY_ACCESS` is not set to `false` (should be `true`)
- Check JWT contains categoryRole

### Issue: Token invalidated after category change

**Expected Behavior:** When admin changes user category, tokenVersion increments. User must log in again.

**Solution:** This is by design. User should log in again to get new token.

### Issue: Migration fails

**Solution:**
- Ensure database connection is correct
- Check for existing data conflicts
- Run backfill script after migration

### Issue: Worker can't find video categoryRole

**Solution:**
- Ensure worker Prisma schema is updated
- Regenerate Prisma client: `pnpm prisma generate`
- Verify video record has categoryRole set

## Future Enhancements

Potential improvements:
- Category-based analytics filtering
- Bulk category updates
- Category-based video recommendations
- Category-specific upload limits
- Category-based notification preferences

## Related Files

### Backend
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/controllers/authController.ts` - Auth with categoryRole
- `backend/src/controllers/videoController.ts` - Category filtering
- `backend/src/controllers/adminController.ts` - Category management
- `backend/src/middleware/auth.ts` - Token version checking
- `backend/src/services/videoService.ts` - Video registration with categoryRole

### Frontend
- `frontend/src/app/register/page.tsx` - Category selection
- `frontend/src/app/admin/users/page.tsx` - Category management UI
- `frontend/src/app/watch/[videoId]/page.tsx` - Category badge & 403 handling
- `frontend/src/app/my-videos/page.tsx` - Category badges
- `frontend/src/hooks/useAuth.ts` - CategoryRole in auth state
- `frontend/src/lib/auth.ts` - CategoryRole helpers

### Worker
- `worker/src/queue/videoProcessing.ts` - HLS path prefixing
- `worker/src/utils/database.ts` - CategoryRole helpers

### Scripts
- `backend/scripts/backfillCategoryRole.ts` - Backfill existing users

### Documentation
- `docs/USER_CATEGORY_FEATURE.md` - This file

