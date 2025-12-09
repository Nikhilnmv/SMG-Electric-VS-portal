# Local Storage Folder Structure

## Updated Project Structure

```
VS platform/
├── backend/
│   ├── uploads/                    # NEW: Local file storage
│   │   ├── raw/                    # Raw uploaded videos
│   │   │   └── {videoId}/
│   │   │       └── original.mp4
│   │   └── hls/                    # Transcoded HLS files
│   │       └── {videoId}/
│   │           ├── master.m3u8
│   │           └── segment_*.ts
│   │       └── {categoryRole}/     # If HLS_PREFIX_BY_CATEGORY=true
│   │           └── {videoId}/
│   │               ├── master.m3u8
│   │               └── segment_*.ts
│   ├── src/
│   │   ├── services/
│   │   │   ├── localStorage.ts     # NEW: Local storage service
│   │   │   └── s3.ts               # Existing: S3 service (gated by STORAGE_MODE)
│   │   ├── controllers/
│   │   │   └── uploadController.ts # UPDATED: Added uploadLocal endpoint
│   │   └── routes/
│   │       ├── upload.ts           # UPDATED: Added upload-local route
│   │       └── videos.ts           # UPDATED: Added upload-local route
│   └── package.json                # UPDATED: Added multer dependency
│
├── worker/
│   ├── src/
│   │   ├── services/
│   │   │   ├── localStorage.ts     # NEW: Local storage service
│   │   │   └── s3.ts               # Existing: S3 service (gated by STORAGE_MODE)
│   │   └── queue/
│   │       └── videoProcessing.ts  # UPDATED: Supports both local and S3
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── upload/
│   │       │   └── page.tsx        # UPDATED: Supports local and S3 uploads
│   │       └── watch/
│   │           └── [videoId]/
│   │               └── page.tsx    # UPDATED: Handles local HLS URLs
│   └── env.example                 # UPDATED: Added NEXT_PUBLIC_STORAGE_MODE
│
└── docs/
    ├── LOCAL_STORAGE_IMPLEMENTATION.md  # NEW: Implementation guide
    ├── LOCAL_STORAGE_TESTING.md         # NEW: Testing guide
    └── LOCAL_STORAGE_FOLDER_STRUCTURE.md # NEW: This file
```

## Directory Details

### backend/uploads/

**Purpose:** Stores all uploaded and processed video files in local storage mode.

**Structure:**
```
uploads/
├── raw/                    # Raw video files
│   └── {videoId}/         # One directory per video
│       └── original.{ext}  # Original uploaded file (mp4, mov, etc.)
│
└── hls/                    # Transcoded HLS files
    ├── {videoId}/         # Standard structure
    │   ├── master.m3u8    # HLS manifest
    │   ├── segment_0.ts   # Video segments
    │   ├── segment_1.ts
    │   └── ...
    │
    └── {categoryRole}/     # If HLS_PREFIX_BY_CATEGORY=true
        └── {videoId}/
            ├── master.m3u8
            └── segment_*.ts
```

**File Naming:**
- Raw files: `original.{extension}` (e.g., `original.mp4`)
- HLS manifest: `master.m3u8`
- HLS segments: `segment_{index}.ts`

**Access:**
- Raw files: Not directly accessible via HTTP (internal use only)
- HLS files: Served via Express static middleware at `/uploads/hls/...`

## File Paths

### Database Storage

**Video.s3Key field:**
- **Local mode:** `/uploads/raw/{videoId}/original.mp4`
- **S3 mode:** `raw/{uuid}.mp4` (S3 key)

**Video.hlsPath field:**
- **Local mode:** `/uploads/hls/{videoId}/master.m3u8`
- **S3 mode:** `hls/{videoId}/master.m3u8` (S3 key)

### HTTP URLs

**Local Storage:**
- Raw file: Not accessible (internal)
- HLS manifest: `http://localhost:3001/uploads/hls/{videoId}/master.m3u8`
- HLS segments: `http://localhost:3001/uploads/hls/{videoId}/segment_*.ts`

**S3 Storage:**
- Raw file: Not directly accessible
- HLS manifest: `https://cloudfront.net/hls/{videoId}/master.m3u8`
- HLS segments: `https://cloudfront.net/hls/{videoId}/segment_*.ts`

## Environment Variables

### Backend

```bash
# Storage mode
STORAGE_MODE=local  # or 's3'

# Uploads directory (optional, defaults to backend/uploads)
UPLOADS_DIR=./uploads

# HLS path prefixing (optional)
HLS_PREFIX_BY_CATEGORY=false
```

### Frontend

```bash
# Storage mode
NEXT_PUBLIC_STORAGE_MODE=local  # or 's3'

# Backend URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# CloudFront URL (S3 mode only)
NEXT_PUBLIC_CLOUD_FRONT_URL=
```

### Worker

```bash
# Storage mode
STORAGE_MODE=local  # or 's3'

# Uploads directory (should point to backend/uploads)
UPLOADS_DIR=../backend/uploads

# HLS path prefixing (optional)
HLS_PREFIX_BY_CATEGORY=false
```

## File Size Considerations

### Default Limits

- **Multer limit:** 500MB per file
- **Disk space:** Limited by server storage
- **No automatic cleanup:** Implement cleanup job

### Recommendations

1. **Monitor disk usage:**
   ```bash
   du -sh backend/uploads/
   ```

2. **Set up cleanup job:**
   - Delete videos older than X days
   - Delete rejected videos
   - Clean up failed uploads

3. **Implement quotas:**
   - Per-user storage limits
   - Total storage limits

## Security

### File Access

- **Raw files:** Not served via HTTP (internal use only)
- **HLS files:** Served via Express static middleware
- **Authentication:** Handled at API level, not file level

### Recommendations

1. **Add authentication middleware** for `/uploads` route (optional)
2. **Validate file types** on upload
3. **Scan for malware** (if needed)
4. **Implement rate limiting** on upload endpoint
5. **Monitor for suspicious activity**

## Backup Strategy

### Local Storage

Since files are stored locally, implement backup:

1. **Regular backups:**
   ```bash
   tar -czf backups/uploads-$(date +%Y%m%d).tar.gz backend/uploads/
   ```

2. **Automated backup script:**
   - Daily backups
   - Keep last 7 days
   - Compress old backups

3. **Cloud backup:**
   - Sync to S3/Backblaze
   - Or use rsync to backup server

## Migration

### From S3 to Local

1. Set `STORAGE_MODE=local` in all services
2. Restart services
3. New uploads use local storage
4. Existing S3 videos continue to work (if CloudFront URL set)

### From Local to S3

1. Set `STORAGE_MODE=s3` in all services
2. Configure AWS credentials
3. Restart services
4. New uploads use S3
5. Local videos not accessible (consider migrating)

## Cleanup

### Remove Test Files

```bash
# Remove all files
rm -rf backend/uploads/raw/*
rm -rf backend/uploads/hls/*

# Remove specific video
rm -rf backend/uploads/raw/{videoId}
rm -rf backend/uploads/hls/{videoId}
```

### Database Cleanup

```sql
-- Delete videos and related files
DELETE FROM videos WHERE id = '{videoId}';
-- Then manually delete files from uploads directory
```

## Testing Checklist

- [ ] Upload directory created
- [ ] Files save to `uploads/raw/{videoId}/`
- [ ] Worker processes videos
- [ ] HLS files save to `uploads/hls/{videoId}/`
- [ ] Static file serving works
- [ ] Videos play in browser
- [ ] Category-based paths work (if enabled)
- [ ] S3 mode still works (if configured)

