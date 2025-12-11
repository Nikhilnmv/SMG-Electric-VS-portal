# Fix Analytics 400 Bad Request Error

## Problem
When playing videos, analytics events are rejected with `400 Bad Request` errors, preventing analytics from updating.

## Root Cause
The validation schema was only accepting UUIDs, but lessons use CUID format (25 characters starting with 'c').

## Solution Applied
✅ Updated validation to accept both UUIDs and CUIDs
✅ Enhanced error logging to show exact validation failures
✅ Made optional fields more flexible (allow undefined/null)

## Steps to Fix

### 1. Restart Backend (REQUIRED)

**Important**: The backend MUST be restarted for changes to take effect!

```bash
# Stop the current backend (press Ctrl+C in the terminal running it)

# Then restart:
cd backend
pnpm dev

# Or from root:
pnpm --filter backend dev
```

### 2. Verify Backend Started Correctly

Check the backend logs. You should see:
```
Backend server running on port 3001
[ClickHouse] Connecting to https://...
[ClickHouse] Connection test successful
```

### 3. Test the Fix

1. Open your browser and go to a lesson page
2. Play a video
3. Check the browser console - you should **NOT** see 400 errors anymore
4. Check backend logs - if there are still validation errors, you'll see:
   ```
   [Analytics Validation] Request body: {...}
   [Analytics Validation] Validation errors: [...]
   ```

### 4. Verify Events Are Being Stored

Run the check script:
```bash
cd backend
pnpm tsx scripts/check-analytics-data.ts
```

You should see events being stored!

## If Errors Persist

### Check Backend Logs

Look for these log messages when you play a video:
- `[Analytics Validation] Request body:` - Shows what was sent
- `[Analytics Validation] Validation errors:` - Shows what failed

### Common Issues

1. **Backend not restarted**: Most common issue! Make sure you restarted.
2. **Wrong ID format**: Check if lessonId/videoId matches expected format
3. **Missing fields**: Check if required fields are present

### Debug Steps

1. Check backend terminal for validation error details
2. Verify the request format matches the schema
3. Test with the validation script:
   ```bash
   cd backend
   pnpm tsx scripts/test-analytics-event.ts
   ```

## Expected Behavior After Fix

✅ No 400 errors in browser console
✅ Events successfully stored in ClickHouse
✅ Analytics dashboards show data
✅ Backend logs show successful event processing

## Verification

After restarting and playing a video:

1. **Browser Console**: Should show no 400 errors
2. **Backend Logs**: Should show successful event processing
3. **Analytics Data**: Run `pnpm tsx scripts/check-analytics-data.ts` to verify events are stored

---

**Remember**: Always restart the backend after code changes!
