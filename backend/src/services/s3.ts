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

/**
 * Delete a single object from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!s3Client) {
    console.warn('S3 client not initialized. Skipping S3 delete.');
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete all objects with a given prefix (e.g., all HLS files for a video)
 */
export async function deletePrefixFromS3(prefix: string): Promise<void> {
  if (!s3Client) {
    console.warn('S3 client not initialized. Skipping S3 prefix delete.');
    return;
  }

  const listCommand = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
  });

  const listedObjects = await s3Client.send(listCommand);

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    return;
  }

  // Delete all objects with the prefix
  const deletePromises = listedObjects.Contents.map(({ Key }) => {
    if (Key) {
      return deleteFromS3(Key);
    }
  }).filter(Boolean) as Promise<void>[];

  await Promise.all(deletePromises);
}
