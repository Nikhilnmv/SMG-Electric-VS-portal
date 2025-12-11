import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { analyticsController } from '../controllers/analyticsController';
import { validateBody } from '../middleware/validation';
import { AnalyticsEventRequestSchema } from '../schemas/analytics';

export const analyticsRouter: Router = Router();

analyticsRouter.use(requireAuth);

// Event tracking endpoint with validation (using request schema that doesn't require userId)
analyticsRouter.post('/event', validateBody(AnalyticsEventRequestSchema), analyticsController.trackEvent);

// Analytics endpoints
analyticsRouter.get('/video/:videoId', analyticsController.getVideoAnalytics);
analyticsRouter.get('/user/:userId', analyticsController.getUserAnalytics);
analyticsRouter.get('/dashboard/admin', analyticsController.getAdminDashboard);
analyticsRouter.get('/dashboard/user', analyticsController.getUserDashboard);

// Legacy endpoints for backward compatibility
analyticsRouter.post('/events', validateBody(AnalyticsEventRequestSchema), analyticsController.trackEvent);

