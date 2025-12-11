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

// Helper to validate UUID or CUID format
const idValidator = z.string().min(1).refine(
  (val) => {
    // Accept UUID format (with dashes) or CUID format (25 chars, starts with 'c')
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    return uuidRegex.test(val) || cuidRegex.test(val);
  },
  { message: "Must be a valid UUID or CUID format" }
);

// Request schema - what the frontend sends (without userId, which comes from JWT)
export const AnalyticsEventRequestSchema = z.object({
  videoId: idValidator.optional().nullable(), // Can be UUID (old videos) or CUID (new)
  lessonId: idValidator.optional().nullable(), // CUID format for lessons
  timestamp: z.string().datetime().optional(), // ISO 8601 string, defaults to now
  eventType: EventTypeSchema,
  currentTime: z.union([z.number().min(0), z.undefined(), z.null()]).optional(), // Allow undefined/null
  duration: z.union([z.number().min(0), z.undefined(), z.null()]).optional(), // Allow undefined/null
  playbackQuality: z.union([z.string(), z.undefined(), z.null()]).optional(), // Allow undefined/null
  device: z.union([z.string(), z.undefined(), z.null()]).optional(), // Allow undefined/null
  categoryRole: z.union([z.string(), z.undefined(), z.null()]).optional(), // Allow undefined/null
  sessionId: z.union([z.string(), z.undefined(), z.null()]).optional(), // Allow undefined/null
}).refine((data) => data.videoId || data.lessonId, {
  message: "Either videoId or lessonId must be provided",
  path: ["videoId", "lessonId"], // Better error path
});

// Full event schema - what gets stored (includes userId from JWT)
export const AnalyticsEventSchema = z.object({
  userId: idValidator, // User IDs can be UUID or CUID format
  videoId: idValidator.optional().nullable(), // Can be UUID (old videos) or CUID (new)
  lessonId: idValidator.optional().nullable(), // CUID format for lessons
  timestamp: z.string().datetime().optional(), // ISO 8601 string, defaults to now
  eventType: EventTypeSchema,
  currentTime: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  playbackQuality: z.string().optional(),
  device: z.string().optional(),
  categoryRole: z.string().optional(),
  sessionId: z.string().optional(), // Changed from uuid() to string() to accept any session ID format
}).refine((data) => data.videoId || data.lessonId, {
  message: "Either videoId or lessonId must be provided",
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type AnalyticsEventRequest = z.infer<typeof AnalyticsEventRequestSchema>;

