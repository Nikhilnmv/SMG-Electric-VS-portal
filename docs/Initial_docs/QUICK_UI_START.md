# Quick Start Guide - Opening and Checking the UI

Follow these steps to start all services and view your platform's UI.

## Step 1: Start Docker Desktop

**IMPORTANT:** Docker Desktop must be running before starting services!


## Step 2: Start Docker Services

Once Docker Desktop is running, open a terminal and run:

```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
docker compose up -d postgres redis clickhouse
```

**Wait for services to be healthy** (about 10-20 seconds), then verify:
```bash
docker compose ps
```

**If you get an error about Docker daemon:**
- Make sure Docker Desktop is fully started (see Step 1 above)
- Wait a few more seconds and try again

All services should show "Up" status:
- ✅ `vs-platform-postgres`
- ✅ `vs-platform-redis`
- ✅ `vs-platform-clickhouse`

## Step 3: Start Backend Service

Open a **new terminal window** and run:

```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev
```

**Expected Output:**
```
> backend@1.0.0 dev
Backend server running on port 3001
```

**Keep this terminal open!** The backend must keep running.

## Step 4: Start Worker Service

Open **another new terminal window** and run:

```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter worker dev
```

**Expected Output:**
```
> worker@1.0.0 dev
Worker service started
Listening for jobs on queue: video-processing
```

**Keep this terminal open!** The worker processes video uploads.

## Step 5: Start Frontend Service

Open **one more terminal window** and run:

```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter frontend dev
```

**Expected Output:**
```
> frontend@1.0.0 dev
▲ Next.js 14.x.x
- Local:        http://localhost:3000

✓ Ready in [time]ms
```

**Keep this terminal open!** The frontend must keep running.

## Step 6: Open the Platform in Your Browser

1. Open your web browser (Chrome, Firefox, Safari, etc.)
2. Navigate to:
   ```
   http://localhost:3000
   ```

## What You Should See

### If You're NOT Logged In:
- ✅ **Login Page** with the new UI redesign:
  - Left side: Login form with "VS Platform" branding
  - Right side: Background image area (on desktop)
  - Email and password fields
  - "Forgot your password?" link
  - "LOGIN" button

### If You're Already Logged In:
- ✅ **Dashboard Page** with:
  - Top branding bar: "VS Platform"
  - Left sidebar navigation (navy blue)
  - Main content area (white) with stats cards

## Testing the UI

### 1. Test Login Page
- **Login Page**: Go to `http://localhost:3000/login`
  - You should see the redesigned login page
  - Enter your credentials to log in
  - Note: Public registration is disabled - "Create account" link has been removed

### 2. Create a New User (Admin Only)

**Note**: Public registration is disabled. Only administrators can create user accounts.

**To Create a User:**
1. Log in as an admin user
2. Navigate to **Admin Panel** → **User Management** → **Create User**
   - Or go directly to: `http://localhost:3000/admin/users/create`
3. Fill in the user creation form:
   - Email (required)
   - Name (optional)
   - Password (optional - leave empty to auto-generate)
   - User Category (required: Dealer, Employee, Technician & Service, Stakeholder, Intern, Vendor)
   - Role (required: User, Admin, or Editor)
4. Click **"Create User"** button
5. If password was auto-generated, copy it and securely share with the new user
6. The new user can now log in with the provided credentials

**For First-Time Setup:**
- Use the admin creation script: `./scripts/create-admin-user.sh`
- Or create an admin user directly in the database

### 3. Explore the New UI

Once logged in, you'll see:

#### Top Bar
- "VS Platform" branding in navy blue
- Hamburger menu icon (on mobile)

#### Left Sidebar (Desktop)
- Dashboard
- Upload Video
- My Videos
- Watch History
- Focus Mode
- Analytics
- Admin Panel (if admin user)
- Profile
- Logout

#### Main Content Area
- White background
- Rounded corners
- Shadow effect
- Page-specific content

### 4. Test Navigation
- Click different sidebar items
- Notice the active item is highlighted
- Pages should load smoothly

### 5. Test Responsive Design
- Open DevTools (F12)
- Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
- Test on mobile (iPhone 12) and tablet sizes
- Sidebar should hide on mobile, hamburger menu should appear

## Troubleshooting

### Port Already in Use (EADDRINUSE Error)

If you see `Error: listen EADDRINUSE: address already in use :::3001` or similar:

**This means a process is already using the port. Here's how to fix it:**

#### Option 1: Kill the Process (Recommended)

**For Backend (port 3001):**
```bash
# Find and kill the process using port 3001
lsof -ti:3001 | xargs kill -9
```

