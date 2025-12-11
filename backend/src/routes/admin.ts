import { Router } from 'express';
import { requireAuth, requireRole, requireAdmin } from '../middleware/auth';
import { adminController } from '../controllers/adminController';
import { analyticsController } from '../controllers/analyticsController';
import { moduleController } from '../controllers/moduleController';
import { lessonController } from '../controllers/lessonController';
import { validateBody } from '../middleware/validation';
import { updateUserRoleSchema, updateUserCategorySchema, createUserSchema } from '../schemas/admin';
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

const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  allowedCategories: z.array(z.string()).optional(),
});

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  allowedCategories: z.array(z.string()).optional(),
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

export const adminRouter: Router = Router();

// All admin routes require authentication
adminRouter.use(requireAuth);

// User management routes (admin only)
adminRouter.get('/users', requireAdmin, adminController.listUsers);
adminRouter.post('/users/create', requireAdmin, validateBody(createUserSchema), adminController.createUser);
adminRouter.get('/users/:id/initial-password', requireAdmin, adminController.getUserInitialPassword);
adminRouter.post('/users/:id/send-credentials', requireAdmin, adminController.sendUserCredentialsEmail);
adminRouter.delete('/users/:id', requireAdmin, adminController.deleteUser);
adminRouter.patch('/users/:id/role', requireAdmin, validateBody(updateUserRoleSchema), adminController.updateUserRole);
adminRouter.patch('/users/:id/category', requireAdmin, validateBody(updateUserCategorySchema), adminController.updateUserCategory);

// Statistics route (admin and editor)
adminRouter.get('/stats', requireRole('admin', 'editor'), adminController.getStats);

// Analytics routes (admin and editor)
adminRouter.get('/analytics/overview', requireRole('admin', 'editor'), analyticsController.getOverview);
adminRouter.get('/analytics/video/:videoId', requireRole('admin', 'editor'), analyticsController.getVideoAnalytics);
adminRouter.get('/analytics/focus', requireRole('admin', 'editor'), analyticsController.getFocusAnalytics);

// Module management routes (admin only)
adminRouter.post('/modules', requireAdmin, validateBody(createModuleSchema), moduleController.create);
adminRouter.get('/modules', requireAdmin, moduleController.list);
adminRouter.get('/modules/:id', requireAdmin, moduleController.getById);
adminRouter.patch('/modules/:id', requireAdmin, validateBody(updateModuleSchema), moduleController.update);
adminRouter.delete('/modules/:id', requireAdmin, moduleController.delete);

// Lesson management routes (admin only)
adminRouter.post('/modules/:moduleId/lessons', requireAdmin, validateBody(createLessonSchema), lessonController.create);
adminRouter.post('/lessons/:lessonId/upload', requireAdmin, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), lessonController.upload);
adminRouter.patch('/lessons/:lessonId', requireAdmin, validateBody(updateLessonSchema), lessonController.update);
adminRouter.delete('/lessons/:lessonId', requireAdmin, lessonController.delete);

