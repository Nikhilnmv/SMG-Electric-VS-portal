# First-Time Admin Setup Guide

## Overview

Since public registration is disabled, you need to create the first admin user directly in the database. This guide provides multiple methods to bootstrap your first admin account.

---

## Prerequisites

Before creating the first admin user, ensure:

1. ✅ **Database is running**
   ```bash
   docker compose up -d postgres
   ```

2. ✅ **Database migrations are applied**
   ```bash
   pnpm --filter backend prisma migrate dev
   ```

3. ✅ **Backend dependencies are installed**
   ```bash
   pnpm install
   ```

---

## Method 1: Using the Setup Script (Recommended)

The easiest way to create your first admin user is using the provided script.

### Step 1: Make the script executable

```bash
chmod +x scripts/create-admin-user.sh
```

### Step 2: Run the script

**Basic usage (uses defaults):**
```bash
./scripts/create-admin-user.sh
```

**With custom credentials:**
```bash
./scripts/create-admin-user.sh admin@yourcompany.com SecurePassword123 "Admin Name"
```

**Default values:**
- Email: `admin@example.com`
- Password: `admin123`
- Name: `Admin User`

### Step 3: What the script does

1. Connects to the PostgreSQL database
2. Creates a user with the provided credentials
3. Sets the user role to `ADMIN`
4. Sets the category role to `EMPLOYEE` (default)
5. Verifies the admin account was created successfully

### Step 4: Log in

After the script completes:

1. Navigate to: `http://localhost:3000/login`
2. Enter your admin credentials
3. You'll be redirected to the dashboard with admin access

---

## Method 2: Direct Database Insertion (Manual)

If you prefer to create the admin user manually or the script doesn't work, you can insert directly into the database.

### Step 1: Connect to the database

**Using Docker:**
```bash
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform
```

**Using direct connection:**
```bash
psql -U postgres -d vs_platform -h localhost -p 5432
```

### Step 2: Generate password hash

You'll need to hash the password using bcrypt. You can use Node.js:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword123', 10).then(hash => console.log(hash));"
```

Or use an online bcrypt generator (for development only):
- https://bcrypt-generator.com/
- Use 10 rounds

**Example:** Password `admin123` hashes to something like:
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

### Step 3: Insert admin user

Run this SQL command (replace values as needed):

```sql
INSERT INTO users (id, email, "passwordHash", role, "categoryRole", "tokenVersion", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$YOUR_HASHED_PASSWORD_HERE',
  'ADMIN',
  'EMPLOYEE',
  0,
  NOW(),
  NOW()
);
```

**Example with actual values:**
```sql
INSERT INTO users (id, email, "passwordHash", role, "categoryRole", "tokenVersion", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'ADMIN',
  'EMPLOYEE',
  0,
  NOW(),
  NOW()
);
```

### Step 4: Verify the user was created

```sql
SELECT id, email, role, "categoryRole" FROM users WHERE email = 'admin@example.com';
```

You should see:
```
id    | email              | role  | categoryRole
------|--------------------|-------|-------------
xxx   | admin@example.com | ADMIN | EMPLOYEE
```

### Step 5: Log in

1. Navigate to: `http://localhost:3000/login`
2. Enter your admin credentials
3. You'll have admin access

---

## Method 3: Using Prisma Studio (GUI Method)

Prisma Studio provides a visual interface to manage your database.

### Step 1: Start Prisma Studio

```bash
cd backend
pnpm prisma studio
```

This will open Prisma Studio in your browser at `http://localhost:5555`

### Step 2: Create a user

1. Click on the **User** model
2. Click **"Add record"**
3. Fill in the fields:
   - **email**: `admin@example.com`
   - **passwordHash**: Generate using Method 2, Step 2
   - **role**: Select `ADMIN` from dropdown
   - **categoryRole**: Select `EMPLOYEE` (or your preferred category)
   - **tokenVersion**: `0`
   - **createdAt**: Leave as default (current timestamp)
   - **updatedAt**: Leave as default (current timestamp)

4. Click **"Save 1 change"**

### Step 3: Log in

Use the credentials you created to log in at `http://localhost:3000/login`

---

## Method 4: Using Node.js Script

Create a temporary script to bootstrap the admin user.

### Step 1: Create the script

