# User Learning Flow

## Overview

This document describes how users interact with the educational platform, access modules and lessons, and track their learning progress.

## Accessing Modules

### Viewing Available Modules

**Page:** `/modules`

**What Users See:**
- List of modules accessible to their category
- Progress percentage for each module
- Number of lessons in each module
- Completion status

**Access Control:**
- Only modules where `user.categoryRole ∈ module.allowedCategories` are shown
- Admins see all modules

### Module Details

**Page:** `/modules/:moduleId`

**What Users See:**
- Module title and description
- Overall progress bar
- List of lessons in order
- Lesson completion status
- Lock indicators for incomplete previous lessons

## Accessing Lessons

### Lesson Player

**Page:** `/lesson/:lessonId`

**Features:**
- Video player with HLS streaming
- Lesson title and description
- Progress tracking
- Completion status
- Focus mode integration

### Video Lock Feature

**Important:** Users must complete the previous lesson before accessing the next one.

**How It Works:**
1. User attempts to access a lesson
2. System checks if there's a previous lesson in the module
3. If previous lesson exists, checks if it's completed
4. If not completed, access is denied with message: "You must complete the previous lesson before accessing this one"

**Completion Criteria:**
- Lesson is marked as completed when user watches ≥90% of the video
- Progress is tracked in `UserLessonProgress` table

## Progress Tracking

### Automatic Progress Updates

Progress is automatically saved:
- Every 5 seconds during video playback
- When video is paused
- When video is completed

### Progress Data

Stored in `UserLessonProgress`:
- `progress`: 0-100 percentage
- `completed`: Boolean flag
- `lastWatchedAt`: Timestamp of last viewing

### Module Progress

Calculated as:
```
progressPercentage = (completedLessons / totalLessons) * 100
```

## Analytics Tracking

### Events Tracked

- `PLAY`: User starts video playback
- `PAUSE`: User pauses video
- `PROGRESS`: Video playback progress (tracked periodically)
- `COMPLETE`: User completes lesson (≥90% watched)

### Analytics Data

All events are sent to:
- ClickHouse (for analytics queries)
- PostgreSQL (for backward compatibility)

## User Dashboard

**Page:** `/dashboard`

**Metrics Shown:**
- Modules assigned
- Lessons watched
- Completion rate
- Learning streak
- Total watch time

**Quick Actions:**
- "Continue Learning" button (jumps to next incomplete lesson)
- Recent activity
- Recommended content

## Navigation Flow

```
Dashboard
  └─> Modules List
       └─> Module Details
            └─> Lesson Player
                 └─> (Complete) → Next Lesson
```

## Common User Scenarios

### Starting a New Module

1. Navigate to `/modules`
2. Click on a module card
3. View module details and lesson list
4. Click on first lesson (always unlocked)
5. Watch video and complete lesson
6. Next lesson becomes unlocked

### Continuing Learning

1. Navigate to `/modules`
2. Click on module with progress
3. View which lessons are completed
4. Click on next incomplete lesson
5. Resume from where you left off (if applicable)

### Checking Progress

1. View module list to see overall progress
2. View module details to see lesson-by-lesson progress
3. Check dashboard for overall statistics

## Troubleshooting

### Cannot Access Lesson

**Possible Reasons:**
1. Previous lesson not completed (video lock)
2. User's category not in module's `allowedCategories`
3. Lesson not ready (status is not READY)
4. Module deleted or hidden

**Solutions:**
- Complete previous lesson first
- Contact admin if category access issue
- Wait for lesson processing to complete

### Progress Not Saving

1. Check internet connection
2. Verify user is authenticated
3. Check browser console for errors
4. Progress saves every 5 seconds, may take a moment

### Video Not Playing

1. Check lesson status is READY
2. Verify browser supports HLS (modern browsers)
3. Check network connection
4. Try refreshing the page

## Best Practices for Users

1. **Complete Lessons in Order**: Don't skip lessons; complete them sequentially
2. **Watch Fully**: Ensure you watch ≥90% to mark as completed
3. **Check Progress**: Regularly review your progress in the dashboard
4. **Use Focus Mode**: Enable focus mode for distraction-free learning
5. **Resume Watching**: Use the resume prompt to continue from where you left off

