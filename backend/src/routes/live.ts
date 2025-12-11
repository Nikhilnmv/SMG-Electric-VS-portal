import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { liveController } from '../controllers/liveController';

export const liveRouter: Router = Router();

liveRouter.get('/', liveController.list);
liveRouter.get('/:id', liveController.getById);

liveRouter.use(requireAuth);

liveRouter.post('/', liveController.create);
liveRouter.post('/:id/start', liveController.start);
liveRouter.post('/:id/end', liveController.end);

