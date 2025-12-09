# Complete Verification Guide - Day 1-5

This guide will help you systematically verify that all features from Day 1-4 are working correctly.

## 📋 Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Day 1-2: Authentication & Video Upload](#day-1-2-authentication--video-upload)
3. [Day 3: Transcoding & Processing](#day-3-transcoding--processing)
4. [Day 4: HLS Playback & Focus Mode](#day-4-hls-playback--focus-mode)
5. [Troubleshooting](#troubleshooting)
6. [Issue Reporting Template](#issue-reporting-template)

---

## Prerequisites & Setup

### Step 1: Verify All Services Are Running

Open a terminal and check:

```bash
# Navigate to project root
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"

# Check Docker services
docker compose ps
```

**Expected Output**: All services should show "Up" status:
- ✅ `vs-platform-postgres` (port 5432)
- ✅ `vs-platform-redis` (port 6379)
- ✅ `vs-platform-clickhouse` (ports 8123, 9000)

**If services are not running:**
```bash
docker compose up -d postgres redis clickhouse
```

### Step 2: Start Backend & Worker

**Terminal 1 - Backend:** ✅
```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter backend dev
```

**Expected Output:**
```
> backend@1.0.0 dev /Users/nikhilsmac/Documents/SMG Electric/VS platform/backend
> tsx watch src/index.ts

Backend server running on port 3001
```

**Terminal 2 - Worker:** ✅
```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter worker dev
```

**Expected Output:**
```
> worker@1.0.0 dev /Users/nikhilsmac/Documents/SMG Electric/VS platform/worker
> tsx watch src/index.ts

Worker service started
Listening for jobs on queue: video-processing
Concurrency: 2
```

**Terminal 3 - Frontend:** ✅
```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter frontend dev
```

**Expected Output:**
```
> frontend@1.0.0 dev /Users/nikhilsmac/Documents/SMG Electric/VS platform/frontend
> next dev

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in [time]ms
```

### Step 3: Verify Health Endpoints

**Backend Health:**
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2024-..."}
```

**Frontend:**
Open browser: http://localhost:3000

**Expected**: Home page loads without errors

---

## Day 1-2: Authentication & Video Upload

### Test 1: User Registration ✅

**Method A: Via Browser Console**

1. Open http://localhost:3000
2. Open Developer Console (F12 or Cmd+Option+I)
3. Run:
```javascript
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Response:', data);
  if (data.success && data.data.token) {
    localStorage.setItem('vs_platform_token', data.data.token);
    console.log('✅ Registration successful! Token saved.');
  } else {
    console.error('❌ Registration failed:', data);
  }
});
```

**Expected Result:**
- ✅ Response: `{ success: true, data: { token: "...", user: {...} } }`
- ✅ Token saved in localStorage
- ✅ Console shows success message

**Method B: Via cURL**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Check localStorage:**
```javascript
// In browser console
localStorage.getItem('vs_platform_token')
// Should return a JWT token string
```

### Test 2: User Login ✅

1. Go to http://localhost:3000/login
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Login" button

**Expected Result:**
- ✅ Redirects to home page
- ✅ Token saved in localStorage
- ✅ No error messages

**Verify Login via API:**
```bash
# Get token from localStorage first, then:
TOKEN="your-token-here"

curl http://localhost:3001/api/videos \
  -H "Authorization: Bearer $TOKEN"
```

### Test 3: Video Upload Flow

#### Step 3.1: Navigate to Upload Page

1. Go to http://localhost:3000/upload
2. Or click "Upload Video" button on home page

**Expected Result:**
- ✅ Upload page loads
- ✅ File input is visible
- ✅ Title and Description fields are present
- ✅ "Upload Video" button is visible

#### Step 3.2: Select Video File

1. Click file input or drag & drop
2. Select a test video file (MP4, MOV, AVI)
   - **Recommendation**: Use a small test video (< 50MB) for faster testing
   - **Note**: First upload will take time for transcoding

**Expected Result:**
- ✅ File name appears
- ✅ File size is shown
- ✅ No error messages

#### Step 3.3: Enter Video Details

1. **Title**: Enter "Test Video - Day 4 Verification"
2. **Description**: Enter "Testing upload functionality" (optional)

#### Step 3.4: Upload Video

1. Click "Upload Video" button
2. Watch the progress bar

**Expected Result:**
- ✅ Progress bar shows upload percentage
- ✅ Upload completes (100%)
- ✅ Success message: "Video uploaded successfully!"
- ✅ Video ID is displayed or logged

**Check Browser Console:**
- ✅ No errors
- ✅ Upload progress logs visible

**Verify Upload via API:**
```bash
# Replace {VIDEO_ID} with actual ID from upload response
curl http://localhost:3001/api/videos/{VIDEO_ID}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "...",
      "title": "Test Video - Day 4 Verification",
      "status": "PROCESSING",
      "s3Key": "...",
      "hlsPath": null,
      ...
    },
    "userProgress": null
  }
}
```

**Key Points:**
- ✅ Status should be `PROCESSING` initially
- ✅ `s3Key` should be present
- ✅ `hlsPath` will be `null` until transcoding completes

---

## Day 3: Transcoding & Processing

### Test 4: Monitor Transcoding Process

#### Step 4.1: Check Worker Logs

Look at the **Worker Terminal** (Terminal 2):

**Expected Logs:**
```
Starting video processing for video {videoId}
Downloading video from S3...
Video downloaded successfully
Starting FFmpeg transcoding for resolution: 240p
Transcoding 240p... [progress]
Starting FFmpeg transcoding for resolution: 360p
...
Video processing completed successfully
HLS files uploaded to S3
Database updated: status=READY, hlsPath=hls/{videoId}/master.m3u8
```

**If you see errors:**
- Note the error message
- Check if FFmpeg is installed: `ffmpeg -version`
- Check S3 credentials in backend `.env`

#### Step 4.2: Check Video Status Updates

**Poll the API every 10-15 seconds:**
```bash
# Replace {VIDEO_ID} with your video ID
curl http://localhost:3001/api/videos/{VIDEO_ID} | jq '.data.video.status'
```

**Expected Status Progression:**
1. `PROCESSING` → Video is being transcoded
2. `READY` → Transcoding complete, HLS files ready

**When status is `READY`, verify:**
```bash
curl http://localhost:3001/api/videos/{VIDEO_ID} | jq '.data.video.hlsPath'
```

**Expected Output:**
```
"hls/{videoId}/master.m3u8"
```

#### Step 4.3: Verify Database

```bash
# Connect to PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Check video status
SELECT id, title, status, "hlsPath", "createdAt" 
FROM videos 
ORDER BY "createdAt" DESC 
LIMIT 5;

