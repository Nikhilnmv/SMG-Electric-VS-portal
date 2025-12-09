# Username + Password Authentication Implementation

## Overview

This document describes the implementation of username + password login, admin-created users with generated usernames, and the forgot password flow.

## Features Implemented

### 1. Username-Based Authentication
- Users log in using **username + password** (not email)
- Usernames are unique and auto-generated from user names
- JWT tokens include username in payload

### 2. Admin-Controlled User Creation
- Only admins can create users
- Automatic username generation from name or email
- Optional temporary password generation
- Credentials email sending capability

### 3. Forgot Password Flow
- Secure password reset via email
- One-time use tokens with expiry
- Rate limiting to prevent abuse
- Username enumeration protection

### 4. Password Must Change Flow
- Users with temporary passwords are forced to change on first login
- Automatic redirect to change password page

## Database Schema Changes

### New User Fields

```prisma
model User {
  username                String?      @unique
  passwordMustChange      Boolean      @default(false)
  passwordResetTokenHash  String?
  passwordResetExpiresAt  DateTime?
  createdByAdminId        String?
  isActive                Boolean      @default(true)
  lastPasswordChangeAt    DateTime?
  // ... existing fields
}
```

### Migration

Run the migration:
```bash
cd backend
pnpm prisma migrate deploy
```

## Environment Variables

### Backend (.env)

```bash
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@vs-platform.com
SMTP_FROM_NAME=VS Platform

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000

# Password Reset Token TTL (seconds)
PASSWORD_RESET_TOKEN_TTL_SECONDS=3600

# Bcrypt Rounds
BCRYPT_ROUNDS=12

# Development Mode
DEV_MODE=false
DEV_EMAIL_DUMP=false
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_JWT_STORAGE_KEY=vs_platform_token
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with username and password.

**Request:**
```json
{
  "username": "john-doe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "username": "john-doe",
      "role": "USER",
      "categoryRole": "EMPLOYEE",
      "passwordMustChange": false,
      "createdAt": "..."
    },
    "token": "jwt-token..."
  }
}
```

#### POST `/api/auth/forgot-password`
Request password reset.

**Request:**
```json
{
  "username": "john-doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account with that username exists, we have sent a password reset email."
}
```

**Rate Limits:**
- 5 requests per hour per IP
- 3 requests per hour per username

#### POST `/api/auth/reset-password`
Reset password using token.

**Request:**
```json
{
  "username": "john-doe",
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

### Admin User Management

#### POST `/api/admin/users/create`
Create a new user (admin only).

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "John Doe",
  "password": "optional-password",
  "categoryRole": "EMPLOYEE",
  "role": "USER",
  "generateUsername": true,
  "generateTempPassword": true,
  "sendCredentialsEmail": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "newuser@example.com",
      "username": "john-doe",
      "role": "USER",
      "categoryRole": "EMPLOYEE",
      "passwordMustChange": true,
      "createdAt": "..."
    },
    "password": "TempPass123!" // Only if auto-generated
  }
}
```

## Username Generation

Usernames are generated from user names using the following rules:

1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove special characters (keep alphanumeric and hyphens)
4. Collapse multiple hyphens
5. Trim leading/trailing hyphens
6. Ensure minimum length of 3 characters
7. Maximum length of 20 characters (before suffix)
8. If collision, append `-1`, `-2`, etc.

**Examples:**
- "John Doe" → "john-doe"
- "Mary Jane Smith" → "mary-jane-smith"
- "John Doe" (if exists) → "john-doe-1"

## Security Features

### Password Hashing
- Uses bcrypt with configurable rounds (default: 12)
- Passwords are never stored in plain text

### Password Reset Tokens
- Cryptographically secure random tokens (32 bytes)
- Stored as SHA256 hash in database
- Constant-time comparison to prevent timing attacks
- One-time use (deleted after successful reset)
- Configurable expiry (default: 1 hour)

### Rate Limiting
- Forgot password endpoint: 5 requests/hour per IP
- Username enumeration protection: Always returns success message

### Token Invalidation
- `tokenVersion` incremented on password change
- Old JWTs become invalid
- Forces re-authentication

### Audit Logging
- User creation events
- Password reset requests
- Password reset completions
- All events include actor and target user IDs

## Email Service

### SMTP Configuration

The email service supports standard SMTP providers:

- Gmail
- SendGrid
- AWS SES
- Any SMTP-compatible service

### Development Mode

In development, emails are logged to console instead of being sent:

```bash
DEV_MODE=true
DEV_EMAIL_DUMP=true
```

### Email Templates

#### Password Reset Email
- Includes reset link with token and username
- Shows expiry time
- Security warnings
- Support contact information

#### User Credentials Email
- Username and password (if temporary)
- Login link
- Password change instructions (if temporary)
- Security tips

## Frontend Pages

### `/login`
- Username and password fields
- "Forgot Password" link
- Redirects to change password if `passwordMustChange` is true

### `/auth/forgot-password`
- Username input
- Success message (always shown to prevent enumeration)

### `/auth/reset-password`
- Reads token and username from URL query params
- New password and confirm password fields
- Password validation
- Redirects to login on success

### `/admin/users`
- User list with management actions
- "Create User" button opens modal
- Credentials display modal after creation

## Testing

### Manual Testing Steps

1. **Create User (Admin)**
   - Go to `/admin/users`
   - Click "Create User"
   - Fill form and submit
   - Verify credentials are shown

2. **Login with Username**
   - Go to `/login`
   - Enter username and password
   - Verify successful login

3. **Forgot Password**
   - Go to `/auth/forgot-password`
   - Enter username
   - Check email (or console in dev mode)
   - Click reset link

4. **Reset Password**
   - Use token from email
   - Enter new password
   - Verify login with new password

5. **Password Must Change**
   - Create user with temp password
   - Login
   - Verify redirect to change password page
   - Change password
   - Verify can access app

### Backend Tests

```bash
cd backend
pnpm test
```

### E2E Tests

```bash
# Start backend and frontend
pnpm --filter backend dev
pnpm --filter frontend dev

