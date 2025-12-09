import { Job } from 'bullmq';
import { LiveStream } from '@vs-platform/types';
import { packageLiveStream } from '../services/ffmpeg';

export async function liveStreamProcessor(job: Job<LiveStream>) {
  const { id, rtmpIngestUrl } = job.data;

  console.log(`Starting live stream packaging for stream ${id}`);

  try {
    // Package RTMP stream into HLS using FFmpeg
    const hlsPlaybackUrl = await packageLiveStream(id, rtmpIngestUrl);

    console.log(`Live stream packaging completed for stream ${id}`);
    return { success: true, hlsPlaybackUrl };
  } catch (error) {
    console.error(`Live stream packaging failed for stream ${id}:`, error);
    throw error;
  }
}

