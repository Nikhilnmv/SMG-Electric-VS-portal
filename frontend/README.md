# Frontend - Next.js Web Application

The main web application for the video streaming platform, built with Next.js, React, and TypeScript.

## Features

- Video playback with Video.js + hls.js
- Focus-oriented UI
- Task-based playlists
- User authentication
- Responsive design

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start development server
pnpm --filter frontend dev
```

The application will be available at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_JWT_STORAGE_KEY`: JWT storage key
- AWS configuration for direct uploads

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/             # Utilities and API client
└── styles/          # Global styles
```

## Building

```bash
pnpm --filter frontend build
```

## Docker

```bash
docker build -t frontend -f frontend/Dockerfile .
```

