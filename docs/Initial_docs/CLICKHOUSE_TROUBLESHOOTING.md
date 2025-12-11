# ClickHouse Cloud Authentication Troubleshooting

## Error: "Authentication failed: password is incorrect"

This error means ClickHouse Cloud is rejecting your credentials. Here's how to fix it:

### Step 1: Verify Your .env File Format

**❌ WRONG** - Don't use quotes:
```bash
CLICKHOUSE_PASSWORD="zcO9FJ.OLmP_H"
```

**✅ CORRECT** - No quotes:
```bash
CLICKHOUSE_PASSWORD=zcO9FJ.OLmP_H
```

### Step 2: Check for Extra Spaces

Make sure there are no spaces around the `=` sign:

**❌ WRONG**:
```bash
CLICKHOUSE_PASSWORD = zcO9FJ.OLmP_H
CLICKHOUSE_PASSWORD= zcO9FJ.OLmP_H
CLICKHOUSE_PASSWORD =zcO9FJ.OLmP_H
```

**✅ CORRECT**:
```bash
CLICKHOUSE_PASSWORD=zcO9FJ.OLmP_H
```

### Step 3: Verify Password in ClickHouse Cloud

1. Go to https://console.clickhouse.cloud
2. Select your service (SMG VS platform)
3. Click "Connect" → "HTTPS"
4. Verify the password matches exactly what's in your `.env` file
5. If the password is different, either:
   - Update your `.env` file with the correct password, OR
   - Reset the password in ClickHouse Cloud

### Step 4: Test Connection Manually

Run the test script to verify your connection:

```bash
cd backend
pnpm tsx scripts/test-clickhouse-connection.ts
```

This will:
- Show your current configuration
- Test the connection
- Provide specific error messages if it fails

### Step 5: Common Issues

#### Issue: Password has special characters
If your password contains special characters, they should work as-is. However, if you're having issues:
- Don't URL-encode the password in `.env`
- Don't add quotes
- Copy-paste directly from ClickHouse Cloud dashboard

#### Issue: Password was reset
If you reset your password in ClickHouse Cloud:
1. Get the new password from the dashboard
2. Update `CLICKHOUSE_PASSWORD` in `backend/.env`
3. Restart your backend service

#### Issue: Multiple .env files
Make sure you're editing the correct `.env` file:
- Local development: `backend/.env`
- Docker: Environment variables in `docker-compose.yml` or `.env` file

### Step 6: Verify Environment Variables Are Loaded

Add this temporary debug line to see what's being read:

```typescript
// In backend/src/services/clickhouse.ts, add after line 14:
console.log('[DEBUG] Password from env:', JSON.stringify(process.env.CLICKHOUSE_PASSWORD));
console.log('[DEBUG] Password length:', process.env.CLICKHOUSE_PASSWORD?.length);
```

### Step 7: Reset Password in ClickHouse Cloud (If Needed)

If you need to reset your password:

1. Go to https://console.clickhouse.cloud
2. Select your service
3. Go to "Settings"
4. Find "Users" or "Security" section
5. Reset the password for the `default` user
6. Update your `.env` file with the new password
7. Restart backend

## Complete .env Configuration

Your `backend/.env` should have these exact lines (no quotes, no spaces):

```bash
CLICKHOUSE_PROTOCOL=https
CLICKHOUSE_HOST=jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud
CLICKHOUSE_PORT=8443
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=zcO9FJ.OLmP_H
```

## Still Having Issues?

1. **Check backend logs** - Look for the exact error message
2. **Run test script** - `pnpm --filter backend tsx scripts/test-clickhouse-connection.ts`
3. **Verify in ClickHouse Cloud** - Double-check credentials in dashboard
4. **Try curl test**:
   ```bash
   curl -u default:zcO9FJ.OLmP_H \
     "https://jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud:8443/?query=SELECT%201"
   ```
   If this works but the backend doesn't, it's a configuration issue.

## Quick Fix Checklist

- [ ] `.env` file has no quotes around password
- [ ] No spaces around `=` sign
- [ ] Password matches ClickHouse Cloud dashboard exactly
- [ ] `CLICKHOUSE_PROTOCOL=https` is set
- [ ] `CLICKHOUSE_PORT=8443` is set
- [ ] Backend service has been restarted after changes
- [ ] Test script passes: `pnpm --filter backend tsx scripts/test-clickhouse-connection.ts`
