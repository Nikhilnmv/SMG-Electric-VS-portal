#!/bin/bash

# Script to clean up orphaned upload files (files without database records)

echo "=== Cleaning Up Orphaned Upload Files ==="
echo ""

# Get database connection info
DB_CONTAINER="vs-platform-postgres"
DB_NAME="vs_platform"
DB_USER="postgres"

# Get list of video IDs from database
echo "Fetching video IDs from database..."
VIDEO_IDS=$(docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM videos;" 2>/dev/null | tr -d ' ' | grep -v '^$')

if [ -z "$VIDEO_IDS" ]; then
  echo "No videos found in database."
  exit 1
fi

echo "Found $(echo "$VIDEO_IDS" | wc -l | tr -d ' ') videos in database"
echo ""

# Count files before cleanup
RAW_COUNT=$(find backend/uploads/raw -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
THUMB_COUNT=$(find backend/uploads/thumbnails -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
HLS_COUNT=$(find backend/uploads/hls -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo "Before cleanup:"
echo "  Raw directories: $RAW_COUNT"
echo "  Thumbnail directories: $THUMB_COUNT"
echo "  HLS directories: $HLS_COUNT"
echo ""

# Find orphaned directories
ORPHANED_RAW=0
ORPHANED_THUMB=0
ORPHANED_HLS=0

echo "Checking for orphaned files..."
for dir in backend/uploads/raw/*/; do
  if [ -d "$dir" ]; then
    video_id=$(basename "$dir")
    if ! echo "$VIDEO_IDS" | grep -q "^$video_id$"; then
      echo "  Orphaned raw directory: $video_id"
      ORPHANED_RAW=$((ORPHANED_RAW + 1))
    fi
  fi
done

for dir in backend/uploads/thumbnails/*/; do
  if [ -d "$dir" ]; then
    video_id=$(basename "$dir")
    if ! echo "$VIDEO_IDS" | grep -q "^$video_id$"; then
      echo "  Orphaned thumbnail directory: $video_id"
      ORPHANED_THUMB=$((ORPHANED_THUMB + 1))
    fi
  fi
done

for dir in backend/uploads/hls/*/; do
  if [ -d "$dir" ]; then
    video_id=$(basename "$dir")
    if ! echo "$VIDEO_IDS" | grep -q "^$video_id$"; then
      echo "  Orphaned HLS directory: $video_id"
      ORPHANED_HLS=$((ORPHANED_HLS + 1))
    fi
  fi
done

echo ""
if [ $ORPHANED_RAW -eq 0 ] && [ $ORPHANED_THUMB -eq 0 ] && [ $ORPHANED_HLS -eq 0 ]; then
  echo "✅ No orphaned files found. All files are associated with database records."
  exit 0
fi

echo "Found orphaned files:"
echo "  Raw: $ORPHANED_RAW"
echo "  Thumbnails: $ORPHANED_THUMB"
echo "  HLS: $ORPHANED_HLS"
echo ""

read -p "Do you want to delete these orphaned files? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cleanup cancelled."
  exit 0
fi

# Delete orphaned files
echo "Deleting orphaned files..."

for dir in backend/uploads/raw/*/; do
  if [ -d "$dir" ]; then
    video_id=$(basename "$dir")
    if ! echo "$VIDEO_IDS" | grep -q "^$video_id$"; then
      echo "  Deleting: $dir"
      rm -rf "$dir"
    fi
  fi
done

for dir in backend/uploads/thumbnails/*/; do
  if [ -d "$dir" ]; then
    video_id=$(basename "$dir")
    if ! echo "$VIDEO_IDS" | grep -q "^$video_id$"; then
      echo "  Deleting: $dir"
      rm -rf "$dir"
    fi
  fi
done

for dir in backend/uploads/hls/*/; do
  if [ -d "$dir" ]; then
    video_id=$(basename "$dir")
    if ! echo "$VIDEO_IDS" | grep -q "^$video_id$"; then
      echo "  Deleting: $dir"
      rm -rf "$dir"
    fi
  fi
done

echo ""
echo "✅ Cleanup complete!"

# Count files after cleanup
RAW_COUNT_AFTER=$(find backend/uploads/raw -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
THUMB_COUNT_AFTER=$(find backend/uploads/thumbnails -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
HLS_COUNT_AFTER=$(find backend/uploads/hls -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "After cleanup:"
echo "  Raw directories: $RAW_COUNT_AFTER"
echo "  Thumbnail directories: $THUMB_COUNT_AFTER"
echo "  HLS directories: $HLS_COUNT_AFTER"

