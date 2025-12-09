import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/transcode';

export interface RenditionConfig {
  resolution: string;
  bitrate: string;
  maxrate: string;
  bufsize: string;
}

const RENDITIONS: RenditionConfig[] = [
  { resolution: '240', bitrate: '400k', maxrate: '400k', bufsize: '800k' },
  { resolution: '360', bitrate: '800k', maxrate: '800k', bufsize: '1600k' },
  { resolution: '480', bitrate: '1400k', maxrate: '1400k', bufsize: '2800k' },
  { resolution: '720', bitrate: '2800k', maxrate: '2800k', bufsize: '5600k' },
  { resolution: '1080', bitrate: '5000k', maxrate: '5000k', bufsize: '10000k' },
];

export interface TranscodeResult {
  outputDir: string;
  masterPlaylistPath: string;
  renditions: Array<{ resolution: string; playlistPath: string }>;
}

/**
 * Transcode video to HLS format with multiple renditions
 */
export async function runTranscode(
  inputFile: string,
  outputDir: string,
  videoId: string
): Promise<TranscodeResult> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const renditions: Array<{ resolution: string; playlistPath: string }> = [];

  // Generate each rendition
  for (const config of RENDITIONS) {
    const playlistPath = path.join(outputDir, `${config.resolution}p.m3u8`);
    const segmentPattern = path.join(outputDir, `${config.resolution}p_%03d.ts`);

    const ffmpegCommand = [
      FFMPEG_PATH,
      '-i', inputFile,
      '-vf', `scale=-2:${config.resolution}`,
      '-c:a', 'aac',
      '-ar', '48000',
      '-b:a', '128k',
      '-c:v', 'h264',
      '-profile:v', 'main',
      '-crf', '20',
      '-preset', 'veryfast',
      '-maxrate', config.maxrate,
      '-bufsize', config.bufsize,
      '-hls_time', '4',
      '-hls_segment_filename', segmentPattern,
      '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      playlistPath,
    ].join(' ');

    console.log(`Transcoding ${config.resolution}p...`);
    console.log(`Command: ${ffmpegCommand}`);

    try {
      const { stdout, stderr } = await execAsync(ffmpegCommand);
      if (stderr) {
        console.log(`FFmpeg output for ${config.resolution}p:`, stderr);
      }
      if (stdout) {
        console.log(`FFmpeg stdout for ${config.resolution}p:`, stdout);
      }

      renditions.push({
        resolution: `${config.resolution}p`,
        playlistPath,
      });

      console.log(`✓ ${config.resolution}p transcoding completed`);
    } catch (error) {
      console.error(`Error transcoding ${config.resolution}p:`, error);
      throw new Error(`Failed to transcode ${config.resolution}p: ${error}`);
    }
  }

  // Generate master playlist
  const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
  await generateMasterPlaylist(renditions, masterPlaylistPath);

  return {
    outputDir,
    masterPlaylistPath,
    renditions,
  };
}

/**
 * Generate HLS master playlist referencing all renditions
 */
async function generateMasterPlaylist(
  renditions: Array<{ resolution: string; playlistPath: string }>,
  masterPlaylistPath: string
): Promise<void> {
  let playlistContent = '#EXTM3U\n';
  playlistContent += '#EXT-X-VERSION:3\n\n';

  // Bandwidth mapping (approximate)
  const bandwidthMap: Record<string, string> = {
    '240p': '400000',
    '360p': '800000',
    '480p': '1400000',
    '720p': '2800000',
    '1080p': '5000000',
  };

  for (const rendition of renditions) {
    const bandwidth = bandwidthMap[rendition.resolution] || '1000000';
    const resolution = rendition.resolution.toUpperCase();
    const playlistName = path.basename(rendition.playlistPath);

    playlistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${getResolutionString(rendition.resolution)}\n`;
    playlistContent += `${playlistName}\n\n`;
  }

  fs.writeFileSync(masterPlaylistPath, playlistContent);
  console.log('Master playlist generated:', masterPlaylistPath);
}

function getResolutionString(resolution: string): string {
  const height = parseInt(resolution.replace('p', ''));
  // Assume 16:9 aspect ratio
  const width = Math.round((height * 16) / 9);
  return `${width}x${height}`;
}

