# Troubleshooting Category Role Feature

## Issue: "Internal server error" on Registration

**Symptoms:**
- Registration form shows "Internal server error"
- User cannot register

**Cause:**
- Database migration not applied
- Missing `categoryRole` and `tokenVersion` columns in database

**Solution:**
1. Run the migration script:
   ```bash
   cd backend
   pnpm tsx scripts/apply-migration-manually.ts
   ```

2. Regenerate Prisma client:
   ```bash
   pnpm prisma generate
   ```

3. Restart backend server

## Issue: "Failed to fetch users" in Admin Panel

**Symptoms:**
- Admin panel shows "Failed to fetch users"
- User management page is empty

**Cause:**
- Database migration not applied
- Missing `categoryRole` column in users table

**Solution:**
1. Run the migration script:
   ```bash
   cd backend
   pnpm tsx scripts/apply-migration-manually.ts
   ```

2. Regenerate Prisma client:
   ```bash
   pnpm prisma generate
   ```

3. Restart backend server

## Issue: Database Migration Fails

**Symptoms:**
- Migration script fails with errors
- Columns/enum not created

**Solutions:**

### Option 1: Use Manual Migration Script
```bash
cd backend
pnpm tsx scripts/apply-migration-manually.ts
```

### Option 2: Run SQL Manually
Connect to your database and run:
```sql
-- Create enum
CREATE TYPE "CategoryRole" AS ENUM ('DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR');

-- Add to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "categoryRole" "CategoryRole" NOT NULL DEFAULT 'INTERN';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Add to videos table
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "categoryRole" "CategoryRole" NOT NULL DEFAULT 'INTERN';

-- Update existing videos
UPDATE "videos" v
SET "categoryRole" = COALESCE(v."categoryRole", u."categoryRole", 'INTERN')
FROM "users" u
WHERE v."userId" = u."id";
```

### Option 3: Check Migration Status
```bash
cd backend
pnpm tsx scripts/check-migration-status.ts
```

## Issue: Prisma Client Errors

**Symptoms:**
- TypeScript errors about missing fields
- Runtime errors about unknown columns

**Solution:**
1. Regenerate Prisma client:
   ```bash
   cd backend
   pnpm prisma generate
   ```

2. Restart TypeScript server in your IDE

3. Clear node_modules and reinstall if needed:
   ```bash
   rm -rf node_modules
   pnpm install
   pnpm prisma generate
   ```

## Issue: Category Not Showing in Registration

**Symptoms:**
- Registration form doesn't show category dropdown
- Category field missing

**Solution:**
1. Clear browser cache
2. Restart frontend server:
   ```bash
   cd frontend
   pnpm dev
   ```

3. Check browser console for errors

## Issue: Users Can't See Videos

**Symptoms:**
- Users see empty video lists
- 403 errors when accessing videos

**Solution:**
1. Check user's categoryRole is set:
   ```sql
   SELECT id, email, "categoryRole" FROM users;
   ```

2. Check video's categoryRole matches:
   ```sql
   SELECT id, title, "categoryRole" FROM videos;
   ```

3. Verify ENFORCE_CATEGORY_ACCESS is not set to false:
   ```bash
   # In backend/.env
   ENFORCE_CATEGORY_ACCESS=true
   ```

## Issue: Token Invalidated After Category Change

**Symptoms:**
- User gets 403 after admin changes their category
- "Token has been invalidated" error

**Expected Behavior:**
This is by design. When admin changes a user's category, their tokenVersion increments, invalidating existing tokens.

**Solution:**
User must log out and log back in to get a new token.

## Verification Steps

After applying fixes, verify everything works:

1. **Check Database:**
   ```bash
   cd backend
   pnpm tsx scripts/check-migration-status.ts
   ```

2. **Test Registration:**
   - Go to `/register`
   - Fill form and select category
   - Should register successfully

3. **Test User Management:**
   - Login as admin
   - Go to `/admin/users`
   - Should see user list with categories

4. **Test Video Access:**
   - Login as regular user
   - Should only see videos from their category
   - Admin should see all videos

## Common Error Messages

### "categoryRole column does not exist"
**Fix:** Run migration script

### "type CategoryRole does not exist"
**Fix:** Run migration script (enum not created)

### "PrismaClient needs to be constructed..."
**Fix:** Regenerate Prisma client

### "Failed to fetch users"
**Fix:** Check database migration, restart backend

### "Internal server error"
**Fix:** Check backend logs, verify migration applied

## Getting Help

If issues persist:

1. Check backend logs for detailed error messages
2. Verify DATABASE_URL is correct in `.env`
3. Ensure PostgreSQL is running
4. Check database permissions
5. Review `docs/USER_CATEGORY_FEATURE.md` for full documentation

