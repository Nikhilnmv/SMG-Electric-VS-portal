FROM node:20-alpine AS base

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Install dependencies
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/types ./packages/types
COPY worker/package.json ./worker/
COPY worker/prisma ./worker/prisma
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build types package first (required by worker)
RUN corepack enable pnpm && pnpm --filter @vs-platform/types build

# Generate Prisma client for worker
RUN cd worker && pnpm prisma generate --schema=./prisma/schema.prisma

# Then build worker
RUN corepack enable pnpm && pnpm --filter worker build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/worker/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

CMD ["node", "dist/index.js"]

