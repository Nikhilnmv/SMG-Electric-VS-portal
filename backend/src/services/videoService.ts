import { prisma } from '../lib/db';
import { Queue } from 'bullmq';
import IORedis, { RedisOptions } from 'ioredis';

// Parse Redis connection from REDIS_URL or individual env vars
let redisConfig: RedisOptions;
if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  redisConfig = {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
    db: parseInt(url.pathname?.slice(1) || '0'),
    maxRetriesPerRequest: null,
  };
} else {
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
  };
}

const redisConnection = new IORedis(redisConfig);

const videoProcessingQueue = new Queue('video-processing', {
  connection: redisConnection,
});

export interface VideoRegistrationData {
  title: string;
  description?: string | null;
  fileKey: string;
  filePath?: string; // For local storage
  userId: string;
  thumbnailUrl?: string | null;
}

export interface ProcessingJobPayload {
  videoId: string;
  s3Key: string;
  filePath?: string; // For local storage
  title: string;
  description?: string | null;
}

export class VideoService {
  static async registerUploadedVideo(data: VideoRegistrationData, videoId?: string) {
    // Get user to retrieve categoryRole
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { categoryRole: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
    const storageKey = STORAGE_MODE === 'local' ? (data.filePath || data.fileKey) : data.fileKey;

    console.log(`[VideoService] Registering video in ${STORAGE_MODE} mode`);
    console.log(`[VideoService] Storage key: ${storageKey}`);
    console.log(`[VideoService] File path: ${data.filePath || 'N/A'}`);

    // Create video record with UPLOADED status initially (will change to PROCESSING when job starts)
    // In local mode, we set status to UPLOADED since file is already saved
    const initialStatus = STORAGE_MODE === 'local' ? 'UPLOADED' : 'PROCESSING';
    
    const video = await prisma.video.create({
      data: {
        id: videoId, // Use provided videoId if available (from local upload)
        title: data.title,
        description: data.description || null,
        userId: data.userId,
        s3Key: storageKey, // Store file path/key
        status: initialStatus,
        categoryRole: user.categoryRole, // Set from user's categoryRole
        thumbnailUrl: data.thumbnailUrl || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    console.log(`[VideoService] Video created: id=${video.id}, status=${video.status}`);

    // Enqueue processing job
    // In local mode, s3Key contains the filePath, in S3 mode it contains the S3 key
    const jobPayload: ProcessingJobPayload = {
      videoId: video.id,
      s3Key: storageKey, // Contains filePath in local mode, S3 key in S3 mode
      filePath: data.filePath, // Explicit filePath for local mode
      title: data.title,
      description: data.description || null,
    };

    console.log(`[VideoService] Enqueuing processing job:`, JSON.stringify(jobPayload, null, 2));

    await videoProcessingQueue.add(
      'transcode-video',
      jobPayload,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`[VideoService] Processing job enqueued for video ${video.id}`);

    return video;
  }

  static async updateVideoStatus(
    videoId: string,
    status: 'PROCESSING' | 'READY' | 'UPLOADED',
    hlsPath?: string
  ) {
    return prisma.video.update({
      where: { id: videoId },
      data: {
        status,
        ...(hlsPath && { hlsPath }),
      },
    });
  }
}
