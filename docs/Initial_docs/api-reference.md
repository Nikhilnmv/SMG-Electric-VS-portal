# API Reference

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

#### POST /api/auth/login
Login and receive JWT token.

#### POST /api/auth/refresh
Refresh JWT token.

#### POST /api/auth/logout
Logout user.

### Videos

#### GET /api/videos
List all published videos.

#### GET /api/videos/:id
Get video by ID.

#### POST /api/videos
Create new video (requires authentication).

#### PUT /api/videos/:id
Update video (requires authentication).

#### DELETE /api/videos/:id
Delete video (requires authentication).

### Upload

#### POST /api/upload/presigned-url
Generate presigned S3 URL for upload (requires authentication).

#### POST /api/upload/complete
Notify backend of upload completion (requires authentication).

### Analytics

#### POST /api/analytics/events
Track analytics event (requires authentication).

#### GET /api/analytics/video/:videoId
Get video analytics (requires authentication).

#### GET /api/analytics/user/:userId
Get user analytics (requires authentication).

### Admin

#### GET /api/admin/videos
List all videos for moderation (requires admin/editor role).

#### POST /api/admin/videos/:id/approve
Approve video (requires admin/editor role).

#### POST /api/admin/videos/:id/reject
Reject video (requires admin/editor role).

#### GET /api/admin/users
List all users (requires admin role).

#### GET /api/admin/analytics
Get analytics dashboard (requires admin/editor role).

### Live Streaming

#### GET /api/live
List live streams.

#### GET /api/live/:id
Get live stream by ID.

#### POST /api/live
Create live stream (requires authentication).

#### POST /api/live/:id/start
Start live stream (requires authentication).

#### POST /api/live/:id/end
End live stream (requires authentication).

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {},
  "error": "Error message (if any)"
}
```

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

