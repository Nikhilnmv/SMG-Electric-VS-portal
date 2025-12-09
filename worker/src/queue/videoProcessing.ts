import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { runTranscode } from '../transcoder/ffmpeg';
import { updateVideoStatus } from '../utils/database';

const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

export interface VideoProcessingJobPayload {
  videoId: string;
  s3Key: string;
  filePath?: string; // For local storage
  title: string;
  description?: string | null;
}

export async function processVideoTranscoding(job: Job<VideoProcessingJobPayload>) {
  const { videoId, s3Key, filePath } = job.data;

  console.log(`[${job.id}] Starting video processing for video ${videoId}`);
  console.log(`[${job.id}] Storage mode: ${STORAGE_MODE}`);
  console.log(`[${job.id}] Source: ${filePath || s3Key}`);

  // Update status to PROCESSING when job starts
  try {
    await updateVideoStatus(videoId, 'PROCESSING');
    console.log(`[${job.id}] Video status updated to PROCESSING`);
  } catch (error) {
    console.error(`[${job.id}] Failed to update status to PROCESSING:`, error);
    // Continue processing even if status update fails
  }

  const tempDir = path.join(process.env.TEMP_DIR || '/tmp/transcode', videoId);
  const inputFile = path.join(tempDir, 'input.mp4');
  const outputDir = path.join(tempDir, 'hls');

  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Step 1: Get source video file
    let sourceFile: string;
    if (STORAGE_MODE === 'local') {
      // Use local storage
      const { getLocalFilePath } = await import('../services/localStorage');
      // Use filePath if available (from local upload), otherwise use s3Key (which contains filePath in local mode)
      const filePathToUse = filePath || s3Key;
      console.log(`[${job.id}] Resolving local file path from: ${filePathToUse}`);
      sourceFile = getLocalFilePath(filePathToUse);
      console.log(`[${job.id}] Resolved local file path: ${sourceFile}`);
      
      // Verify file exists
      if (!fs.existsSync(sourceFile)) {
        const errorMsg = `Source video file not found: ${sourceFile}`;
        console.error(`[${job.id}] ${errorMsg}`);
        console.error(`[${job.id}] File path used: ${filePathToUse}`);
        console.error(`[${job.id}] Job data:`, JSON.stringify(job.data, null, 2));
        throw new Error(errorMsg);
      }
      
      const fileStats = fs.statSync(sourceFile);
      console.log(`[${job.id}] Source file exists. Size: ${fileStats.size} bytes`);
      
      // Copy to temp directory
      fs.copyFileSync(sourceFile, inputFile);
      console.log(`[${job.id}] Source video copied to ${inputFile}`);
    } else {
      // Use S3
      const { downloadFromS3 } = await import('../aws/s3');
      console.log(`[${job.id}] Downloading source video from S3...`);
      await downloadFromS3(s3Key, inputFile);
      console.log(`[${job.id}] Source video downloaded to ${inputFile}`);
    }

    // Step 2: Transcode to HLS
    console.log(`[${job.id}] Starting FFmpeg transcoding...`);
    const transcodeResult = await runTranscode(inputFile, outputDir, videoId);
    console.log(`[${job.id}] Transcoding completed`);

    // Step 3: Get video categoryRole for optional path prefixing
    const { getVideoCategoryRole } = await import('../utils/database');
    const categoryRole = await getVideoCategoryRole(videoId);

    // Step 4: Save HLS files
    let hlsPath: string;
    if (STORAGE_MODE === 'local') {
      // Save to local storage
      const { getHlsDirPath, getHlsUrlPath } = await import('../services/localStorage');
      const hlsDir = getHlsDirPath(videoId, categoryRole || undefined);
      hlsPath = getHlsUrlPath(videoId, categoryRole || undefined);
      
      console.log(`[${job.id}] HLS output directory: ${hlsDir}`);
      console.log(`[${job.id}] HLS URL path: ${hlsPath}`);
      
      // Ensure HLS directory exists
      if (!fs.existsSync(hlsDir)) {
        fs.mkdirSync(hlsDir, { recursive: true });
        console.log(`[${job.id}] Created HLS directory: ${hlsDir}`);
      }
      
      console.log(`[${job.id}] Copying HLS files from ${outputDir} to ${hlsDir}...`);
      // Copy all files from outputDir to hlsDir
      const files = fs.readdirSync(outputDir);
      console.log(`[${job.id}] Found ${files.length} files to copy`);
      
      for (const file of files) {
        const sourcePath = path.join(outputDir, file);
        const destPath = path.join(hlsDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`[${job.id}] Copied ${file} to ${destPath}`);
      }
      
      // Verify master.m3u8 exists
      const masterPlaylistPath = path.join(hlsDir, 'master.m3u8');
      if (!fs.existsSync(masterPlaylistPath)) {
        throw new Error(`Master playlist not found after copy: ${masterPlaylistPath}`);
      }
      console.log(`[${job.id}] Master playlist verified: ${masterPlaylistPath}`);
      console.log(`[${job.id}] HLS files saved to local storage successfully`);
    } else {
      // Upload to S3
      const { uploadDirectoryToS3 } = await import('../aws/s3');
      const prefixByCategory = process.env.HLS_PREFIX_BY_CATEGORY === 'true';
      let s3HlsPrefix: string;
      if (prefixByCategory && categoryRole) {
        s3HlsPrefix = `hls/${categoryRole}/${videoId}`;
      } else {
        s3HlsPrefix = `hls/${videoId}`;
      }
      console.log(`[${job.id}] Uploading HLS files to S3 (prefix: ${s3HlsPrefix})...`);
      await uploadDirectoryToS3(outputDir, s3HlsPrefix);
      console.log(`[${job.id}] HLS files uploaded to S3`);
      hlsPath = `${s3HlsPrefix}/master.m3u8`;
    }

    // Step 5: Update database
    console.log(`[${job.id}] Updating database with hlsPath: ${hlsPath}`);
    const updatedVideo = await updateVideoStatus(videoId, 'READY', hlsPath);
    console.log(`[${job.id}] Database updated. Video status: ${updatedVideo.status}, hlsPath: ${updatedVideo.hlsPath}`);

    // Step 5: Clean up temp files
    console.log(`[${job.id}] Cleaning up temporary files...`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`[${job.id}] Cleanup completed`);

    console.log(`[${job.id}] Video processing completed successfully for video ${videoId}`);
    return {
      success: true,
      videoId,
      hlsPath,
    };
  } catch (error) {
    console.error(`[${job.id}] Video processing failed for video ${videoId}:`, error);

    // Clean up temp files on error
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error(`[${job.id}] Error during cleanup:`, cleanupError);
    }

    // Update database with error status (if needed, you might want to add a FAILED status)
    try {
      await updateVideoStatus(videoId, 'PROCESSING', undefined);
    } catch (dbError) {
      console.error(`[${job.id}] Error updating database:`, dbError);
    }

    throw error;
  }
}

