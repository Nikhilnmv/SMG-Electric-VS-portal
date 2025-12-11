import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { lessonController } from '../controllers/lessonController';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed for video field'));
    }
    if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for thumbnail field'));
    }
    cb(null, true);
  },
});

const createLessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

const updateProgressSchema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

export const lessonRouter: Router = Router();

// User routes (category-restricted)
lessonRouter.get('/:id', requireAuth, lessonController.getByIdForUser);
lessonRouter.get('/:id/stream', requireAuth, lessonController.getStreamUrl);
lessonRouter.post('/:id/progress', requireAuth, validateBody(updateProgressSchema), lessonController.updateProgress);

