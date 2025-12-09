# Local Storage Setup Instructions

## Quick Setup

### 1. Install Dependencies

```bash
# Install multer in backend
cd backend
pnpm install multer @types/multer
```

### 2. Create Uploads Directory

```bash
mkdir -p backend/uploads/raw
mkdir -p backend/uploads/hls
```

### 3. Set Environment Variables

**Backend `.env`:**
```bash
STORAGE_MODE=local
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
REDIS_URL=redis://localhost:6379
```

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_STORAGE_MODE=local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Worker `.env`:**
```bash
STORAGE_MODE=local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vs_platform
REDIS_URL=redis://localhost:6379
```

### 4. Restart Services

```bash
# Backend
cd backend
pnpm dev

# Frontend (new terminal)
cd frontend
pnpm dev

# Worker (new terminal)
cd worker
pnpm dev
```

## Testing

1. Navigate to `http://localhost:3000/upload`
2. Select a video file
3. Enter title and upload
4. Verify file in `backend/uploads/raw/{videoId}/`
5. Wait for worker to process
6. Verify HLS files in `backend/uploads/hls/{videoId}/`
7. Play video and verify it works

## File Structure After Upload

```
backend/uploads/
├── raw/
│   └── clx123abc.../
│       └── original.mp4
└── hls/
    └── clx123abc.../
        ├── master.m3u8
        ├── segment_0.ts
        ├── segment_1.ts
        └── ...
```

## Switching Between Storage Modes

### To Use Local Storage:
```bash
# Set in all .env files
STORAGE_MODE=local
NEXT_PUBLIC_STORAGE_MODE=local
```

### To Use S3:
```bash
# Set in all .env files
STORAGE_MODE=s3
NEXT_PUBLIC_STORAGE_MODE=s3

# Configure AWS credentials in backend/.env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket
```

## Troubleshooting

See `docs/LOCAL_STORAGE_TESTING.md` for detailed troubleshooting guide.

