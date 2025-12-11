# Admin Content Management Flow

## Overview

This document describes how administrators create and manage educational content (modules and lessons) in the platform.

## Prerequisites

- User must have `ADMIN` role
- Access to admin panel at `/admin/modules`

## Creating a Module

### Step 1: Create Module

**Endpoint:** `POST /api/admin/modules`

**Request Body:**
```json
{
  "title": "Introduction to Electrical Safety",
  "description": "Learn the fundamentals of electrical safety in the workplace",
  "allowedCategories": ["DEALER", "EMPLOYEE", "TECHNICIAN"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "module-uuid",
    "title": "Introduction to Electrical Safety",
    "description": "...",
    "allowedCategories": ["DEALER", "EMPLOYEE", "TECHNICIAN"],
    "createdAt": "2024-01-01T00:00:00Z",
    "lessons": []
  }
}
```

### Step 2: Add Lessons to Module

**Endpoint:** `POST /api/admin/modules/:moduleId/lessons`

**Request Body:**
```json
{
  "title": "Lesson 1: Basic Safety Rules",
  "description": "Understanding fundamental safety protocols",
  "order": 0
}
```

**Note:** If `order` is not provided, it will be automatically set to the next available number.

### Step 3: Upload Video for Lesson

**Endpoint:** `POST /api/admin/lessons/:lessonId/upload`

**Request:** Multipart form data
- `video`: Video file (required)
- `thumbnail`: Thumbnail image (optional)

**Process:**
1. Video file is uploaded and saved
2. Processing job is enqueued
3. Worker transcodes video to HLS format
4. Lesson status updates: UPLOADED → PROCESSING → READY

**HLS Output:**
- Local: `/uploads/hls/<lessonId>/master.m3u8`
- S3: `hls/lessons/<lessonId>/master.m3u8`

## Managing Modules

### Update Module

**Endpoint:** `PATCH /api/admin/modules/:id`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "allowedCategories": ["DEALER", "EMPLOYEE"]
}
```

### Delete Module

**Endpoint:** `DELETE /api/admin/modules/:id`

**Note:** Deleting a module will cascade delete all associated lessons.

## Managing Lessons

### Update Lesson

**Endpoint:** `PATCH /api/admin/lessons/:lessonId`

**Request Body:**
```json
{
  "title": "Updated Lesson Title",
  "description": "Updated description",
  "order": 1
}
```

### Delete Lesson

**Endpoint:** `DELETE /api/admin/lessons/:lessonId`

**Note:** This will also delete associated video files and user progress.

## Category Management

### Assigning Categories to Modules

When creating or updating a module, specify which user categories can access it:

```json
{
  "allowedCategories": ["DEALER", "EMPLOYEE", "TECHNICIAN"]
}
```

**Available Categories:**
- `DEALER`
- `EMPLOYEE`
- `TECHNICIAN`
- `STAKEHOLDER`
- `INTERN`
- `VENDOR`

**Important:** If `allowedCategories` is empty `[]`, the module is accessible to all users (including admins).

## Video Processing Status

Lessons have three statuses:

1. **UPLOADED**: Video file has been uploaded, processing not started
2. **PROCESSING**: Video is being transcoded to HLS
3. **READY**: Video is ready for playback

**Check Status:**
- Admin can view lesson status in admin panel
- Users can only see lessons with status `READY`

## Best Practices

1. **Order Lessons Carefully**: Use the `order` field to ensure lessons are presented in the correct sequence
2. **Set Categories Early**: Define `allowedCategories` when creating modules to control access
3. **Monitor Processing**: Check lesson status after upload to ensure processing completes
4. **Test Access**: Verify that users in the specified categories can access the module
5. **Use Descriptions**: Provide clear descriptions for both modules and lessons

## Troubleshooting

### Lesson Stuck in PROCESSING

1. Check worker logs: `docker logs worker`
2. Verify Redis connection
3. Check video file format (should be supported by FFmpeg)
4. Manually retry processing if needed

### Users Cannot Access Module

1. Verify user's `categoryRole` is in module's `allowedCategories`
2. Check module exists and is not deleted
3. Verify user is authenticated

### Video Not Playing

1. Check lesson status is `READY`
2. Verify `hlsMaster` path is correct
3. Check HLS files exist in storage (local or S3)
4. Verify CORS settings for HLS streaming