Create a file `scripts/bootstrap-admin.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Admin User';

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`❌ User with email ${email} already exists`);
      console.log(`   Current role: ${existing.role}`);
      
      if (existing.role !== 'ADMIN') {
        console.log(`   Updating role to ADMIN...`);
        await prisma.user.update({
          where: { email },
          data: { role: 'ADMIN' },
        });
        console.log(`✅ Role updated to ADMIN`);
      }
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        categoryRole: 'EMPLOYEE',
        tokenVersion: 0,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Category: ${admin.categoryRole}`);
    console.log(`   ID: ${admin.id}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('=============');
    console.log(`1. Log in at: http://localhost:3000/login`);
    console.log(`2. Email: ${email}`);
    console.log(`3. Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
```

### Step 2: Run the script

```bash
cd backend
node ../scripts/bootstrap-admin.js admin@example.com SecurePassword123 "Admin Name"
```

Or with defaults:
```bash
cd backend
node ../scripts/bootstrap-admin.js
```

---

## Verification

After creating the admin user using any method, verify it works:

### 1. Check via API

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

You should receive a response with:
- `success: true`
- `data.user.role: "ADMIN"`
- A JWT token

### 2. Check via UI

1. Navigate to `http://localhost:3000/login`
2. Log in with your admin credentials
3. You should see the Admin Panel in the sidebar
4. Navigate to `/admin` to access the admin dashboard

### 3. Check via Database

```sql
SELECT email, role, "categoryRole", "createdAt" 
FROM users 
WHERE role = 'ADMIN';
```

---

## Troubleshooting

### Issue: "User already exists"

**Solution:** The user exists but may not be an admin. Update the role:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

### Issue: "Cannot connect to database"

**Solution:** 
1. Check if PostgreSQL is running: `docker compose ps`
2. Check database connection string in `.env` file
3. Verify migrations are applied: `pnpm --filter backend prisma migrate dev`

### Issue: "Password hash is incorrect"

**Solution:**
- Ensure you're using bcrypt with 10 rounds
- Double-check the hash was copied correctly (no extra spaces)
- Try generating a new hash

### Issue: "Role is USER instead of ADMIN"

**Solution:** Update the role manually:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Then log out and log back in to get a new JWT token with the updated role.

### Issue: "Cannot access admin panel"

**Solution:**
1. Verify the JWT token includes `role: "ADMIN"` (check in browser DevTools → Application → Local Storage)
2. Log out and log back in to refresh the token
3. Check browser console for any errors

---

## Security Best Practices

### For Production

1. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, and special characters
   - Don't use default passwords

2. **Change Default Credentials**
   - Never use `admin@example.com` / `admin123` in production
   - Use a company email domain
   - Use a password manager to generate secure passwords

3. **Limit Admin Access**
   - Only create admin accounts for trusted personnel
   - Regularly audit admin accounts
   - Use the principle of least privilege

4. **Secure Database Access**
   - Use strong database passwords
   - Restrict database access to necessary IPs only
   - Use connection encryption in production

5. **Rotate Credentials**
   - Change admin passwords periodically
   - Revoke access for former employees immediately

---

## Next Steps After Creating Admin

Once you have your first admin account:

1. **Log in** at `http://localhost:3000/login`
2. **Navigate to Admin Panel** → User Management
3. **Create additional users** via `/admin/users/create`
4. **Configure categories** and assign users appropriately
5. **Set up video categories** and access rules
6. **Review security settings** and rate limits

---

## Related Documentation

- [User Onboarding Corporate Flow](./USER_ONBOARDING_CORPORATE_FLOW.md)
- [Quick Start Guide](./QUICK_START.md)
- [Maintainer Handbook](../personal_docs/MAINTAINER_HANDBOOK.md)
- [Database Schema](../backend/prisma/schema.prisma)

---

## Summary

**Quick Start (Recommended):**
```bash
# 1. Ensure database is running
docker compose up -d postgres

# 2. Apply migrations
pnpm --filter backend prisma migrate dev

# 3. Create admin user (using script)
./scripts/create-admin-user.sh admin@yourcompany.com SecurePassword123

# 4. Log in at http://localhost:3000/login
```

**Alternative (Manual):**
```sql
-- Connect to database and run:
INSERT INTO users (id, email, "passwordHash", role, "categoryRole", "tokenVersion", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$YOUR_BCRYPT_HASH_HERE',
  'ADMIN',
  'EMPLOYEE',
  0,
  NOW(),
  NOW()
);
```

After creating the first admin, all subsequent users should be created through the Admin Panel at `/admin/users/create`.

