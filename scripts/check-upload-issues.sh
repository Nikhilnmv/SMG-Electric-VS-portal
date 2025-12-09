#!/bin/bash

# Script to check upload and transcoding issues

echo "=== Checking Upload and Transcoding Issues ==="
echo ""

# Check if worker is running
echo "1. Checking if worker process is running..."
WORKER_PID=$(pgrep -f "worker.*dev\|worker.*index")
if [ -z "$WORKER_PID" ]; then
  echo "   ❌ Worker is NOT running!"
  echo "   → Start worker with: pnpm --filter worker dev"
else
  echo "   ✅ Worker is running (PID: $WORKER_PID)"
fi
echo ""

# Check Redis connection
echo "2. Checking Redis connection..."
if docker compose ps | grep -q "vs-platform-redis.*Up"; then
  echo "   ✅ Redis container is running"
else
  echo "   ❌ Redis container is NOT running!"
  echo "   → Start with: docker compose up -d redis"
fi
echo ""

# Check database migration status
echo "3. Checking database for thumbnailUrl column..."
echo "   (This requires database access)"
echo ""

# Check upload directories
echo "4. Checking upload directories..."
RAW_COUNT=$(find backend/uploads/raw -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
THUMB_COUNT=$(find backend/uploads/thumbnails -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
HLS_COUNT=$(find backend/uploads/hls -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo "   Raw video directories: $RAW_COUNT"
echo "   Thumbnail directories: $THUMB_COUNT"
echo "   HLS directories: $HLS_COUNT"
echo ""

if [ "$RAW_COUNT" -gt "$HLS_COUNT" ]; then
  echo "   ⚠️  Warning: More raw videos than HLS transcoded files!"
  echo "   → This suggests transcoding jobs are not completing"
  echo "   → Check worker logs for errors"
fi
echo ""

# Check for duplicate video IDs
echo "5. Checking for potential duplicate uploads..."
echo "   Recent uploads in raw directory:"
ls -lt backend/uploads/raw 2>/dev/null | head -6 | tail -5
echo ""

echo "=== Recommendations ==="
echo ""
echo "If you see multiple uploads:"
echo "  1. Make sure upload button has double-click prevention (already added)"
echo "  2. Check browser console for errors"
echo "  3. Verify backend logs for duplicate registration attempts"
echo ""
echo "If HLS files are missing:"
echo "  1. Ensure worker is running: pnpm --filter worker dev"
echo "  2. Check Redis is running: docker compose ps redis"
echo "  3. Check worker logs for transcoding errors"
echo "  4. Verify FFmpeg is installed: ffmpeg -version"
echo ""

