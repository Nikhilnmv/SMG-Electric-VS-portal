import { Router } from 'express';
import { requireAuth, requireRole, requireAdmin } from '../middleware/auth';
import { adminController } from '../controllers/adminController';
import { analyticsController } from '../controllers/analyticsController';
import { validateBody } from '../middleware/validation';
import { updateUserRoleSchema, updateUserCategorySchema, approveVideoSchema, rejectVideoSchema, createUserSchema } from '../schemas/admin';

export const adminRouter = Router();

// All admin routes require authentication
adminRouter.use(requireAuth);

// Video moderation routes (admin and editor)
adminRouter.get('/videos/pending', requireRole('admin', 'editor'), adminController.getPendingVideos);
adminRouter.get('/videos', requireRole('admin', 'editor'), adminController.listVideos);
adminRouter.post('/videos/:id/approve', requireRole('admin', 'editor'), validateBody(approveVideoSchema), adminController.approveVideo);
adminRouter.post('/videos/:id/reject', requireRole('admin', 'editor'), validateBody(rejectVideoSchema), adminController.rejectVideo);

// User management routes (admin only)
adminRouter.get('/users', requireAdmin, adminController.listUsers);
adminRouter.post('/users/create', requireAdmin, validateBody(createUserSchema), adminController.createUser);
adminRouter.patch('/users/:id/role', requireAdmin, validateBody(updateUserRoleSchema), adminController.updateUserRole);
adminRouter.patch('/users/:id/category', requireAdmin, validateBody(updateUserCategorySchema), adminController.updateUserCategory);

// Statistics route (admin and editor)
adminRouter.get('/stats', requireRole('admin', 'editor'), adminController.getStats);

// Analytics routes (admin and editor)
adminRouter.get('/analytics/overview', requireRole('admin', 'editor'), analyticsController.getOverview);
adminRouter.get('/analytics/video/:videoId', requireRole('admin', 'editor'), analyticsController.getVideoAnalytics);
adminRouter.get('/analytics/focus', requireRole('admin', 'editor'), analyticsController.getFocusAnalytics);

