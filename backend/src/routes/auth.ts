import { Router } from 'express';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth';
import { rateLimitForgotPassword } from '../middleware/rateLimit';

export const authRouter: Router = Router();

// Public registration disabled - only admins can create users via /api/admin/users/create
// authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
authRouter.post('/logout', authController.logout);

// Password reset routes (public)
authRouter.post('/forgot-password', rateLimitForgotPassword, validateBody(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// Profile routes (require authentication)
authRouter.get('/profile', requireAuth, authController.getProfile);
authRouter.patch('/profile', requireAuth, validateBody(updateProfileSchema), authController.updateProfile);
authRouter.post('/profile/change-password', requireAuth, validateBody(changePasswordSchema), authController.changePassword);
authRouter.delete('/profile', requireAuth, authController.deleteAccount);