# Check renditions
SELECT v.title, r.resolution, r.bitrate, r."hlsPath"
FROM videos v
JOIN renditions r ON r."videoId" = v.id
WHERE v.id = '{VIDEO_ID}';

# Exit
\q
```

**Expected Results:**
- ✅ Video status = `READY`
- ✅ `hlsPath` is set
- ✅ Multiple renditions exist (240p, 360p, 480p, 720p, 1080p)

---

## Day 4: HLS Playback & Focus Mode

### Test 5: Video Playback Page

#### Step 5.1: Navigate to Watch Page

1. Get your video ID from the upload response or API
2. Navigate to: http://localhost:3000/watch/{VIDEO_ID}

**Expected Result:**
- ✅ Page loads without errors
- ✅ Video player container is visible
- ✅ Video title and description are displayed
- ✅ "Exit Focus Mode" button is visible in header
- ✅ Session timer shows "Session: 0:00"

#### Step 5.2: Check Environment Variable

**Important**: Make sure CloudFront URL is configured:

1. Check `frontend/.env.local` or `frontend/.env`:
```bash
cat frontend/.env.local
```

2. Should contain:
```env
NEXT_PUBLIC_CLOUD_FRONT_URL=https://your-cloudfront-domain.cloudfront.net
```

**If not set:**
- For local testing, you can use a placeholder or your S3 URL
- The HLS URL will be constructed as: `{CLOUD_FRONT_URL}/{hlsPath}`

**Check Browser Console:**
```javascript
// Should show the constructed HLS URL
console.log('HLS URL:', /* check network tab for video requests */)
```

### Test 6: Video Player Functionality

#### Step 6.1: Video Loading

**Expected Behavior:**
- ✅ Video player initializes
- ✅ HLS manifest loads (check Network tab)
- ✅ Video starts playing (if autoplay enabled)
- ✅ Video controls are visible

**Check Browser Network Tab:**
- ✅ Request to `.m3u8` file (master playlist)
- ✅ Requests to `.ts` files (video segments)

#### Step 6.2: Playback Controls

**Test each control:**

1. **Play/Pause Button:**
   - ✅ Click to pause
   - ✅ Click to resume

2. **Volume Control:**
   - ✅ Adjust volume slider
   - ✅ Mute/unmute button works

3. **Progress Bar:**
   - ✅ Click to seek
   - ✅ Drag to seek
   - ✅ Shows current time / total time

4. **Fullscreen:**
   - ✅ Click fullscreen button
   - ✅ Video enters fullscreen
   - ✅ Exit fullscreen works

#### Step 6.3: Quality Selector

**Expected:**
- ✅ Quality menu button is visible
- ✅ Click shows available qualities (Auto, 240p, 360p, 480p, 720p, 1080p)
- ✅ Selecting a quality changes video resolution
- ✅ "Auto" enables adaptive bitrate

**If quality selector is missing:**
- Check browser console for errors
- Verify HLS manifest has multiple renditions
- Check Video.js initialization logs

#### Step 6.4: Playback Speed

**Expected:**
- ✅ Speed control button is visible
- ✅ Options: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- ✅ Changing speed affects playback rate

#### Step 6.5: Keyboard Shortcuts

**Test each shortcut (video player must be focused):**

1. **Space or K**: Play/Pause
   - ✅ Toggles playback

2. **F**: Fullscreen
   - ✅ Toggles fullscreen mode

3. **Arrow Left**: Seek backward 10 seconds
   - ✅ Video seeks back

4. **Arrow Right**: Seek forward 10 seconds
   - ✅ Video seeks forward

5. **Arrow Up**: Increase volume
   - ✅ Volume increases

6. **Arrow Down**: Decrease volume
   - ✅ Volume decreases

7. **M**: Mute/Unmute
   - ✅ Toggles mute

### Test 7: Resume Watching Feature

#### Step 7.1: Watch Video Partially

1. Start playing the video
2. Watch for 30-60 seconds
3. Note the current time position
4. **Stop the video** (pause or navigate away)

**Wait 5-10 seconds** for progress to save (debounced)

#### Step 7.2: Verify Progress Saved

**Check via API:**
```bash
# Replace {VIDEO_ID} with your video ID
# Replace {TOKEN} with your auth token
curl http://localhost:3001/api/videos/{VIDEO_ID} \
  -H "Authorization: Bearer {TOKEN}" | jq '.data.userProgress'
```

**Expected Output:**
```
30  # or whatever seconds you watched
```

**Check Database:**
```bash
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

SELECT "eventType", progress, timestamp
FROM analytics_events
WHERE "videoId" = '{VIDEO_ID}' AND "eventType" = 'PROGRESS'
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected:**
- ✅ Multiple PROGRESS events
- ✅ Progress values increase over time

#### Step 7.3: Resume Prompt

1. Navigate away from watch page
2. Navigate back to: http://localhost:3000/watch/{VIDEO_ID}

**Expected Result:**
- ✅ Resume prompt modal appears
- ✅ Shows: "Resume Watching? You were watching this video..."
- ✅ Two buttons: "Resume" and "Start from Beginning"

#### Step 7.4: Test Resume

1. Click "Resume" button

