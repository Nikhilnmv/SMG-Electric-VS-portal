# Video Upload Troubleshooting Guide

## Common Upload Errors and Solutions

### Error: "Load failed" or Generic Upload Errors

This usually indicates one of the following issues:

#### 1. Backend Not Running
**Symptoms:**
- Error mentions network issues
- "Failed to fetch" in browser console
- Connection refused errors

**Solution:**
```bash
# Check if backend is running
curl http://localhost:3001/health

# If not running, start it:
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev
```

#### 2. AWS S3 Configuration Missing
**Symptoms:**
- "Failed to generate upload URL" error
- Backend logs show S3 credential errors
- 500 Internal Server Error

**Solution:**
Check backend `.env` file has AWS credentials:
```bash
cd backend
cat .env | grep AWS
```

Required variables:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=vs-platform-uploads
```

**If you don't have AWS credentials:**
- For local development, you can use LocalStack or MinIO
- Or configure AWS S3 bucket with proper credentials
- See backend README for S3 setup instructions

#### 3. Authentication Token Issues
**Symptoms:**
- "Authentication failed" error
- 401 Unauthorized errors
- Token expired or invalid

**Solution:**
1. Log out and log back in
2. Check token in browser console:
```javascript
localStorage.getItem('vs_platform_token')
```
3. If token is missing or expired, login again

#### 4. File Size or Type Issues
**Symptoms:**
- "Only video files are allowed" error
- File uploads but fails validation

**Solution:**
- Ensure file is a video (MP4, MOV, AVI, etc.)
- Check file size (very large files may timeout)
- Try a smaller test file first

#### 5. CORS Issues
**Symptoms:**
- CORS errors in browser console
- Network requests blocked

**Solution:**
Check backend CORS configuration allows requests from `http://localhost:3000`

#### 6. S3 Bucket Doesn't Exist
**Symptoms:**
- Backend logs show "Bucket doesn't exist"
- AWS SDK errors

**Solution:**
1. Create S3 bucket:
```bash
aws s3 mb s3://vs-platform-uploads --region us-east-1
```

2. Or update `S3_BUCKET` in backend `.env` to use existing bucket

## Diagnostic Steps

### Step 1: Check Backend Health
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok",...}`

### Step 2: Test Authentication
```bash
# Get your token first
TOKEN="your-token-here"

# Test authenticated endpoint
curl http://localhost:3001/api/videos \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Test Presigned URL Generation
```bash
TOKEN="your-token-here"

curl -X POST http://localhost:3001/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "contentType": "video/mp4",
    "fileSize": 1000000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "fileKey": "raw/..."
  }
}
```

**If you get an error:**
- Check backend terminal for detailed error logs
- Verify AWS credentials are set
- Check S3 bucket exists and is accessible

### Step 4: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try uploading a video
4. Look for detailed error messages
5. Check Network tab for failed requests

### Step 5: Check Backend Logs
Look at the terminal where backend is running:
- Check for error messages
- Look for AWS SDK errors
- Check authentication errors

## Quick Fixes

### Fix 1: Restart Services
```bash
# Kill and restart backend
lsof -ti:3001 | xargs kill -9
pnpm --filter backend dev
```

### Fix 2: Clear Browser Cache
- Clear localStorage: `localStorage.clear()` in console
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Log in again

### Fix 3: Verify Environment Variables
```bash
# Check frontend .env
cat frontend/.env.local

# Should have:
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Check backend .env
cat backend/.env

# Should have AWS credentials and S3 bucket
```

## Testing Upload Flow Manually

### 1. Get Presigned URL
```bash
TOKEN="your-token"

curl -X POST http://localhost:3001/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentType":"video/mp4","fileSize":1000000}' \
  | jq
```

### 2. Upload File to S3
```bash
# Use the uploadUrl from step 1
UPLOAD_URL="https://..."
FILE_KEY="raw/..."

curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary @your-video.mp4
```

### 3. Register Video
```bash
curl -X POST http://localhost:3001/api/videos/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Video",
    "description": "Test upload",
    "fileKey": "'$FILE_KEY'"
  }'
```

## Still Having Issues?

1. **Check all services are running:**
   - Docker services (postgres, redis)
   - Backend (port 3001)
   - Frontend (port 3000)

2. **Review error logs:**
   - Backend terminal
   - Browser console
   - Network tab in DevTools

3. **Verify AWS configuration:**
   - Credentials are valid
   - Bucket exists
   - Permissions are correct

4. **Test with a small file:**
   - Use a small video file (< 10MB) for testing
   - Once working, try larger files

