import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { moduleController } from '../controllers/moduleController';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';

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

export const moduleRouter: Router = Router();

// User routes (category-restricted)
moduleRouter.get('/', requireAuth, moduleController.listForUser);
moduleRouter.get('/:id', requireAuth, moduleController.getByIdForUser);

