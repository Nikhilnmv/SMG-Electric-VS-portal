import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadController } from '../controllers/uploadController';

export const uploadRouter = Router();

// All upload routes require authentication
uploadRouter.use(requireAuth);

import multer from 'multer';

// Configure multer for video file uploads
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

// Configure multer for thumbnail image uploads
const uploadThumbnail = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for thumbnails
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for thumbnails'));
    }
    cb(null, true);
  },
});

// Combined multer for both video and thumbnail
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow both video and image files
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed for video field'));
    }
    if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for thumbnail field'));
    }
    cb(null, true);
  },
});

uploadRouter.post('/presigned-url', uploadController.generatePresignedUrl);
uploadRouter.post('/upload-local', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), uploadController.uploadLocal);
uploadRouter.post('/complete', uploadController.completeUpload);