# Run E2E tests
pnpm test:e2e
```

## Migration Guide

### For Existing Users

Existing users without usernames need to be migrated:

```typescript
// Migration script
const users = await prisma.user.findMany({
  where: { username: null }
});

for (const user of users) {
  const username = await UserService.generateUniqueUsername(user.email.split('@')[0]);
  await prisma.user.update({
    where: { id: user.id },
    data: { username }
  });
}
```

## Troubleshooting

### Email Not Sending

1. Check SMTP configuration in `.env`
2. Verify SMTP credentials
3. Check firewall/network settings
4. In dev mode, check console logs

### Username Generation Fails

1. Check database connection
2. Verify unique constraint on username
3. Check for special characters in name

### Password Reset Not Working

1. Verify token hasn't expired
2. Check token format (64 hex characters)
3. Verify username matches
4. Check database for token hash

### Rate Limiting Issues

1. Check Redis connection (if using Redis store)
2. Verify rate limit configuration
3. Clear rate limit cache if needed

## Security Best Practices

1. **Never log passwords or tokens** (except in dev mode with explicit flag)
2. **Use HTTPS in production** for all endpoints
3. **Set strong SMTP credentials** and rotate regularly
4. **Monitor audit logs** for suspicious activity
5. **Use environment-specific configurations**
6. **Regularly update dependencies**
7. **Implement account lockout** after failed attempts (future enhancement)

## Future Enhancements

- [ ] Account lockout after failed login attempts
- [ ] Two-factor authentication (2FA)
- [ ] Password strength meter
- [ ] Session management
- [ ] Remember me functionality
- [ ] Social login integration
- [ ] Email verification on account creation

