import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'VIDEO_PLAY',
  'VIDEO_PAUSE',
  'VIDEO_PROGRESS',
  'VIDEO_COMPLETE',
  'VIDEO_BUFFER',
  'VIDEO_SEEK',
  'FOCUS_MODE_START',
  'FOCUS_MODE_END',
  'VIDEO_OPENED',
  'VIDEO_EXITED',
]);

export const AnalyticsEventSchema = z.object({
  userId: z.string().uuid(),
  videoId: z.string().uuid(),
  timestamp: z.string().datetime().optional(), // ISO 8601 string, defaults to now
  eventType: EventTypeSchema,
  currentTime: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  playbackQuality: z.string().optional(),
  device: z.string().optional(),
  categoryRole: z.string().optional(),
  sessionId: z.string().optional(), // Changed from uuid() to string() to accept any session ID format
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

