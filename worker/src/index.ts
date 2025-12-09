import { Worker, Queue } from 'bullmq';
import dotenv from 'dotenv';
import { redisConnection } from './config/redis';
import { processVideoTranscoding, VideoProcessingJobPayload } from './queue/videoProcessing';
import { liveStreamProcessor } from './processors/liveStreamProcessor';

dotenv.config();

// Dead-letter queue for permanently failed jobs
const deadLetterQueue = new Queue<VideoProcessingJobPayload>('video-processing-dlq', {
  connection: redisConnection,
});

// Video processing worker with retry configuration
const videoProcessingWorker = new Worker<VideoProcessingJobPayload>(
  'video-processing',
  async (job) => {
    return processVideoTranscoding(job);
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.TRANSCODING_CONCURRENCY || '2'),
  }
);

videoProcessingWorker.on('completed', (job) => {
  console.log(`✓ Video processing job ${job.id} completed successfully`);
});

videoProcessingWorker.on('failed', async (job, err) => {
  const attemptCount = job?.attemptsMade || 0;
  const maxAttempts = 3;
  
  console.error(`✗ Video processing job ${job?.id} failed (attempt ${attemptCount}/${maxAttempts}):`, err);
  
  // If job has exhausted all retries, move to dead-letter queue
  if (job && attemptCount >= maxAttempts) {
    console.error(`⚠ Job ${job.id} exhausted all retries. Moving to dead-letter queue.`);
    
    try {
      // Add to dead-letter queue with failure metadata
      await deadLetterQueue.add(
        `dlq-${job.id}`,
        job.data,
        {
          attempts: 1, // Don't retry DLQ jobs
          removeOnComplete: false, // Keep for inspection
          removeOnFail: false,
        }
      );
      
      // Log admin notification
      console.error(`[ADMIN NOTIFICATION] Video processing job ${job.id} permanently failed after ${maxAttempts} attempts.`);
      console.error(`[ADMIN NOTIFICATION] Video ID: ${job.data.videoId}`);
      console.error(`[ADMIN NOTIFICATION] Error: ${err.message}`);
      console.error(`[ADMIN NOTIFICATION] Job moved to dead-letter queue for manual inspection.`);
      
      // TODO: In production, send notification to admin (email, Slack, etc.)
      // Example: await notifyAdmin({ jobId: job.id, videoId: job.data.videoId, error: err.message });
      
    } catch (dlqError) {
      console.error(`Failed to add job ${job.id} to dead-letter queue:`, dlqError);
    }
  }
});

videoProcessingWorker.on('active', (job) => {
  console.log(`→ Video processing job ${job.id} started`);
});

// Live streaming worker (placeholder)
const liveStreamWorker = new Worker(
  'live-streaming',
  liveStreamProcessor,
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.LIVE_STREAM_CONCURRENCY || '1'),
  }
);

liveStreamWorker.on('completed', (job) => {
  console.log(`Live stream job ${job.id} completed`);
});

liveStreamWorker.on('failed', (job, err) => {
  console.error(`Live stream job ${job?.id} failed:`, err);
});

console.log('Worker service started');
console.log('Listening for jobs on queue: video-processing');
console.log(`Concurrency: ${process.env.TRANSCODING_CONCURRENCY || '2'}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await videoProcessingWorker.close();
  await liveStreamWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await videoProcessingWorker.close();
  await liveStreamWorker.close();
  process.exit(0);
});
