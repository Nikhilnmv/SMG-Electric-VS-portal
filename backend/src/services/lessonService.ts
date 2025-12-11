import { prisma } from '../lib/db';
import { Queue } from 'bullmq';
import IORedis, { RedisOptions } from 'ioredis';
import { saveLocalFile, saveLocalThumbnail } from './localStorage';
import { generatePresignedUploadUrl } from './s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
  }
}

const redisConnection = new IORedis(redisConfig);

const lessonProcessingQueue = new Queue('lesson-processing', {
  connection: redisConnection,
});

export interface LessonVideoRegistrationData {
  lessonId: string;
  file: Express.Multer.File;
  thumbnailFile?: Express.Multer.File;
  userId: string;
}

export interface LessonProcessingJobPayload {
  lessonId: string;
  s3Key: string;
  filePath?: string; // For local storage
  title: string;
  description?: string | null;
}

export class LessonService {
  static async registerLessonVideo(data: LessonVideoRegistrationData) {
    const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

    // Verify lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      include: {
        module: true,
      },
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    let filePath: string | undefined;
    let fileKey: string;
    let thumbnailPath: string | undefined;

    if (STORAGE_MODE === 'local') {
      // Save video file locally
      const videoResult = await saveLocalFile(data.file, data.lessonId);
      filePath = videoResult.filePath;
      fileKey = videoResult.filePath;

      // Save thumbnail if provided
      if (data.thumbnailFile) {
        thumbnailPath = await saveLocalThumbnail(data.thumbnailFile, data.lessonId);
      }
    } else {
      // S3 mode: upload directly using S3 client
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const contentType = data.file.mimetype;
      
      // Generate unique file key for lesson
      const fileExtension = contentType.split('/')[1] || 'mp4';
      const { v4: uuidv4 } = await import('uuid');
      fileKey = `raw/lessons/${data.lessonId}/${uuidv4()}.${fileExtension}`;

      // Initialize S3 client
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
          : undefined,
      });

      const S3_BUCKET = process.env.S3_BUCKET || 'vs-platform-uploads';

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: data.file.buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);
      console.log(`[LessonService] File uploaded to S3: ${fileKey}`);
    }

    console.log(`[LessonService] Registering lesson video in ${STORAGE_MODE} mode`);
    console.log(`[LessonService] Storage key: ${fileKey}`);
    console.log(`[LessonService] File path: ${filePath || 'N/A'}`);

    // Update lesson with video info
    const updatedLesson = await prisma.lesson.update({
      where: { id: data.lessonId },
      data: {
        status: 'UPLOADED',
        videoPath: fileKey,
        thumbnailUrl: thumbnailPath || null,
      },
    });

    console.log(`[LessonService] Lesson updated: id=${updatedLesson.id}, status=${updatedLesson.status}`);

    // Enqueue processing job
    const jobPayload: LessonProcessingJobPayload = {
      lessonId: updatedLesson.id,
      s3Key: fileKey,
      filePath: filePath,
      title: lesson.title,
      description: lesson.description,
    };

    console.log(`[LessonService] Enqueuing processing job:`, JSON.stringify(jobPayload, null, 2));

    await lessonProcessingQueue.add(
      'transcode-lesson',
      jobPayload,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`[LessonService] Processing job enqueued for lesson ${updatedLesson.id}`);

    return {
      lesson: updatedLesson,
      filePath,
      fileKey,
      thumbnailPath,
    };
  }

  static async updateLessonStatus(
    lessonId: string,
    status: 'PROCESSING' | 'READY' | 'UPLOADED',
    hlsMaster?: string
  ) {
    return prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status,
        ...(hlsMaster && { hlsMaster }),
      },
    });
  }
}

