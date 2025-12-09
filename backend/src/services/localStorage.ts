import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Use environment variable or default to backend/uploads
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
const UPLOADS_DIR = path.resolve(UPLOADS_BASE);
const RAW_DIR = path.join(UPLOADS_DIR, 'raw');
const HLS_DIR = path.join(UPLOADS_DIR, 'hls');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Ensure upload directories exist
function ensureDirectories() {
  [UPLOADS_DIR, RAW_DIR, HLS_DIR, THUMBNAILS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Initialize directories on module load
ensureDirectories();

export interface LocalUploadResult {
  videoId: string;
  filePath: string;
  thumbnailPath?: string;
}

/**
 * Save uploaded file to local storage
 */
export async function saveLocalFile(
  file: Express.Multer.File,
  videoId?: string
): Promise<LocalUploadResult> {
  ensureDirectories();

  const finalVideoId = videoId || uuidv4();
  const videoDir = path.join(RAW_DIR, finalVideoId);

  // Create video directory
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  // Determine file extension from original name or mimetype
  const ext = path.extname(file.originalname) || '.mp4';
  const fileName = `original${ext}`;
  const filePath = path.join(videoDir, fileName);

  // Check if file already exists (prevent overwriting on retry)
  if (fs.existsSync(filePath)) {
    console.log(`[LocalStorage] File already exists at ${filePath}, skipping save`);
    const stats = fs.statSync(filePath);
    console.log(`[LocalStorage] Existing file size: ${stats.size} bytes`);
    return {
      videoId: finalVideoId,
      filePath: `/uploads/raw/${finalVideoId}/${fileName}`,
    };
  }

  console.log(`[LocalStorage] Saving file to: ${filePath}`);
  console.log(`[LocalStorage] File size: ${file.buffer.length} bytes`);

  // Save file
  fs.writeFileSync(filePath, file.buffer);

  // Verify file was written
  if (!fs.existsSync(filePath)) {
    throw new Error(`Failed to save file: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  console.log(`[LocalStorage] File saved successfully. Size: ${stats.size} bytes`);

  return {
    videoId: finalVideoId,
    filePath: `/uploads/raw/${finalVideoId}/${fileName}`,
  };
}

/**
 * Get local file path for video
 * Accepts either videoId or full filePath
 */
export function getLocalFilePath(videoIdOrPath: string): string {
  // If it's already an absolute path, return it
  if (path.isAbsolute(videoIdOrPath)) {
    return videoIdOrPath;
  }

  // If it starts with /uploads, convert to absolute path
  if (videoIdOrPath.startsWith('/uploads/')) {
    const relativePath = videoIdOrPath.replace('/uploads/', '');
    return path.join(UPLOADS_DIR, relativePath);
  }

  // Otherwise, assume it's a videoId and look for the file
  const videoDir = path.join(RAW_DIR, videoIdOrPath);
  if (fs.existsSync(videoDir)) {
    const files = fs.readdirSync(videoDir);
    const videoFile = files.find((f) => f.startsWith('original'));
    if (videoFile) {
      return path.join(videoDir, videoFile);
    }
  }

  throw new Error(`Video file not found: ${videoIdOrPath}`);
}

/**
 * Get HLS directory path for video
 */
export function getHlsDirPath(videoId: string, categoryRole?: string): string {
  ensureDirectories();
  
  const prefixByCategory = process.env.HLS_PREFIX_BY_CATEGORY === 'true';
  let hlsPath: string;

  if (prefixByCategory && categoryRole) {
    hlsPath = path.join(HLS_DIR, categoryRole, videoId);
  } else {
    hlsPath = path.join(HLS_DIR, videoId);
  }

  // Ensure directory exists
  if (!fs.existsSync(hlsPath)) {
    fs.mkdirSync(hlsPath, { recursive: true });
  }

  return hlsPath;
}

/**
 * Get HLS URL path for video
 */
export function getHlsUrlPath(videoId: string, categoryRole?: string): string {
  const prefixByCategory = process.env.HLS_PREFIX_BY_CATEGORY === 'true';
  
  if (prefixByCategory && categoryRole) {
    return `/uploads/hls/${categoryRole}/${videoId}/master.m3u8`;
  }
  
  return `/uploads/hls/${videoId}/master.m3u8`;
}

/**
 * Delete local video files
 */
export async function deleteLocalVideo(videoId: string): Promise<void> {
  const rawDir = path.join(RAW_DIR, videoId);
  const hlsDir = path.join(HLS_DIR, videoId);
  const hlsDirWithCategory = path.join(HLS_DIR); // Will need to search for category subdirs

  // Delete raw video directory
  if (fs.existsSync(rawDir)) {
    fs.rmSync(rawDir, { recursive: true, force: true });
  }

  // Delete HLS directory (check both with and without category)
  if (fs.existsSync(hlsDir)) {
    fs.rmSync(hlsDir, { recursive: true, force: true });
  }

  // Also check category subdirectories
  if (fs.existsSync(hlsDirWithCategory)) {
    const categoryDirs = fs.readdirSync(hlsDirWithCategory);
    for (const categoryDir of categoryDirs) {
      const categoryHlsDir = path.join(hlsDirWithCategory, categoryDir, videoId);
      if (fs.existsSync(categoryHlsDir)) {
        fs.rmSync(categoryHlsDir, { recursive: true, force: true });
      }
    }
  }
}

/**
 * Copy file from one location to another
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(sourcePath, destPath);
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Save uploaded thumbnail image to local storage
 */
export async function saveLocalThumbnail(
  file: Express.Multer.File,
  videoId: string
): Promise<string> {
  ensureDirectories();

  const thumbnailDir = path.join(THUMBNAILS_DIR, videoId);

  // Create thumbnail directory for this video
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  // Determine file extension from original name or mimetype
  const ext = path.extname(file.originalname) || '.jpg';
  const fileName = `thumbnail${ext}`;
  const filePath = path.join(thumbnailDir, fileName);

  // Check if thumbnail already exists (prevent overwriting on retry)
  if (fs.existsSync(filePath)) {
    console.log(`[LocalStorage] Thumbnail already exists at ${filePath}, skipping save`);
    return `/uploads/thumbnails/${videoId}/${fileName}`;
  }

  console.log(`[LocalStorage] Saving thumbnail to: ${filePath}`);
  console.log(`[LocalStorage] Thumbnail size: ${file.buffer.length} bytes`);

  // Save file
  fs.writeFileSync(filePath, file.buffer);

  // Verify file was written
  if (!fs.existsSync(filePath)) {
    throw new Error(`Failed to save thumbnail: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  console.log(`[LocalStorage] Thumbnail saved successfully. Size: ${stats.size} bytes`);

  return `/uploads/thumbnails/${videoId}/${fileName}`;
}

/**
 * Get thumbnail URL path for video
 */
export function getThumbnailUrlPath(videoId: string): string | null {
  const thumbnailDir = path.join(THUMBNAILS_DIR, videoId);
  if (!fs.existsSync(thumbnailDir)) {
    return null;
  }

  const files = fs.readdirSync(thumbnailDir);
  const thumbnailFile = files.find((f) => f.startsWith('thumbnail'));
  if (thumbnailFile) {
    return `/uploads/thumbnails/${videoId}/${thumbnailFile}`;
  }

  return null;
}