**Expected Result:**
- ✅ Modal closes
- ✅ Video player loads
- ✅ Video seeks to saved position (approximately)
- ✅ Video starts playing from that position

#### Step 7.5: Test Start from Beginning

1. Refresh the page
2. Click "Start from Beginning"

**Expected Result:**
- ✅ Modal closes
- ✅ Video starts from 0:00
- ✅ No resume prompt on next visit (until you watch again)

### Test 8: Focus Mode Features

#### Step 8.1: Focus Mode UI

**Verify UI Elements:**

1. **Dimmed Overlay:**
   - ✅ Dark overlay covers the page
   - ✅ Video player is highlighted/focused

2. **Session Timer:**
   - ✅ Timer in header shows "Session: 0:00"
   - ✅ Timer increments every second
   - ✅ Format: "MM:SS" or "HH:MM:SS"

3. **Exit Focus Mode Button:**
   - ✅ Button is visible in header
   - ✅ Clickable

#### Step 8.2: Cursor Auto-Hide

1. Move mouse around the page
2. Stop moving mouse
3. Wait 3 seconds

**Expected Result:**
- ✅ Cursor disappears after 3 seconds
- ✅ Cursor reappears when mouse moves

#### Step 8.3: Session Tracking

**Monitor Session Duration:**
- ✅ Timer starts when page loads
- ✅ Timer increments correctly
- ✅ Format is readable (e.g., "1:23" for 1 minute 23 seconds)

**Check Interruptions:**
1. Switch to another tab (blur window)
2. Switch back

**Expected:**
- ✅ Interruption is recorded (check console logs if available)
- ✅ Session continues tracking

#### Step 8.4: Exit Focus Mode

1. Click "Exit Focus Mode" button

**Expected Result:**
- ✅ Redirects to home page (`/`)
- ✅ Session ends
- ✅ No errors in console

### Test 9: Video Completion & Analytics

#### Step 9.1: Complete Video

1. Navigate to watch page
2. Let video play to the end
   - **OR** seek to near the end and let it finish

**Expected Result:**
- ✅ Video plays until end
- ✅ Player shows "Replay" or similar end state
- ✅ Focus session completion is logged

#### Step 9.2: Verify Analytics Event

**Check Database:**
```bash
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

SELECT "eventType", progress, "deviceInfo", timestamp
FROM analytics_events
WHERE "videoId" = '{VIDEO_ID}' AND "eventType" = 'COMPLETE'
ORDER BY timestamp DESC
LIMIT 1;
```

**Expected:**
- ✅ COMPLETE event exists
- ✅ `deviceInfo` contains focus session metadata (JSON)
- ✅ `progress` equals video duration (or close to it)

**Check deviceInfo JSON:**
```sql
SELECT "deviceInfo"::json
FROM analytics_events
WHERE "eventType" = 'COMPLETE'
ORDER BY timestamp DESC
LIMIT 1;
```

**Expected JSON structure:**
```json
{
  "focusSessionDuration": 120,
  "interruptions": 2,
  "sessionStartTime": "2024-..."
}
```

### Test 10: Progress Tracking During Playback

#### Step 10.1: Monitor Progress Updates

1. Open browser Developer Tools → Network tab
2. Filter by "progress" or watch for POST requests
3. Play video for 30+ seconds

**Expected:**
- ✅ POST requests to `/api/videos/{VIDEO_ID}/progress` every ~5 seconds
- ✅ Request payload: `{ progressSeconds: <number> }`
- ✅ Response: `{ success: true, data: { progressSeconds: <number> } }`

**Note**: Updates are debounced (2 seconds), so you may see them every 5-7 seconds.

#### Step 10.2: Verify Progress Persistence

1. Watch video for 1-2 minutes
2. Note the time position
3. Refresh the page
4. Check if resume prompt shows correct time

**Expected:**
- ✅ Resume prompt appears
- ✅ Time matches approximately where you left off

---

## Day 5: UI Redesign Testing

This section covers comprehensive testing for the complete UI redesign implemented in Day 5, including new layouts, navigation, pages, and authentication flow.

### Prerequisites

Before testing Day 5 features:

1. **Ensure frontend is running:**
   ```bash
   cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
   pnpm --filter frontend dev
   ```

2. **Verify dependencies are installed:**
   ```bash
   cd frontend
   pnpm list lucide-react tailwindcss
   ```

3. **Clear browser cache and localStorage:**
   - Open browser DevTools
   - Application tab → Clear storage → Clear site data
   - Or manually: `localStorage.clear()` in console

### Test 11: MainLayout Component ✅

#### Step 11.1: Verify Top Branding Bar

1. Navigate to any authenticated page (e.g., `/dashboard`)
2. Check the top bar

