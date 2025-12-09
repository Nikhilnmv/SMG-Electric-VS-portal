import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { videoController } from '../controllers/videoController';
import { uploadController } from '../controllers/uploadController';
import { validateBody } from '../middleware/validation';
import { registerVideoSchema, updateVideoSchema, updateVideoProgressSchema } from '../schemas/videos';
import multer from 'multer';

// Configure multer for file uploads (supports both video and thumbnail)
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

export const videoRouter = Router();

// Routes that need auth for category filtering
videoRouter.get('/', requireAuth, videoController.list);
videoRouter.get('/category', requireAuth, videoController.listByCategory);
videoRouter.get('/my-videos', requireAuth, videoController.myVideos);
videoRouter.get('/watch-history', requireAuth, videoController.getWatchHistory);
videoRouter.get('/:id', requireAuth, videoController.getById);

// Protected routes with validation
videoRouter.post('/', requireAuth, validateBody(registerVideoSchema), videoController.create);
videoRouter.post('/register', requireAuth, validateBody(registerVideoSchema), videoController.create);
videoRouter.post('/upload-local', requireAuth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), uploadController.uploadLocal);
videoRouter.put('/:id', requireAuth, validateBody(updateVideoSchema), videoController.update);
videoRouter.delete('/:id', requireAuth, videoController.delete);
videoRouter.post('/:id/progress', requireAuth, validateBody(updateVideoProgressSchema), videoController.updateProgress);

