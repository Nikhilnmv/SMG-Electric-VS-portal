# ClickHouse Cloud Setup Guide

This guide will help you connect your ClickHouse Cloud account to the VS Platform.

## Prerequisites

You should have:
- ✅ Created a ClickHouse Cloud account
- ✅ Created a service in ClickHouse Cloud
- ✅ Obtained your connection credentials

## Required Credentials

From your ClickHouse Cloud dashboard, you need:

1. **Hostname/Host** - The hostname of your ClickHouse service
   - Usually looks like: `[service-name].clickhouse.cloud` or `[region].clickhouse.cloud`
   - Find this in your ClickHouse Cloud dashboard under "Connect" → "HTTPS"

2. **Port** - For HTTPS connections, typically `8443` or `443`
   - Default for HTTPS: `8443`
   - Default for HTTP: `8123`

3. **Database** - Usually `default` (or the database name you created)

4. **Username** - Your ClickHouse username
   - From your credentials: `default`

5. **Password** - Your ClickHouse password
   - From your credentials: `zcO9FJ.OLmP_H`

6. **Protocol** - `https` for cloud services

## Finding Your Hostname

1. Log into your ClickHouse Cloud console: https://console.clickhouse.cloud
2. Select your service (SMG VS platform)
3. Click the **"Connect"** button in the left sidebar
4. Select **"HTTPS"** as the connection method
5. You should see connection details including:
   - **Host**: This is your `CLICKHOUSE_HOST` value
   - **Port**: Usually `8443` for HTTPS
   - **Database**: Usually `default`
   - **Username**: `default`
   - **Password**: Your password

## Configuration Steps

### Step 1: Update Backend Environment Variables

Edit `backend/.env` file and add/update these variables:

```bash
# ClickHouse Cloud Configuration
CLICKHOUSE_PROTOCOL=https
CLICKHOUSE_HOST=jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud
CLICKHOUSE_PORT=8443
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=zcO9FJ.OLmP_H
```

**Note**: A reference file with these exact values has been created at `backend/CLICKHOUSE_CLOUD_CONFIG.txt` for easy copy-paste.

### Step 2: Verify Configuration

Your complete ClickHouse configuration should look like:

```bash
# Your ClickHouse Cloud Configuration
CLICKHOUSE_PROTOCOL=https
CLICKHOUSE_HOST=jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud
CLICKHOUSE_PORT=8443
CLICKHOUSE_DB=default
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=zcO9FJ.OLmP_H
```

### Step 3: Restart Backend Service

After updating the `.env` file:

```bash
# If running locally
cd backend
pnpm dev

# Or if using Docker Compose
docker-compose restart backend
```

### Step 4: Verify Connection

Check the backend logs for:

```
[ClickHouse] Connecting to https://your-host:8443, database: default, user: default
[ClickHouse] Connection test successful
ClickHouse events_raw table initialized
```

## Troubleshooting

### Error: "Connection refused" or "ECONNREFUSED"
- **Solution**: Verify the hostname and port are correct
- Check that your ClickHouse Cloud service is running
- Ensure the hostname doesn't include `https://` prefix (just the hostname)

### Error: "Authentication failed"
- **Solution**: Double-check your username and password
- Ensure there are no extra spaces in the password
- Verify the password matches exactly what's shown in ClickHouse Cloud

### Error: "SSL/TLS error"
- **Solution**: Ensure `CLICKHOUSE_PROTOCOL=https` is set
- Verify the port is `8443` (or `443` if your service uses that)

### Error: "Hostname not found"
- **Solution**: Verify the hostname is correct
- Check that you're using the full hostname (e.g., `abc123xyz.clickhouse.cloud`)
- Don't include `http://` or `https://` in the hostname

## Testing the Connection

You can test the connection manually:

```bash
# Test HTTPS connection
curl -u default:zcO9FJ.OLmP_H \
  "https://jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud:8443/?query=SELECT%201"
```

Expected response: `1`

Or test with a more detailed query:

```bash
curl -u default:zcO9FJ.OLmP_H \
  "https://jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud:8443/?query=SELECT%20version()"
```

Expected response: The ClickHouse version number

## Environment Variables Reference

| Variable | Description | Your Value |
|----------|-------------|------------|
| `CLICKHOUSE_PROTOCOL` | Connection protocol | `https` |
| `CLICKHOUSE_HOST` | Hostname of ClickHouse service | `jm3gqbrx6i.ap-south-1.aws.clickhouse.cloud` |
| `CLICKHOUSE_PORT` | Port number | `8443` |
| `CLICKHOUSE_DB` | Database name | `default` |
| `CLICKHOUSE_USER` | Username | `default` |
| `CLICKHOUSE_PASSWORD` | Password | `zcO9FJ.OLmP_H` |

## Next Steps

After successful connection:

1. ✅ Tables will be automatically created on first connection
2. ✅ Analytics events will start being stored in ClickHouse
3. ✅ Admin dashboard will show analytics from ClickHouse
4. ✅ User dashboards will display watch history and statistics

## Security Notes

- ⚠️ Never commit `.env` files to version control
- ⚠️ Use environment variables in production
- ⚠️ Rotate passwords regularly
- ⚠️ Consider using ClickHouse Cloud's IP allowlist for additional security

## Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify all credentials match ClickHouse Cloud dashboard
3. Test connection using curl command above
4. Review ClickHouse Cloud service status in dashboard