**For Frontend (port 3000):**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

**For Worker (if needed):**
```bash
# Find and kill any node processes (be careful - this kills all node processes)
pkill -f "backend.*tsx"  # Kills backend specifically
pkill -f "worker.*tsx"   # Kills worker specifically
pkill -f "next dev"      # Kills frontend specifically
```

#### Option 2: Find What's Using the Port (Before Killing)

To see what process is using the port:

**For port 3001:**
```bash
lsof -i:3001
```

**For port 3000:**
```bash
lsof -i:3000
```

This will show you the process ID (PID). You can then kill it specifically:
```bash
kill -9 <PID>
```

#### Option 3: Kill All Related Processes

If you want to kill all backend/worker/frontend processes at once:
```bash
# Kill all backend processes
pkill -f "backend.*tsx"

# Kill all worker processes  
pkill -f "worker.*tsx"

# Kill all Next.js dev processes
pkill -f "next dev"

# Or kill all node processes (more aggressive)
pkill node
```

⚠️ **Warning:** `pkill node` will kill ALL Node.js processes. Only use if you're sure.

#### Verify Port is Free

After killing the process, verify the port is free:
```bash
# Should return nothing (port is free)
lsof -i:3001

# Now you can start the service again
pnpm --filter backend dev
```

### Frontend Build Errors

**If you see Tailwind CSS PostCSS errors:**

The error: `It looks like you're trying to use tailwindcss directly as a PostCSS plugin...`

**Solution:**
```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform/frontend"
pnpm remove tailwindcss
pnpm add -D 'tailwindcss@^3.4.0'
rm -rf .next  # Clear Next.js cache
```

Then restart the frontend:
```bash
pnpm --filter frontend dev
```

**If you see other build errors:**
1. Clear Next.js cache:
   ```bash
   cd frontend
   rm -rf .next
   ```
2. Restart the frontend service
3. Check that frontend terminal shows "Ready"
4. Check browser console for errors (F12)
5. Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Can't Login
1. Make sure backend is running (check terminal)
2. Check browser console for errors
3. Verify backend is accessible: `curl http://localhost:3001/health`

### Upload Video Fails / "Load failed" Error

**Most Common Cause: AWS S3 Configuration Missing**

The upload feature requires AWS S3 credentials. If you see "Load failed" or upload errors:

1. **Check AWS Configuration:**
   ```bash
   cd backend
   cat .env | grep AWS
   ```

2. **If AWS credentials are missing:**
   - Set up AWS S3 bucket and credentials
   - Add to `backend/.env`:
     ```env
     AWS_REGION=us-east-1
     AWS_ACCESS_KEY_ID=your-access-key
     AWS_SECRET_ACCESS_KEY=your-secret-key
     S3_BUCKET=vs-platform-uploads
     ```
   - Restart backend after adding credentials

3. **Check Error Details:**
   - Open browser DevTools (F12)
   - Check Console tab for detailed errors
   - Check Network tab for failed API requests

4. **See detailed troubleshooting:** See `UPLOAD_TROUBLESHOOTING.md` for complete guide

**Quick Test:**
```bash
# Test if backend can generate presigned URLs
# (Replace TOKEN with your actual token)
curl -X POST http://localhost:3001/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"contentType":"video/mp4","fileSize":1000000}'
```

If this fails, check backend logs for S3/AWS errors.

### Services Won't Start
1. **First, make sure Docker Desktop is running** (see Step 1)
2. Check Docker is running: `docker ps`
3. Check Docker services: `docker compose ps`
4. Restart Docker services: `docker compose restart`

### Docker Daemon Not Running Error
**If you see:** `Cannot connect to the Docker daemon... Is the docker daemon running?`

**Solution:**
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in menu bar)
3. Wait until Docker Desktop shows "Docker Desktop is running"
4. Try the command again

## Quick Commands Summary

```bash
# Start all in sequence (open 3 separate terminals):

# Terminal 1 - Docker
docker compose up -d postgres redis clickhouse

# Terminal 2 - Backend
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev

# Terminal 3 - Worker
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter worker dev

# Terminal 4 - Frontend
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter frontend dev
```

Then open: **http://localhost:3000** in your browser!

## Next Steps

1. ✅ View the login page design
2. ✅ Register/Login
3. ✅ Explore the dashboard
4. ✅ Check all navigation pages
5. ✅ Test responsive design on mobile
6. ✅ Test uploading a video
7. ✅ Check the watch page (focus mode)

For detailed testing instructions, see: `docs/verification-guide.md`

