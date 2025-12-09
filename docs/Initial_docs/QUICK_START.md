# Quick Start Guide - Testing Video Upload

## Current Status

✅ **Frontend**: Running on http://localhost:3000
✅ **Databases**: PostgreSQL, Redis, ClickHouse running in Docker
⚠️ **Backend**: May need to be started manually
⚠️ **Worker**: May need to be started manually

## Step 1: Start All Services

Open a terminal and run:

```bash
# Navigate to project root
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"

# Start backend (in one terminal)
pnpm --filter backend dev

# Start worker (in another terminal)
pnpm --filter worker dev
```

Wait for both to show "listening" or "started" messages.

## Step 2: Create Admin User (First Time Setup)

**Note**: Public registration is disabled. Only admins can create user accounts. For first-time setup, you need to create an admin user.

**📖 For detailed instructions, see: [First-Time Admin Setup Guide](./FIRST_TIME_ADMIN_SETUP.md)**

**Quick Method - Use the Admin Creation Script:**

```bash
# From project root
chmod +x scripts/create-admin-user.sh
./scripts/create-admin-user.sh admin@yourcompany.com SecurePassword123
```

This script will:
1. Connect to the database
2. Create an admin user with the provided credentials
3. Set the role to ADMIN
4. Verify the account was created

**Alternative Methods:**
- Direct database insertion (see [FIRST_TIME_ADMIN_SETUP.md](./FIRST_TIME_ADMIN_SETUP.md))
- Using Prisma Studio (GUI method)
- Using Node.js script

## Step 3: Log In

1. Navigate to http://localhost:3000/login
2. Enter your admin credentials
3. You'll be redirected to the dashboard

Then copy the token and in browser console:
```javascript
localStorage.setItem('vs_platform_token', 'YOUR_TOKEN_HERE');
```

## Step 3: Upload a Video

1. **Go to Upload Page**:
   - Click "Upload Video" button on home page
   - Or navigate to: http://localhost:3000/upload

2. **Select Video File**:
   - Click file input
   - Choose a video file (MP4, MOV, etc.)
   - File size should be reasonable for testing (under 100MB recommended)

3. **Enter Details**:
   - **Title**: Enter a title (e.g., "Test Video")
   - **Description**: Optional description

4. **Click "Upload Video"**:
   - Watch the progress bar
   - Wait for "Video uploaded successfully!" message

## Step 4: Monitor Processing

**Check Worker Logs** (in worker terminal):
- You should see: "Starting video processing for video {id}"
- FFmpeg transcoding progress for each resolution
- "Video processing completed successfully"

**Check Video Status**:
```bash
# Get video ID from upload response, then:
curl http://localhost:3001/api/videos/{VIDEO_ID}
```

Status will change:
- `PROCESSING` → Video is being transcoded
- `READY` → Video is ready for playback (includes hlsPath)

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:3001/health

# If not, start it:
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev
```

### Worker Not Processing

```bash
# Check if worker is running
ps aux | grep worker

# If not, start it:
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter worker dev
```

### Authentication Issues

- Make sure token is in localStorage:
  ```javascript
  localStorage.getItem('vs_platform_token')
  ```
- If missing, register/login again

### Upload Fails

- Check browser console for errors
- Verify backend is running
- Check AWS credentials in backend `.env` (if using real S3)
- For local testing, you may need to configure S3 or use a mock

## Expected Flow

1. ✅ User selects video file
2. ✅ Frontend requests presigned URL
3. ✅ Video uploaded to S3
4. ✅ Video metadata registered (status: PROCESSING)
5. ✅ Job enqueued to BullMQ
6. ✅ Worker picks up job
7. ✅ Video downloaded from S3
8. ✅ FFmpeg transcodes to HLS
9. ✅ HLS files uploaded to S3
10. ✅ Database updated (status: READY, hlsPath set)

## Next Steps After Upload

Once video status is "READY":
- Video can be played using the hlsPath
- HLS path format: `hls/{videoId}/master.m3u8`
- Can be used with Video.js or any HLS player


