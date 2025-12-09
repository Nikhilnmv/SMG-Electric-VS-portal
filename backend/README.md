# Backend - Express API Server

The main API server for the video streaming platform, built with Node.js, Express, and TypeScript.

## Features

- RESTful API endpoints
- JWT authentication
- PostgreSQL database integration
- Redis caching
- AWS S3 integration for uploads
- Role-based access control

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start development server
pnpm --filter backend dev
```

The API will be available at `http://localhost:3001`.

## Environment Variables

Copy `.env.example` to `.env` and configure:

- Database connection (PostgreSQL)
- Redis connection
- JWT secret
- AWS S3 credentials

## API Routes

- `/api/auth` - Authentication endpoints
- `/api/videos` - Video management
- `/api/upload` - Upload presigned URLs
- `/api/analytics` - Analytics events
- `/api/admin` - Admin operations
- `/api/live` - Live streaming

## Project Structure

```
src/
├── controllers/    # Route controllers
├── middleware/     # Express middleware
├── routes/         # Route definitions
├── services/       # Business logic services
└── index.ts        # Application entry point
```

## Building

```bash
pnpm --filter backend build
```

## Docker

```bash
docker build -t backend -f backend/Dockerfile .
```

