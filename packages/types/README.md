# @vs-platform/types

Shared TypeScript types and interfaces for the video streaming platform.

## Usage

```typescript
import { User, Video, VideoStatus } from '@vs-platform/types';
```

## Types Included

- User & Authentication types
- Video metadata and status types
- Upload and transcoding job types
- Playback session types
- Analytics event types
- Task and focus-mode types
- Admin moderation types
- API response types
- Live streaming types

## Building

```bash
pnpm build
```

This package is consumed by all other packages in the monorepo to ensure type safety across services.

