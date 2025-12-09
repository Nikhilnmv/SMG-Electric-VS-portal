#!/bin/bash

echo "=== Worker Status Check ==="
echo ""

# Check if Redis is running
echo "1. Checking Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "   ✅ Redis is running"
    else
        echo "   ❌ Redis is not responding"
        echo "   Start Redis: redis-server"
    fi
else
    echo "   ⚠️  redis-cli not found, cannot check Redis"
fi

echo ""

# Check if worker process is running
echo "2. Checking if worker process is running..."
if pgrep -f "worker.*dev\|worker.*start" > /dev/null; then
    echo "   ✅ Worker process found"
    pgrep -f "worker.*dev\|worker.*start" | xargs ps -p
else
    echo "   ❌ Worker process not found"
    echo "   Start worker: pnpm --filter worker dev"
fi

echo ""

# Check for HLS files
echo "3. Checking HLS output..."
HLS_COUNT=$(find backend/uploads/hls -name "master.m3u8" 2>/dev/null | wc -l | tr -d ' ')
if [ "$HLS_COUNT" -gt 0 ]; then
    echo "   ✅ Found $HLS_COUNT processed videos"
else
    echo "   ❌ No HLS files found (0 processed videos)"
fi

echo ""

# Check raw files
echo "4. Checking raw uploads..."
RAW_COUNT=$(find backend/uploads/raw -name "original.*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$RAW_COUNT" -gt 0 ]; then
    echo "   ✅ Found $RAW_COUNT uploaded videos"
    echo "   Files:"
    find backend/uploads/raw -name "original.*" -exec ls -lh {} \; | awk '{print "      " $9 " (" $5 ")"}'
else
    echo "   ❌ No raw files found"
fi

echo ""

# Check environment
echo "5. Checking environment variables..."
if [ -f "worker/.env" ]; then
    echo "   ✅ worker/.env exists"
    if grep -q "STORAGE_MODE=local" worker/.env 2>/dev/null; then
        echo "   ✅ STORAGE_MODE=local is set"
    else
        echo "   ⚠️  STORAGE_MODE may not be set to 'local'"
    fi
else
    echo "   ⚠️  worker/.env not found"
fi

echo ""
echo "=== Summary ==="
if [ "$RAW_COUNT" -gt 0 ] && [ "$HLS_COUNT" -eq 0 ]; then
    echo "⚠️  ISSUE: Videos are uploaded but not processed!"
    echo "   → Start the worker: pnpm --filter worker dev"
    echo "   → Or check worker logs for errors"
fi

