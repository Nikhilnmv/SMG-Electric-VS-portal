import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Only initialize S3 client if in S3 mode
const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

let s3Client: S3Client | null = null;
if (STORAGE_MODE === 's3') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        }
      : undefined,
  });
}

export const S3_BUCKET = process.env.S3_BUCKET || 'vs-platform-uploads';

export interface PresignedUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
}

export async function generatePresignedUploadUrl(
  contentType: string,
  fileSize?: number
): Promise<PresignedUploadUrlResult> {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Set STORAGE_MODE=s3 to use S3.');
  }

  // Validate MIME type
  if (!contentType.startsWith('video/')) {
    throw new Error('Only video files are allowed');
  }

  // Generate unique file key
  const fileExtension = contentType.split('/')[1] || 'mp4';
  const fileKey = `raw/${uuidv4()}.${fileExtension}`;

  // Create presigned URL
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    ContentType: contentType,
    ...(fileSize && { ContentLength: fileSize }),
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  return {
    uploadUrl,
    fileKey,
  };
}

export async function generatePresignedPlaybackUrl(key: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Set STORAGE_MODE=s3 to use S3.');
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  return url;
}

export async function getS3Url(key: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Set STORAGE_MODE=s3 to use S3.');
  }

  // If CloudFront URL is configured, use it
  const cloudFrontUrl = process.env.CLOUDFRONT_URL;
  if (cloudFrontUrl) {
    return `${cloudFrontUrl}/${key}`;
  }

  // Otherwise, generate a presigned URL
  return generatePresignedPlaybackUrl(key);
}

/**
 * Delete a single object from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!s3Client) {
    console.warn('[S3] S3 client not initialized. Skipping S3 delete.');
    return;
  }

  if (!key) {
    console.warn('[S3] Empty key provided, skipping delete');
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`[S3] Successfully deleted object: ${key}`);
  } catch (error: any) {
    console.error(`[S3] Failed to delete object ${key}:`, error.message);
    throw new Error(`Failed to delete S3 object ${key}: ${error.message}`);
  }
}

/**
 * Delete all objects with a given prefix (e.g., all HLS files for a video)
 */
export async function deletePrefixFromS3(prefix: string): Promise<void> {
  if (!s3Client) {
    console.warn('[S3] S3 client not initialized. Skipping S3 prefix delete.');
    return;
  }

  if (!prefix) {
    console.warn('[S3] Empty prefix provided, skipping prefix delete');
    return;
  }

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    });

    const listedObjects = await s3Client.send(listCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log(`[S3] No objects found with prefix: ${prefix}`);
      return;
    }

    console.log(`[S3] Found ${listedObjects.Contents.length} object(s) with prefix: ${prefix}`);

    // Delete all objects with the prefix
    const deletePromises = listedObjects.Contents.map(({ Key }) => {
      if (Key) {
        return deleteFromS3(Key);
      }
    }).filter(Boolean) as Promise<void>[];

    await Promise.all(deletePromises);
    console.log(`[S3] Successfully deleted ${listedObjects.Contents.length} object(s) with prefix: ${prefix}`);
  } catch (error: any) {
    console.error(`[S3] Failed to delete objects with prefix ${prefix}:`, error.message);
    throw new Error(`Failed to delete S3 objects with prefix ${prefix}: ${error.message}`);
  }
}

/**
 * Delete all video-related files from S3 (raw video, HLS files, and thumbnails)
 */
export async function deleteVideoFromS3(video: { s3Key: string; hlsPath?: string | null; thumbnailUrl?: string | null }): Promise<void> {
  const errors: string[] = [];
  const deleted: string[] = [];

  // Delete raw video file
  if (video.s3Key) {
    try {
      await deleteFromS3(video.s3Key);
      deleted.push(`raw video: ${video.s3Key}`);
    } catch (error: any) {
      errors.push(`raw video (${video.s3Key}): ${error.message}`);
    }
  }

  // Delete HLS files if exists
  if (video.hlsPath) {
    try {
      // Extract prefix from hlsPath (e.g., "hls/videoId/" from "hls/videoId/master.m3u8")
      const hlsPrefix = video.hlsPath.replace('/master.m3u8', '').replace(/^\//, '');
      await deletePrefixFromS3(hlsPrefix);
      deleted.push(`HLS files: ${hlsPrefix}`);
    } catch (error: any) {
      errors.push(`HLS files: ${error.message}`);
    }
  }

  // Delete thumbnail if exists
  if (video.thumbnailUrl) {
    try {
      // Extract S3 key from thumbnail URL
      // Thumbnail URL might be a full URL or just a key
      let thumbnailKey = video.thumbnailUrl;
      
      // If it's a full URL, extract the key
      if (thumbnailKey.includes('amazonaws.com') || thumbnailKey.includes('cloudfront')) {
        // Extract key from URL (everything after bucket name or domain)
        const urlParts = thumbnailKey.split('/');
        thumbnailKey = urlParts.slice(urlParts.findIndex(part => part.includes('thumbnails'))).join('/');
      } else if (thumbnailKey.startsWith('/')) {
        // Remove leading slash
        thumbnailKey = thumbnailKey.substring(1);
      }
      
      // Ensure it's a thumbnail key
      if (thumbnailKey.includes('thumbnails')) {
        await deleteFromS3(thumbnailKey);
        deleted.push(`thumbnail: ${thumbnailKey}`);
      }
    } catch (error: any) {
      // Don't fail if thumbnail deletion fails, just log it
      console.warn(`[S3] Failed to delete thumbnail: ${error.message}`);
    }
  }

  // Log summary
  if (deleted.length > 0) {
    console.log(`[S3] Successfully deleted ${deleted.length} item(s)`);
  }
  if (errors.length > 0) {
    console.error(`[S3] Encountered ${errors.length} error(s) while deleting files`);
    throw new Error(`Failed to delete some S3 files: ${errors.join('; ')}`);
  }
}
