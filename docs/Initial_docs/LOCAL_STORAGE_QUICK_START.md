# Local Storage - Quick Start Guide

## 🚀 Setup in 5 Minutes

### Step 1: Install Dependencies

```bash
cd backend
pnpm install multer @types/multer
```

### Step 2: Create Directories

```bash
mkdir -p backend/uploads/raw backend/uploads/hls
```

### Step 3: Set Environment Variables

**Backend `.env`:**
```bash
STORAGE_MODE=local
```

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_STORAGE_MODE=local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Worker `.env`:**
```bash
STORAGE_MODE=local
```

### Step 4: Restart Services

Restart backend, frontend, and worker services.

### Step 5: Test Upload

1. Go to `http://localhost:3000/upload`
2. Upload a video
3. Check `backend/uploads/raw/` for the file
4. Wait for processing
5. Check `backend/uploads/hls/` for HLS files
6. Play the video

## ✅ Verification

```bash
# Check files were created
ls -la backend/uploads/raw/
ls -la backend/uploads/hls/

# Check database
# s3Key should contain: /uploads/raw/{videoId}/original.mp4
# hlsPath should contain: /uploads/hls/{videoId}/master.m3u8
```

## 📁 Folder Structure

```
backend/uploads/
├── raw/
│   └── {videoId}/
│       └── original.mp4
└── hls/
    └── {videoId}/
        ├── master.m3u8
        └── segment_*.ts
```

## 🔄 Switching Modes

**To S3:**
```bash
STORAGE_MODE=s3
NEXT_PUBLIC_STORAGE_MODE=s3
# Configure AWS credentials
```

**To Local:**
```bash
STORAGE_MODE=local
NEXT_PUBLIC_STORAGE_MODE=local
```

That's it! 🎉