**Expected Result:**
- ✅ Top bar is white with subtle shadow
- ✅ "VS Platform" text is visible in navy blue (#0B214A)
- ✅ Text is bold and properly sized (text-2xl)
- ✅ Bar is sticky (stays at top when scrolling)
- ✅ Height is appropriate (h-16 / 4rem)

#### Step 11.2: Verify Left Sidebar - Desktop

1. On desktop viewport (width > 1024px)
2. Check the left sidebar

**Expected Result:**
- ✅ Sidebar is visible on the left
- ✅ Background color is navy blue (#0B214A)
- ✅ Width is 256px (w-64)
- ✅ All navigation items are visible:
  - Dashboard
  - Upload Video
  - My Videos
  - Watch History
  - Focus Mode
  - Analytics
  - Profile
  - Logout
- ✅ Icons are visible (from lucide-react)
- ✅ Text labels are visible next to icons
- ✅ Text color is white/white-80
- ✅ Sidebar extends to full viewport height

#### Step 11.3: Verify Navigation Item States

1. Click on different navigation items
2. Observe visual feedback

**Expected Result:**
- ✅ Active route is highlighted (bg-white/10)
- ✅ Active item text is fully white
- ✅ Hover state works (bg-white/5 on hover)
- ✅ Click transitions are smooth
- ✅ Current page's nav item is highlighted

**Test each navigation item:**
- Click "Dashboard" → Should navigate to `/dashboard` and highlight
- Click "Upload Video" → Should navigate to `/upload` and highlight
- Click "My Videos" → Should navigate to `/my-videos` and highlight
- Click "Watch History" → Should navigate to `/watch-history` and highlight
- Click "Focus Mode" → Should navigate to `/focus-mode` and highlight
- Click "Analytics" → Should navigate to `/analytics` and highlight
- Click "Profile" → Should navigate to `/profile` and highlight

#### Step 11.4: Verify Content Area

1. Navigate to any page
2. Check the main content area

**Expected Result:**
- ✅ Content area is white (bg-white)
- ✅ Has rounded corners (rounded-lg)
- ✅ Has subtle shadow (shadow-sm)
- ✅ Proper padding (p-6)
- ✅ Content is not hidden behind sidebar
- ✅ Text is readable (proper contrast)

#### Step 11.5: Verify Mobile Responsive Design

1. Open browser DevTools
2. Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select a mobile device (e.g., iPhone 12)
4. Refresh the page

**Expected Result:**
- ✅ Hamburger menu icon appears in top bar (left side)
- ✅ Sidebar is hidden by default
- ✅ Content area takes full width
- ✅ Top bar logo/text is visible

**Test mobile sidebar:**
1. Click hamburger menu icon

**Expected Result:**
- ✅ Sidebar slides in from left
- ✅ Overlay appears behind sidebar (bg-black/50)
- ✅ Sidebar contains all navigation items
- ✅ Close button (X) is visible in sidebar header
- ✅ Sidebar background is navy blue

2. Click on a navigation item

**Expected Result:**
- ✅ Sidebar closes automatically
- ✅ Page navigates correctly
- ✅ Overlay disappears

3. Click outside sidebar (on overlay)

**Expected Result:**
- ✅ Sidebar closes
- ✅ Overlay disappears

4. Click close button (X)

**Expected Result:**
- ✅ Sidebar closes
- ✅ Overlay disappears

### Test 12: AuthLayout & Login Page ✅

#### Step 12.1: Verify Login Page Layout

1. Navigate to `/login` or logout and visit root
2. Check the login page layout

**Expected Result:**
- ✅ Split-screen layout
- ✅ Left side: Login form area (white background)
- ✅ Right side: Background image area (on desktop/large screens)
- ✅ Layout is centered and responsive

#### Step 12.2: Verify Branding on Login Page

1. Check the left side of login page

**Expected Result:**
- ✅ "VS Platform" heading is visible (text-4xl, bold)
- ✅ Color is navy blue (#0B214A)
- ✅ "Welcome" text is visible below heading
- ✅ "Login with your email" subtitle is visible
- ✅ Typography is clean and readable

#### Step 12.3: Verify Login Form Fields

1. Check form input fields

**Expected Result:**
- ✅ Email field is visible with Mail icon
- ✅ Password field is visible with Lock icon
- ✅ Icons are positioned on the left inside input
- ✅ Placeholder text is visible:
  - Email: "Enter your email"
  - Password: "Enter your password"
- ✅ Fields have proper styling (border, rounded-lg)
- ✅ Focus state works (ring around input)

#### Step 12.4: Verify Password Visibility Toggle

1. Click in password field
2. Type a password
3. Look for eye icon on the right side of input

**Expected Result:**
- ✅ Eye icon (Eye/EyeOff from lucide-react) is visible
- ✅ Clicking icon toggles password visibility
- ✅ Password shows as dots when hidden
- ✅ Password shows as plain text when visible

#### Step 12.5: Verify Forgot Password Link

1. Check below password field

**Expected Result:**
- ✅ "Forgot your password?" link is visible
- ✅ Link is navy blue (#0B214A)
- ✅ Hover state works (darker shade)
- ✅ Link is right-aligned
- ✅ Clicking link doesn't cause errors (functionality can be placeholder)

#### Step 12.6: Verify Login Button

1. Check the login button

**Expected Result:**
- ✅ Button is full width
- ✅ Background is navy blue (#0B214A)
- ✅ Text is "LOGIN" in white
- ✅ Button is rounded-lg
- ✅ Hover state works (darker shade: #1a3d6b)
- ✅ Disabled state works (when loading)

**Test login flow:**
1. Enter valid credentials
2. Click "LOGIN"

**Expected Result:**
- ✅ Button shows loading state (spinner + "Logging in...")
- ✅ Button is disabled during loading
- ✅ After successful login, redirects to `/dashboard`
- ✅ Token is saved in localStorage

#### Step 12.7: Verify Error Handling

1. Enter invalid credentials
2. Click "LOGIN"

**Expected Result:**
- ✅ Error message appears above form
- ✅ Error is styled (red background, border)
- ✅ Error message is readable
- ✅ Form fields remain filled (except password maybe)
- ✅ Button returns to normal state

#### Step 12.8: Verify Responsive Login Layout

1. Resize browser to mobile width (< 1024px)

**Expected Result:**
- ✅ Right side (background image) is hidden
- ✅ Left side takes full width
- ✅ Form is still centered
- ✅ All form elements are visible
- ✅ Layout remains functional

### Test 13: Navigation & Routing ✅

#### Step 13.1: Verify Root Route Redirect

1. Clear localStorage or logout
2. Navigate to `http://localhost:3000/`

**Expected Result (Not Authenticated):**
- ✅ Automatically redirects to `/login`
- ✅ No flash of content
- ✅ No errors in console

**Test with authentication:**
1. Login first
2. Navigate to `http://localhost:3000/`

**Expected Result (Authenticated):**
- ✅ Automatically redirects to `/dashboard`
- ✅ Dashboard page loads correctly

#### Step 13.2: Verify Protected Routes

1. Clear localStorage: `localStorage.clear()` in console
2. Navigate to `/dashboard`

**Expected Result:**
- ✅ Redirects to `/login`
- ✅ No unauthorized content shown

**Test with token:**
1. Login and get token
2. Navigate to protected routes:
   - `/dashboard`
   - `/upload`
   - `/my-videos`
   - `/watch-history`
   - `/focus-mode`
   - `/analytics`
   - `/profile`

**Expected Result:**
- ✅ All routes load correctly
- ✅ MainLayout is present on all pages
- ✅ No redirects to login
- ✅ Content is displayed

#### Step 13.3: Verify Navigation Links

1. Test each navigation link in sidebar

**For each nav item:**
- Click link
- Verify URL changes
- Verify page content loads
- Verify active state updates

**Expected Result:**
- ✅ URL matches the href
- ✅ Page content loads correctly
- ✅ Active nav item is highlighted
- ✅ Previous active state is removed
- ✅ No page refresh (client-side navigation)

### Test 14: Dashboard Page ✅

#### Step 14.1: Verify Dashboard Loads

1. Navigate to `/dashboard`
2. Check page content

**Expected Result:**
- ✅ Page title: "Dashboard"
- ✅ Subtitle: "Welcome back! Here's an overview of your activity."
- ✅ MainLayout is present
- ✅ Page loads without errors

#### Step 14.2: Verify Statistics Cards

**Expected Result:**
- ✅ Four stat cards are visible in a grid
- ✅ Cards display:
  - Total Videos (with Video icon)
  - Watch Time (hrs) (with Clock icon)
  - Completion Rate (with TrendingUp icon)
  - Total Views (with Eye icon)
- ✅ Each card has:
  - Icon on the right
  - Label text
  - Value (number/percentage)
  - Proper spacing and styling

**Test loading state:**
- ✅ Loading spinner appears initially
- ✅ Cards populate with data after load

#### Step 14.3: Verify Quick Action Buttons

1. Check below stat cards

**Expected Result:**
- ✅ Two action buttons are visible:
  - "Upload New Video" (navy blue, links to `/upload`)
  - "My Videos" (gray, links to `/my-videos`)
- ✅ Buttons have hover states
- ✅ Clicking buttons navigates correctly

#### Step 14.4: Verify Responsive Dashboard

1. Resize to tablet/mobile view

**Expected Result:**
- ✅ Stat cards stack or reflow appropriately
- ✅ Grid adapts (1 column on mobile, 2 on tablet, 4 on desktop)
- ✅ Quick actions stack vertically on mobile
- ✅ Content remains readable

### Test 15: My Videos Page ✅

#### Step 15.1: Verify Page Loads

1. Navigate to `/my-videos`

**Expected Result:**
- ✅ Page title: "My Videos"
- ✅ Subtitle: "Manage and view all your uploaded videos"
- ✅ MainLayout is present

#### Step 15.2: Verify Video Grid

**If videos exist:**
- ✅ Videos displayed in grid (responsive: 1/2/3 columns)
- ✅ Each video card shows:
  - Thumbnail or placeholder
  - Video title
  - Description (if available, truncated)
  - Status badge
  - Duration badge (on thumbnail)
  - View count indicator

**If no videos:**
- ✅ Empty state message: "No videos found"
- ✅ "Upload Your First Video" button visible
- ✅ Button links to `/upload`

#### Step 15.3: Verify Video Card Interactions

1. Click on a video card

**Expected Result:**
- ✅ Navigates to `/watch/{videoId}`
- ✅ Video watch page loads
- ✅ Card has hover effect (shadow-lg)

#### Step 15.4: Verify Video Status Display

1. Check status badges on video cards

**Expected Result:**
- ✅ Status is displayed (capitalized)
- ✅ Status colors/style are appropriate
- ✅ Multiple status types are supported

### Test 16: Watch History Page ✅

#### Step 16.1: Verify Page Loads

1. Navigate to `/watch-history`

**Expected Result:**
- ✅ Page title: "Watch History"
- ✅ Subtitle: "Continue watching from where you left off"
- ✅ MainLayout is present

#### Step 16.2: Verify History List

**If history exists:**
- ✅ List of watched videos is displayed
- ✅ Each item shows:
  - Thumbnail (left side)
  - Video title
  - Last watched date
  - Progress indicator (percentage)
  - Progress bar on thumbnail
  - "Resume Watching →" link

**If no history:**
- ✅ Empty state with Clock icon
- ✅ Message: "No watch history yet"
- ✅ "Browse Videos" link to `/my-videos`

#### Step 16.3: Verify Resume Functionality

1. Click on a history item

**Expected Result:**
- ✅ Navigates to watch page
- ✅ Resume prompt should appear (tested in Day 4)
- ✅ Video loads

### Test 17: Focus Mode Page ✅

#### Step 17.1: Verify Page Loads

1. Navigate to `/focus-mode`

**Expected Result:**
- ✅ Focus icon is visible in header
- ✅ Page title: "Focus Mode"
- ✅ Subtitle explaining focus mode
- ✅ MainLayout is present

#### Step 17.2: Verify Information Section

**Expected Result:**
- ✅ Information card with blue background
- ✅ Target icon visible
- ✅ Title: "What is Focus Mode?"
- ✅ List of features:
  - Interface elements minimized
  - Cursor auto-hides
  - Focus session tracking
  - Interruption monitoring
  - Task-based consumption

#### Step 17.3: Verify Video List

**If videos exist:**
- ✅ Grid of videos available for focus mode
- ✅ Each card has:
  - Thumbnail
  - Title
  - Duration
  - Hover effect with "Start Focus Session" button
- ✅ Clicking video navigates to watch page

**If no videos:**
- ✅ Empty state with Focus icon
- ✅ Message about no videos available
- ✅ Link to upload videos

### Test 18: Analytics Page ✅

#### Step 18.1: Verify Page Loads

1. Navigate to `/analytics`

**Expected Result:**
- ✅ Analytics icon in header
- ✅ Page title: "Analytics"
- ✅ Subtitle about tracking performance
- ✅ MainLayout is present

#### Step 18.2: Verify Metrics Cards

**Expected Result:**
- ✅ Four metric cards:
  - Total Views (with Eye icon)
  - Watch Time (hrs) (with Clock icon)
  - Completion Rate (with TrendingUp icon)
  - Avg Watch Time (min) (with Users icon)
- ✅ Each card shows icon and value
- ✅ Cards are styled consistently

#### Step 18.3: Verify Top Videos Section

**Expected Result:**
- ✅ "Top Performing Videos" section
- ✅ List of videos with:
  - Ranking number (1, 2, 3...)
  - Video title
  - View count
- ✅ Videos ordered by performance

#### Step 18.4: Verify Chart Placeholder

**Expected Result:**
- ✅ "Engagement Over Time" section
- ✅ Placeholder area for chart
- ✅ Message: "Chart visualization will be implemented here"

### Test 19: Admin Panel ✅

#### Step 19.1: Verify Admin-Only Visibility

**Test as non-admin user:**
1. Login with regular user account
2. Check sidebar

**Expected Result:**
- ✅ "Admin Panel" item is NOT visible in sidebar
- ✅ Navigating to `/admin` directly should show error or redirect

**Test as admin user:**
1. Login with admin account (role: 'ADMIN')
2. Check sidebar

**Expected Result:**
- ✅ "Admin Panel" item IS visible in sidebar
- ✅ Item appears before "Profile"
- ✅ Can navigate to `/admin`

#### Step 19.2: Verify Admin Page Loads

1. Navigate to `/admin` (as admin)

**Expected Result:**
- ✅ Shield icon in header
- ✅ Page title: "Admin Panel"
- ✅ Subtitle about management
- ✅ MainLayout is present

#### Step 19.3: Verify Admin Statistics

**Expected Result:**
- ✅ Three stat cards:
  - Total Users (with Users icon)
  - Total Videos (with Video icon)
  - Pending Review (with Clock icon)
- ✅ Each shows count/value

#### Step 19.4: Verify Moderation Section

**If videos pending review:**
- ✅ "Videos Pending Review" section
- ✅ List of videos with:
  - Title
  - Uploader email
  - Upload date
  - "Approve" button (green)
  - "Reject" button (red)

**If no pending videos:**
- ✅ Message: "No videos pending review"

#### Step 19.5: Verify Admin Actions

1. Click "Approve" on a video

**Expected Result:**
- ✅ Button action triggers (backend integration needed)
- ✅ UI updates appropriately

1. Click "Reject" on a video

**Expected Result:**
- ✅ Button action triggers
- ✅ UI updates appropriately

### Test 20: Profile Page ✅

#### Step 20.1: Verify Page Loads

1. Navigate to `/profile`

**Expected Result:**
- ✅ Page title: "Profile"
- ✅ Subtitle about account settings
- ✅ MainLayout is present

#### Step 20.2: Verify Profile Header

**Expected Result:**
- ✅ Profile picture/avatar (circular, navy blue background)
- ✅ User icon visible in avatar
- ✅ Email displayed (large text)
- ✅ Role displayed (capitalized)
- ✅ "Edit" button on the right

#### Step 20.3: Verify Profile Details

**Expected Result:**
- ✅ Three detail sections:
  - Email (with Mail icon)
  - Role (with Shield icon)
  - Member Since (with Calendar icon)
- ✅ Each shows label and value
- ✅ Icons are positioned on left

#### Step 20.4: Verify Account Actions

**Expected Result:**
- ✅ "Account Actions" section
- ✅ Three buttons:
  - "Change Password"
  - "Notification Settings"
  - "Delete Account" (red text)
- ✅ Buttons have hover states
- ✅ Buttons are full width

### Test 21: Upload Page with New Layout ✅

#### Step 21.1: Verify Upload Page Layout

1. Navigate to `/upload`

**Expected Result:**
- ✅ MainLayout is present
- ✅ Upload form is in white content area
- ✅ Page title: "Upload Video"
- ✅ Form fields are properly styled

#### Step 21.2: Verify Form Styling

**Expected Result:**
- ✅ File input is styled
- ✅ Title and Description fields have proper borders
- ✅ Focus states use navy blue ring (#0B214A)
- ✅ Upload button is navy blue
- ✅ Button hover state works
- ✅ All styling matches theme

### Test 22: Authentication Utilities ✅

#### Step 22.1: Verify Token Decoding

1. Login and get token
2. Open browser console
3. Run:
```javascript
// Get token
const token = localStorage.getItem('vs_platform_token');

// Test decoding (function exists in auth.ts)
// Should be able to decode and see user info
```

**Expected Result:**
- ✅ Token can be decoded
- ✅ User info is accessible (id, email, role)
- ✅ No errors

#### Step 22.2: Verify Authentication Checks

**Test in console:**
```javascript
// Check if authenticated
isAuthenticated() // Should return true

// Check role
isAdmin() // Should return true/false based on user

// Get current user
getCurrentUser() // Should return user object
```

**Expected Result:**
- ✅ Functions work correctly
- ✅ Returns expected values
- ✅ No errors

#### Step 22.3: Verify Logout Functionality

1. Click "Logout" in sidebar

**Expected Result:**
- ✅ Token is removed from localStorage
- ✅ Redirects to `/login`
- ✅ No errors in console

**Verify logout:**
```javascript
// After logout
localStorage.getItem('vs_platform_token') // Should be null
isAuthenticated() // Should return false
```

### Test 23: Color Scheme & Styling ✅

#### Step 23.1: Verify Navy Blue Theme

1. Check all UI elements

**Expected Result:**
- ✅ Primary buttons are navy blue (#0B214A)
- ✅ Hover states use darker navy (#1a3d6b)
- ✅ Sidebar background is navy blue (#0B214A)
- ✅ Links and active states use navy blue
- ✅ Branding text is navy blue

#### Step 23.2: Verify White Content Areas

**Expected Result:**
- ✅ Main content areas are white
- ✅ Cards are white
- ✅ Forms are white
- ✅ Good contrast with navy blue text

#### Step 23.3: Verify Typography

**Expected Result:**
- ✅ Headings are bold and properly sized
- ✅ Body text is readable (gray-600, gray-900)
- ✅ Font family is system fonts (San Francisco, etc.)
- ✅ Text is properly spaced

#### Step 23.4: Verify Shadows & Borders

**Expected Result:**
- ✅ Cards have subtle shadows (shadow-sm)
- ✅ Borders are subtle (gray-200)
- ✅ Top bar has shadow for separation
- ✅ Buttons have no shadows (flat design)

### Test 24: Responsive Design ✅

#### Step 24.1: Test Desktop (1920x1080)

**Expected Result:**
- ✅ Sidebar is always visible
- ✅ Content area is properly sized
- ✅ All elements are visible
- ✅ No horizontal scrolling

#### Step 24.2: Test Tablet (768x1024)

**Expected Result:**
- ✅ Sidebar is hidden
- ✅ Hamburger menu is visible
- ✅ Grids adapt (2 columns instead of 3-4)
- ✅ Content remains readable

#### Step 24.3: Test Mobile (375x667)

**Expected Result:**
- ✅ Sidebar is hidden
- ✅ Hamburger menu works
- ✅ Single column layouts
- ✅ Touch targets are adequate size
- ✅ Forms are full width
- ✅ Buttons are full width or stacked
- ✅ No horizontal scrolling

#### Step 24.4: Test Breakpoints

**Test at different widths:**
- 320px (small mobile)
- 768px (tablet)
- 1024px (desktop breakpoint)
- 1280px (large desktop)
- 1920px (full HD)

**Expected Result:**
- ✅ Layout adapts at breakpoints
- ✅ No layout breaks
- ✅ Content remains accessible

### Test 25: Watch Page (Focus Mode) ✅

#### Step 25.1: Verify Watch Page Does NOT Use MainLayout

1. Navigate to `/watch/{videoId}`

**Expected Result:**
- ✅ MainLayout is NOT present
- ✅ Full-screen black background
- ✅ Focus mode UI as before
- ✅ Video player takes center stage
- ✅ No sidebar or top bar (except focus mode header)

**Note:** This is intentional - watch page maintains its full-screen focus mode design.

### Quick Verification Checklist - Day 5

Use this checklist to quickly verify all Day 5 features:

#### Layout Components
- [ ] MainLayout top bar displays correctly
- [ ] Sidebar visible on desktop
- [ ] Sidebar hidden on mobile
- [ ] Hamburger menu works on mobile
- [ ] AuthLayout displays correctly on login page
- [ ] Split-screen layout works on login (desktop)
- [ ] Single column layout works on login (mobile)

#### Navigation
- [ ] All navigation items visible
- [ ] Icons display correctly (lucide-react)
- [ ] Active route highlighting works
- [ ] Hover states work
- [ ] Click navigation works
- [ ] Mobile sidebar opens/closes correctly
- [ ] Admin Panel hidden for non-admins
- [ ] Logout button works

#### Pages
- [ ] Dashboard loads and displays stats
- [ ] My Videos page loads and shows videos
- [ ] Watch History page loads
- [ ] Focus Mode page loads
- [ ] Analytics page loads
- [ ] Admin Panel loads (admin only)
- [ ] Profile page loads
- [ ] Upload page uses MainLayout
- [ ] Watch page does NOT use MainLayout

#### Authentication
- [ ] Login page redesign works
- [ ] Password visibility toggle works
- [ ] Login flow redirects correctly
- [ ] Protected routes redirect to login
- [ ] Authentication utilities work
- [ ] Logout clears token and redirects

#### Styling
- [ ] Navy blue theme applied correctly
- [ ] White content areas
- [ ] Responsive design works
- [ ] Typography is consistent
- [ ] Shadows and borders look good

#### Responsive
- [ ] Desktop layout works
- [ ] Tablet layout works
- [ ] Mobile layout works
- [ ] Breakpoints transition smoothly

---

## Troubleshooting

### Issue: Backend Not Starting

**Symptoms:**
- `pnpm --filter backend dev` fails
- Error: `EADDRINUSE: address already in use :::3001`
- Port 3001 already in use
- Database connection errors

**Solutions:**

1. **Quick Fix - Kill all backend processes:**
```bash
# Kill all backend processes
pkill -f "backend.*tsx"

# Or kill the specific process using port 3001
lsof -ti:3001 | xargs kill -9

# Verify port is free
lsof -ti:3001 || echo "Port 3001 is now free"
```

2. **Check if port is in use:**
```bash
lsof -i :3001
# Kill process if needed
kill -9 <PID>
```

3. **Check database connection:**
```bash
docker compose ps postgres
# Should show "Up"
```

4. **Check backend .env:**
```bash
cat backend/.env
# Verify DATABASE_URL, REDIS_URL, etc.
```

### Issue: Worker Not Processing Videos

**Symptoms:**
- Video stuck in `PROCESSING` status
- No logs in worker terminal
- Job not picked up

**Solutions:**

1. **Check worker is running:**
```bash
ps aux | grep worker
```

2. **Check Redis connection:**
```bash
docker compose ps redis
redis-cli ping
# Should return "PONG"
```

3. **Check BullMQ queue:**
```bash
# In worker terminal, you should see connection logs
```

4. **Check FFmpeg:**
```bash
ffmpeg -version
# Should show version info
```

### Issue: Frontend Showing 404 Error

**Symptoms:**
- Frontend loads but shows "404: This page could not be found"
- Home page at http://localhost:3000 returns 404
- Multiple Next.js processes running

**Solutions:**

1. **Quick Fix - Clean restart:**
```bash
# Stop all frontend processes
pkill -f "next dev"

# Remove build cache
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform/frontend"
rm -rf .next

# Restart frontend
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
pnpm --filter frontend dev
```

2. **Check for multiple processes:**
```bash
ps aux | grep "next dev" | grep -v grep
# Kill all if multiple instances found
pkill -f "next dev"
```

3. **Verify page.tsx exists:**
```bash
ls -la frontend/src/app/page.tsx
# Should show the file exists
```

### Issue: Video Player Not Loading

**Symptoms:**
- Blank player area
- Console errors about HLS
- "HLS is not supported" message

**Solutions:**

1. **Check HLS URL:**
```javascript
// In browser console
console.log('HLS URL:', /* check what URL is being used */)
```

2. **Check CloudFront URL:**
```bash
cat frontend/.env.local | grep CLOUD_FRONT_URL
```

3. **Check CORS:**
- If using real S3/CloudFront, ensure CORS is configured
- For local testing, may need to configure CORS headers

4. **Check Network Tab:**
- Verify `.m3u8` file is accessible
- Check for 404 or CORS errors

### Issue: Resume Watching Not Working

**Symptoms:**
- No resume prompt appears
- Progress not saving
- Wrong resume position

**Solutions:**

1. **Check authentication:**
```javascript
// In browser console
localStorage.getItem('vs_platform_token')
// Should return token
```

2. **Check API response:**
```bash
curl http://localhost:3001/api/videos/{VIDEO_ID} \
  -H "Authorization: Bearer {TOKEN}" | jq '.data.userProgress'
```

3. **Check progress updates:**
- Open Network tab
- Look for POST requests to `/progress` endpoint
- Verify they're being sent

4. **Check debounce timing:**
- Progress saves after 2 seconds of no updates
- Wait 5-10 seconds after pausing before checking

### Issue: Focus Mode Timer Not Working

**Symptoms:**
- Timer stuck at 0:00
- Timer not incrementing
- Timer format incorrect

**Solutions:**

1. **Check browser console for errors**
2. **Verify useFocusMode hook:**
```javascript
// Check if session started
// Timer should increment every second
```

3. **Check React state updates:**
- Timer uses `setInterval` - verify it's running
- Check for component re-renders breaking interval

### Issue: Quality Selector Missing

**Symptoms:**
- No quality button in player
- Only one quality available

**Solutions:**

1. **Check HLS manifest:**
- Verify video has multiple renditions in database
- Check master.m3u8 file has multiple streams

2. **Check Video.js initialization:**
- Look for errors in console
- Verify hls.js is loaded correctly

3. **Check browser support:**
- Some browsers may not show quality selector
- Try different browser

---

## Issue Reporting Template

If you encounter issues, use this template to report them:

```markdown
### Issue Report

**Feature**: [e.g., Video Upload, Resume Watching, Focus Mode]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Error Messages**:
[Copy error messages from console/logs]

**Environment**:
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Node Version: [e.g., v20.10.0]

**Backend Logs**:
```
[Paste relevant backend logs]
```

**Worker Logs**:
```
[Paste relevant worker logs]
```

**Browser Console**:
```
[Paste browser console errors]
```

**Network Requests**:
- Request URL: [e.g., /api/videos/123]
- Request Method: [e.g., POST]
- Status Code: [e.g., 500]
- Response: [Paste response]

**Additional Context**:
[Any other relevant information]
```

---

## Quick Verification Checklist

Use this checklist to quickly verify all features:

### Day 1-2: Authentication & Upload
- [ ] User registration works
- [ ] User login works
- [ ] Token saved in localStorage
- [ ] Upload page loads
- [ ] Video file selection works
- [ ] Video upload completes
- [ ] Progress bar shows upload progress
- [ ] Video registered in database (status: PROCESSING)

### Day 3: Transcoding
- [ ] Worker picks up job
- [ ] FFmpeg transcoding starts
- [ ] Multiple renditions created
- [ ] HLS files uploaded to S3
- [ ] Video status changes to READY
- [ ] hlsPath is set in database
- [ ] Renditions exist in database

### Day 4: Playback & Focus Mode
- [ ] Watch page loads
- [ ] Video player initializes
- [ ] HLS stream loads and plays
- [ ] Playback controls work
- [ ] Quality selector appears and works
- [ ] Playback speed control works
- [ ] Keyboard shortcuts work
- [ ] Resume prompt appears after watching
- [ ] Resume functionality works
- [ ] Progress saves during playback
- [ ] Focus mode UI displays correctly
- [ ] Session timer increments
- [ ] Cursor auto-hides
- [ ] Exit focus mode works
- [ ] Analytics events logged on completion

### Day 5: UI Redesign
- [ ] MainLayout top bar displays correctly
- [ ] Sidebar visible on desktop with all nav items
- [ ] Sidebar hidden on mobile, hamburger menu works
- [ ] Navigation items highlight when active
- [ ] AuthLayout displays correctly on login page
- [ ] Login form fields work (email, password, visibility toggle)
- [ ] Dashboard page loads with stats cards
- [ ] My Videos page displays video grid
- [ ] Watch History page shows history list
- [ ] Focus Mode page displays correctly
- [ ] Analytics page shows metrics
- [ ] Admin Panel visible only for admin users
- [ ] Profile page displays user information
- [ ] Upload page uses new MainLayout
- [ ] Watch page maintains full-screen (no MainLayout)
- [ ] Authentication flow works (login/logout)
- [ ] Protected routes redirect correctly
- [ ] Navy blue theme applied throughout
- [ ] Responsive design works on all screen sizes
- [ ] All icons display correctly (lucide-react)

---

## Next Steps

After verifying all features:

1. **Test with different video formats** (MP4, MOV, AVI)
2. **Test with different video sizes** (small, medium, large)
3. **Test with multiple users** (different accounts)
4. **Test edge cases** (very long videos, network interruptions)
5. **Performance testing** (multiple concurrent uploads)

---

## Support

If you encounter issues not covered in this guide:

1. Check the troubleshooting section
2. Review browser console and server logs
3. Use the issue reporting template
4. Document the issue with screenshots/logs

Good luck with your testing! 🚀

