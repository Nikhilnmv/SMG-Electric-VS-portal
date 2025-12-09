import * as fs from 'fs';
import * as path from 'path';

// Use environment variable or default to backend/uploads (relative to workspace root)
// Try multiple possible paths
function findUploadsDir(): string {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  // Try from process.cwd() (works when running from workspace root)
  const cwdPath = path.join(process.cwd(), 'backend', 'uploads');
  if (fs.existsSync(cwdPath)) {
    return path.resolve(cwdPath);
  }

  // Try going up one level from process.cwd() (works when running from worker directory)
  const cwdParentPath = path.join(process.cwd(), '..', 'backend', 'uploads');
  if (fs.existsSync(cwdParentPath)) {
    return path.resolve(cwdParentPath);
  }

  // Try going up from __dirname to find workspace root
  // __dirname is typically worker/src/services or worker/dist/services
  // We need to go up 3 levels: services -> src/dist -> worker -> workspace root
  const workspaceRoot1 = path.join(__dirname, '../../../..', 'backend', 'uploads');
  if (fs.existsSync(workspaceRoot1)) {
    return path.resolve(workspaceRoot1);
  }

  // Try going up 2 levels (in case we're already at a different level)
  const workspaceRoot2 = path.join(__dirname, '../../..', 'backend', 'uploads');
  if (fs.existsSync(workspaceRoot2)) {
    return path.resolve(workspaceRoot2);
  }

  // Try relative to worker directory (legacy fallback)
  const relativePath = path.join(__dirname, '../../backend/uploads');
  if (fs.existsSync(relativePath)) {
    return path.resolve(relativePath);
  }

  // Default fallback - use workspace root assumption
  // Go up 3 levels from worker/src/services to get to workspace root
  return path.resolve(__dirname, '../../../..', 'backend', 'uploads');
}

const UPLOADS_DIR = findUploadsDir();
const RAW_DIR = path.join(UPLOADS_DIR, 'raw');
const HLS_DIR = path.join(UPLOADS_DIR, 'hls');

console.log(`[Worker LocalStorage] UPLOADS_DIR: ${UPLOADS_DIR}`);
console.log(`[Worker LocalStorage] RAW_DIR: ${RAW_DIR}`);
console.log(`[Worker LocalStorage] HLS_DIR: ${HLS_DIR}`);

/**
 * Get local file path from filePath or s3Key
 */
export function getLocalFilePath(filePath: string): string {
  console.log(`[Worker LocalStorage] Resolving file path: ${filePath}`);
  console.log(`[Worker LocalStorage] UPLOADS_DIR: ${UPLOADS_DIR}`);
  
  // IMPORTANT: Check for /uploads/ prefix FIRST, before checking if it's absolute
  // because /uploads/... looks like an absolute path on Unix but is actually relative to UPLOADS_DIR
  if (filePath.startsWith('/uploads/')) {
    const relativePath = filePath.replace('/uploads/', '');
    const absolutePath = path.join(UPLOADS_DIR, relativePath);
    console.log(`[Worker LocalStorage] Converted /uploads path: ${filePath} -> ${absolutePath}`);
    
    if (fs.existsSync(absolutePath)) {
      console.log(`[Worker LocalStorage] File found at: ${absolutePath}`);
      return absolutePath;
    } else {
      console.error(`[Worker LocalStorage] File not found at converted path: ${absolutePath}`);
      console.error(`[Worker LocalStorage] UPLOADS_DIR exists: ${fs.existsSync(UPLOADS_DIR)}`);
      console.error(`[Worker LocalStorage] Parent dir exists: ${fs.existsSync(path.dirname(absolutePath))}`);
      throw new Error(`File not found at converted path: ${absolutePath}`);
    }
  }

  // If it's already an absolute path (and not /uploads/), verify it exists
  if (path.isAbsolute(filePath)) {
    if (fs.existsSync(filePath)) {
      console.log(`[Worker LocalStorage] Using absolute path: ${filePath}`);
      return filePath;
    } else {
      throw new Error(`Absolute path does not exist: ${filePath}`);
    }
  }

  // Otherwise, assume it's a videoId and look for the file
  const videoDir = path.join(RAW_DIR, filePath);
  console.log(`[Worker LocalStorage] Trying videoId lookup in: ${videoDir}`);
  
  if (fs.existsSync(videoDir)) {
    const files = fs.readdirSync(videoDir);
    console.log(`[Worker LocalStorage] Found ${files.length} files in video directory`);
    const videoFile = files.find((f) => f.startsWith('original'));
    if (videoFile) {
      const fullPath = path.join(videoDir, videoFile);
      console.log(`[Worker LocalStorage] Found video file: ${fullPath}`);
      return fullPath;
    }
  }

  throw new Error(`Video file not found: ${filePath} (checked: ${videoDir})`);
}

/**
 * Get HLS directory path for video
 */
export function getHlsDirPath(videoId: string, categoryRole?: string): string {
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
 * Copy file from source to destination
 */
export function copyFile(sourcePath: string, destPath: string): void {
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

