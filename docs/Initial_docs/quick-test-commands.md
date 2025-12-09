# Quick Test Commands Reference

Quick reference for common testing commands and checks.

## 🚀 Starting Services

```bash
# Start all Docker services
docker compose up -d postgres redis clickhouse

# Start backend
pnpm --filter backend dev

# Start worker
pnpm --filter worker dev

# Start frontend
pnpm --filter frontend dev
```

## 🔍 Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Check Docker services
docker compose ps

# Check Redis
redis-cli ping

# Check PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform -c "SELECT 1;"
```

## 👤 Authentication

```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check token in browser console
localStorage.getItem('vs_platform_token')
```

## 📹 Video Operations

```bash
# List all videos
curl http://localhost:3001/api/videos

# Get video by ID (with progress if authenticated)
curl http://localhost:3001/api/videos/{VIDEO_ID} \
  -H "Authorization: Bearer {TOKEN}"

# Update progress
curl -X POST http://localhost:3001/api/videos/{VIDEO_ID}/progress \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"progressSeconds": 120}'
```

## 📊 Database Queries

```bash
# Connect to PostgreSQL
docker exec -it vs-platform-postgres psql -U postgres -d vs_platform

# Check videos
SELECT id, title, status, "hlsPath", "createdAt" 
FROM videos 
ORDER BY "createdAt" DESC 
LIMIT 5;

# Check video status
SELECT id, title, status 
FROM videos 
WHERE id = '{VIDEO_ID}';

# Check renditions
SELECT v.title, r.resolution, r.bitrate, r."hlsPath"
FROM videos v
JOIN renditions r ON r."videoId" = v.id
WHERE v.id = '{VIDEO_ID}';

# Check user progress
SELECT "eventType", progress, timestamp
FROM analytics_events
WHERE "videoId" = '{VIDEO_ID}' 
  AND "eventType" = 'PROGRESS'
  AND "userId" = '{USER_ID}'
ORDER BY timestamp DESC
LIMIT 10;

# Check completion events
SELECT "eventType", progress, "deviceInfo", timestamp
FROM analytics_events
WHERE "videoId" = '{VIDEO_ID}' 
  AND "eventType" = 'COMPLETE'
ORDER BY timestamp DESC
LIMIT 1;

# Exit PostgreSQL
\q
```

## 🔧 Troubleshooting Commands

```bash
# Check if port is in use
lsof -i :3001  # Backend
lsof -i :3000  # Frontend
lsof -i :6379  # Redis
lsof -i :5432  # PostgreSQL

# Kill process on port
kill -9 $(lsof -t -i:3001)

# Check worker process
ps aux | grep worker

# Check FFmpeg
ffmpeg -version

# View Docker logs
docker compose logs postgres
docker compose logs redis
docker compose logs -f backend
docker compose logs -f worker

# Restart a service
docker compose restart postgres
```

## 🌐 Browser Console Commands

```javascript
// Check authentication token
localStorage.getItem('vs_platform_token')

// Set token manually
localStorage.setItem('vs_platform_token', 'YOUR_TOKEN_HERE')

// Clear token
localStorage.removeItem('vs_platform_token')

// Register user
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
  console.log('Token:', data.data.token);
  localStorage.setItem('vs_platform_token', data.data.token);
});

// Test API call
fetch('http://localhost:3001/api/videos', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('vs_platform_token')}`
  }
})
.then(r => r.json())
.then(console.log);
```

## 📝 Environment Variables Check

```bash
# Backend
cat backend/.env

# Frontend
cat frontend/.env.local
cat frontend/.env

# Check specific variable
grep CLOUD_FRONT_URL frontend/.env.local
grep DATABASE_URL backend/.env
```

## 🧪 Quick Test Script

Save this as `test-quick.sh`:

```bash
#!/bin/bash

echo "🔍 Health Checks..."
curl -s http://localhost:3001/health | jq '.'

echo ""
echo "📹 Videos List..."
curl -s http://localhost:3001/api/videos | jq '.data | length'

echo ""
echo "🐳 Docker Services..."
docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo "✅ Quick check complete!"
```

Make it executable:
```bash
chmod +x test-quick.sh
./test-quick.sh
```

## 🔗 Useful URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health
- Upload Page: http://localhost:3000/upload
- Watch Page: http://localhost:3000/watch/{VIDEO_ID}
- Login Page: http://localhost:3000/login

## 📋 Common Issues & Quick Fixes

### Backend won't start
```bash
# Kill process on port
kill -9 $(lsof -t -i:3001)
# Restart
pnpm --filter backend dev
```

### Worker not processing
```bash
# Check Redis
redis-cli ping
# Restart worker
pnpm --filter worker dev
```

### Database connection error
```bash
# Restart PostgreSQL
docker compose restart postgres
# Wait 5 seconds, then retry
```

### Frontend build errors
```bash
# Clear Next.js cache
rm -rf frontend/.next
# Reinstall dependencies
pnpm install
# Restart
pnpm --filter frontend dev
```

---

**Tip**: Bookmark this page for quick reference during testing! 📌

