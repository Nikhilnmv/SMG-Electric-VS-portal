# Video Streaming Platform

A scalable, production-ready video streaming platform supporting both on-demand and live streaming with a focus-oriented user experience.

## Architecture Overview

This is a monorepo containing all services and infrastructure for the video streaming platform:

- **Frontend**: Next.js web application (React + TypeScript)
- **Backend**: Express API server (Node.js + TypeScript)
- **Worker**: Background job processing with BullMQ and FFmpeg
- **Infrastructure**: Terraform configurations for AWS resources
- **Shared Types**: Common TypeScript interfaces and API contracts

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Video.js, hls.js
- **Backend**: Node.js, Express, TypeScript, JWT
- **Worker**: BullMQ, FFmpeg, Redis
- **Databases**: PostgreSQL, Redis, ClickHouse
- **Storage**: AWS S3, CloudFront CDN
- **Infrastructure**: Docker, Kubernetes (EKS), Terraform

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- AWS CLI (for infrastructure deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment files
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env
cp frontend/.env.example frontend/.env.local
```

### First-Time Setup

**Important**: Public registration is disabled. You must create the first admin user manually.

See the [First-Time Admin Setup Guide](./docs/Initial_docs/FIRST_TIME_ADMIN_SETUP.md) for detailed instructions.

**Quick setup:**
```bash
# 1. Start database services
docker compose up -d postgres redis clickhouse

# 2. Apply database migrations
pnpm --filter backend prisma migrate dev

# 3. Create first admin user
chmod +x scripts/create-admin-user.sh
./scripts/create-admin-user.sh admin@yourcompany.com SecurePassword123

# 4. Start the backend and frontend
pnpm dev
```

### Development

```bash
# Start all services locally
pnpm dev

# Or start services individually
pnpm --filter frontend dev
pnpm --filter backend dev
pnpm --filter worker dev
```

### Docker Compose

```bash
# Start all services with Docker Compose
docker-compose up -d
```

## Project Structure

```
.
├── frontend/          # Next.js web application
├── backend/           # Express API server
├── worker/            # Background job workers
├── infra/             # Terraform infrastructure code
├── packages/
│   └── types/         # Shared TypeScript types
└── docs/              # Documentation

```

## Development Phases

1. **Phase 1 - MVP**: Basic upload, transcoding, and playback
2. **Phase 2 - Backend & Transcoding**: Full API and worker pipeline
3. **Phase 3 - Admin & Analytics**: Admin dashboard and analytics
4. **Phase 4 - Live Streaming**: RTMP ingestion and live HLS
5. **Phase 5 - Scaling**: Kubernetes, optimization, load testing

## Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check all packages
- `pnpm test` - Run tests across all packages

## Documentation

See `/docs` directory for:
- **[First-Time Admin Setup](./docs/Initial_docs/FIRST_TIME_ADMIN_SETUP.md)** - Create your first admin account
- [User Onboarding Guide](./docs/Initial_docs/USER_ONBOARDING_CORPORATE_FLOW.md) - Admin-controlled user creation
- Architecture documentation
- API reference
- Deployment guides
- Development guidelines

## License

Private - All rights reserved

