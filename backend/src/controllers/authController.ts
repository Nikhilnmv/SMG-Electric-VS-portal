import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db';
import { ApiResponse, JWTPayload, CategoryRole } from '@vs-platform/types';
import { AuthRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';
import { EmailService } from '../services/email.service';
import { AuditService } from '../services/auditService';
import { env } from '../config/env';

const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

const VALID_CATEGORY_ROLES: CategoryRole[] = ['DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR'];

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const { email, password, name, categoryRole } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        } as ApiResponse<null>);
      }

      // Validate categoryRole if provided
      let finalCategoryRole: CategoryRole = 'INTERN'; // Default
      if (categoryRole) {
        if (!VALID_CATEGORY_ROLES.includes(categoryRole)) {
          return res.status(400).json({
            success: false,
            error: `Invalid categoryRole. Must be one of: ${VALID_CATEGORY_ROLES.join(', ')}`,
          } as ApiResponse<null>);
        }
        finalCategoryRole = categoryRole;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists',
        } as ApiResponse<null>);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      let user;
      try {
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: 'USER',
            categoryRole: finalCategoryRole,
            tokenVersion: 0,
          },
          select: {
            id: true,
            email: true,
            role: true,
            categoryRole: true,
            tokenVersion: true,
            createdAt: true,
          },
        });
      } catch (dbError: any) {
        // Check if error is related to missing column
        if (dbError?.message?.includes('categoryRole') || dbError?.message?.includes('tokenVersion') || dbError?.code === 'P2021' || dbError?.code === '42703') {
          console.error('Database schema error:', dbError);
          return res.status(500).json({
            success: false,
            error: 'Database migration required. Please run: pnpm --filter backend prisma migrate dev',
            details: 'The categoryRole or tokenVersion columns do not exist. Run the migration to add them.',
          } as ApiResponse<null>);
        }
        throw dbError; // Re-throw if it's a different error
      }

      // Generate JWT token
      const payload: JWTPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        categoryRole: user.categoryRole,
        tokenVersion: user.tokenVersion,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            categoryRole: user.categoryRole,
            createdAt: user.createdAt,
          },
          token,
        },
      } as ApiResponse<{ user: { id: string; email: string; role: string; categoryRole: CategoryRole; createdAt: Date }; token: string }>);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>);
    }
  },

  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
        } as ApiResponse<null>);
      }

      // Find user by username
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        // Use constant-time comparison to prevent timing attacks
        await bcrypt.compare(password, '$2a$10$dummyhashfordummycomparison');
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password',
        } as ApiResponse<null>);
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is inactive. Please contact support.',
        } as ApiResponse<null>);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password',
        } as ApiResponse<null>);
      }

      // Generate JWT token
      const payload: JWTPayload = {
        id: user.id,
        email: user.email,
        username: user.username || undefined,
        role: user.role,
        categoryRole: user.categoryRole,
        tokenVersion: user.tokenVersion,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            categoryRole: user.categoryRole,
            passwordMustChange: user.passwordMustChange,
            createdAt: user.createdAt,
          },
          token,
        },
      } as ApiResponse<{ 
        user: { 
          id: string; 
          email: string; 
          username: string | null;
          role: string; 
          categoryRole: CategoryRole; 
          passwordMustChange: boolean;
          createdAt: Date 
        }; 
        token: string 
      }>);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>);
    }
  },

  refresh: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Refresh endpoint - to be implemented' });
  },

  logout: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Logout endpoint - to be implemented' });
  },

  getProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          categoryRole: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      res.json({
        success: true,
        data: user,
      } as ApiResponse<typeof user>);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
      } as ApiResponse<null>);
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        } as ApiResponse<null>);
      }

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.user.id },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email is already taken',
        } as ApiResponse<null>);
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { email },
        select: {
          id: true,
          email: true,
          role: true,
          categoryRole: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      } as ApiResponse<typeof updatedUser>);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      } as ApiResponse<null>);
    }
  },

  changePassword: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        } as ApiResponse<null>);
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters',
        } as ApiResponse<null>);
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      // Verify current password (skip if passwordMustChange is true - allow change without current password)
      if (!user.passwordMustChange) {
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect',
          } as ApiResponse<null>);
        }
      }

      // Set new password using service
      await UserService.setPassword(req.user.id, newPassword, req.user.id);

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
      } as ApiResponse<null>);
    }
  },

  forgotPassword: async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required',
        } as ApiResponse<null>);
      }

      // Create password reset token (always succeeds to prevent username enumeration)
      const { token, user } = await UserService.createPasswordResetToken(username);

      // Only send email if user exists and is active
      if (user.id && user.email) {
        try {
          await EmailService.sendPasswordResetEmail(user.email, username, token);
          
          // Log audit event
          await AuditService.logPasswordResetRequest(user.id, null);
          
          if (env.DEV_MODE) {
            console.log(`[DEV] Password reset token for ${username}: ${token}`);
          }
        } catch (emailError) {
          console.error('[EmailService] Failed to send password reset email:', emailError);
          // Don't fail the request - token is still created
        }
      }

      // Always return success to prevent username enumeration
      res.json({
        success: true,
        message: 'If an account with that username exists, we have sent a password reset email.',
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Forgot password error:', error);
      // Still return success to prevent username enumeration
      res.json({
        success: true,
        message: 'If an account with that username exists, we have sent a password reset email.',
      } as ApiResponse<null>);
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      const { username, token, newPassword } = req.body;

      if (!username || !token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Username, token, and new password are required',
        } as ApiResponse<null>);
      }

      // Verify token
      const user = await UserService.verifyPasswordResetToken(username, token);

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token',
        } as ApiResponse<null>);
      }

      // Set new password
      await UserService.setPassword(user.id, newPassword, null);

      // Clear reset token
      await UserService.clearPasswordResetToken(user.id);

      // Log audit event
      await AuditService.logPasswordResetCompleted(user.id, null);

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      } as ApiResponse<null>);
    }
  },

  deleteAccount: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to confirm account deletion',
        } as ApiResponse<null>);
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password',
        } as ApiResponse<null>);
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: req.user.id },
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
      } as ApiResponse<null>);
    }
  },
};
