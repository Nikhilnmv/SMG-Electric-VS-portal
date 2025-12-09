import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * Download file from S3 to local filesystem
 */
export async function downloadFromS3(s3Key: string, localPath: string): Promise<void> {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Set STORAGE_MODE=s3 to use S3.');
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body as Readable;

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(localPath);
    stream.pipe(writeStream);

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    stream.on('error', reject);
  });
}

/**
 * Upload file to S3
 */
export async function uploadToS3(s3Key: string, filePath: string, contentType?: string): Promise<void> {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Set STORAGE_MODE=s3 to use S3.');
  }

  const fileContent = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fileContent,
    ...(contentType && { ContentType: contentType }),
  });

  await s3Client.send(command);
}

/**
 * Upload multiple files to S3 in parallel
 */
export async function uploadMultipleToS3(
  files: Array<{ s3Key: string; filePath: string; contentType?: string }>
): Promise<void> {
  await Promise.all(
    files.map(({ s3Key, filePath, contentType }) => uploadToS3(s3Key, filePath, contentType))
  );
}

/**
 * Upload directory contents to S3
 */
export async function uploadDirectoryToS3(
  localDir: string,
  s3Prefix: string
): Promise<void> {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Set STORAGE_MODE=s3 to use S3.');
  }

  const files = fs.readdirSync(localDir, { withFileTypes: true });
  const uploadPromises: Promise<void>[] = [];

  for (const file of files) {
    const localPath = path.join(localDir, file.name);
    const s3Key = `${s3Prefix}/${file.name}`;

    if (file.isFile()) {
      const contentType = getContentType(file.name);
      uploadPromises.push(uploadToS3(s3Key, localPath, contentType));
    } else if (file.isDirectory()) {
      // Recursively upload subdirectories
      await uploadDirectoryToS3(localPath, s3Key);
    }
  }

  await Promise.all(uploadPromises);
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.mp4': 'video/mp4',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

