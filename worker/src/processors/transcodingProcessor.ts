import { Job } from 'bullmq';
import { TranscodingJob } from '@vs-platform/types';
import { transcodeVideo } from '../services/ffmpeg';
import { updateVideoStatus } from '../services/database';

export async function transcodingProcessor(job: Job<TranscodingJob>) {
  const { videoId, s3Key } = job.data;

  console.log(`Starting transcoding for video ${videoId}`);

  try {
    // Update status to processing
    await updateVideoStatus(videoId, 'processing');

    // Transcode video using FFmpeg
    const hlsManifestUrl = await transcodeVideo(videoId, s3Key);

    // Update video with HLS manifest URL
    await updateVideoStatus(videoId, 'review', { hlsManifestUrl });

    console.log(`Transcoding completed for video ${videoId}`);
    return { success: true, hlsManifestUrl };
  } catch (error) {
    console.error(`Transcoding failed for video ${videoId}:`, error);
    await updateVideoStatus(videoId, 'failed', { error: String(error) });
    throw error;
  }
}

