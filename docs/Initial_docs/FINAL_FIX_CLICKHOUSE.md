# Final Fix: ClickHouse Authentication Error

## The Exact Problem

The error shows:
```
default: Authentication failed: password is incorrect, or there is no user with such name.
```

This happens because:
1. ClickHouse has a `default-user.xml` file that restricts the default user
2. The user configuration might require a password
3. The @clickhouse/client library needs explicit empty password configuration

## The Exact Solution

### Run This Command:

```bash
./scripts/fix-clickhouse-auth.sh
```

This script will:
1. ✅ Update ClickHouse user config to allow no password
2. ✅ Allow connections from any network (::/0)
3. ✅ Restart ClickHouse
4. ✅ Test the connection

### Or Do It Manually:

```bash
# Step 1: Update user configuration
docker exec vs-platform-clickhouse bash -c 'cat > /etc/clickhouse-server/users.d/default-user.xml << "EOF"
<clickhouse>
  <users>
    <default>
      <networks>
        <ip>::/0</ip>
      </networks>
      <password></password>
      <profile>default</profile>
      <quota>default</quota>
    </default>
  </users>
</clickhouse>
EOF
'

# Step 2: Restart ClickHouse
docker restart vs-platform-clickhouse

# Step 3: Wait for restart (important!)
sleep 8

# Step 4: Verify
curl http://localhost:8123
# Should return: Ok.
```

### Then Restart Backend:

```bash
cd backend
npm run dev
```

**Look for:**
```
[ClickHouse] Connection test successful
ClickHouse events_raw table initialized
```

## What Changed

1. **Updated ClickHouse config** to explicitly allow:
   - No password (`<password></password>`)
   - Connections from any network (`<ip>::/0</ip>`)

2. **Updated backend client** to:
   - Use `url` instead of deprecated `host`
   - Send empty string for password (not undefined)

3. **Added connection testing** to catch errors early

## Verification

After restarting backend, you should see:
- ✅ `[ClickHouse] Connection test successful`
- ✅ `ClickHouse events_raw table initialized`
- ✅ No authentication errors
- ✅ Dashboard loads without errors

## If Still Not Working

1. **Check ClickHouse logs:**
   ```bash
   docker logs vs-platform-clickhouse | tail -20
   ```

2. **Verify configuration:**
   ```bash
   docker exec vs-platform-clickhouse cat /etc/clickhouse-server/users.d/default-user.xml
   ```
   Should show `<password></password>` (empty)

3. **Test from inside container:**
   ```bash
   docker exec vs-platform-clickhouse clickhouse-client --query "SELECT 1"
   ```
   Should return: `1`

4. **Try complete reset:**
   ```bash
   docker stop vs-platform-clickhouse
   docker rm vs-platform-clickhouse
   docker volume rm vs-platform_clickhouse_data 2>/dev/null || true
   docker run -d --name vs-platform-clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server:latest
   sleep 10
   ./scripts/fix-clickhouse-auth.sh
   ```

## Expected Result

✅ **Backend starts without errors**
✅ **Dashboard loads without authentication error**
✅ **Analytics page loads**
✅ **Events can be tracked**

Then generate test data by watching videos!

