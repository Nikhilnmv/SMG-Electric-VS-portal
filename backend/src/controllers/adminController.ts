import { Request, Response } from 'express';
import { ApiResponse, CategoryRole } from '@vs-platform/types';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { UserService } from '../services/user.service';
import { EmailService } from '../services/email.service';
import { env } from '../config/env';
import bcrypt from 'bcryptjs';

export const adminController = {
  /**
   * List all users
   */
  listUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          categoryRole: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: users,
      } as ApiResponse<typeof users>);
    } catch (error: any) {
      console.error('List users error:', error);
      // Check if error is related to missing column
      if (error?.message?.includes('categoryRole') || error?.code === 'P2021' || error?.code === '42703') {
        return res.status(500).json({
          success: false,
          error: 'Database migration required. Please run: pnpm --filter backend prisma migrate dev',
          details: 'The categoryRole column does not exist in the database. Run the migration to add it.',
        } as ApiResponse<null>);
      }
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: error?.message || 'Unknown error',
      } as ApiResponse<null>);
    }
  },

  /**
   * Get admin dashboard statistics
   */
  getStats: async (req: Request, res: Response) => {
    try {
      const [totalUsers, totalVideos, completedVideos] = await Promise.all([
        prisma.user.count(),
        prisma.video.count(),
        prisma.video.count({
          where: {
            status: {
              in: ['READY', 'APPROVED'],
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalVideos,
          completedVideos,
          pendingApprovals: 0,
        },
      } as ApiResponse<{
        totalUsers: number;
        totalVideos: number;
        completedVideos: number;
        pendingApprovals: number;
      }>);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
      } as ApiResponse<null>);
    }
  },

  /**
   * Update user role
   */
  updateUserRole: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['ADMIN', 'USER', 'EDITOR'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be ADMIN, USER, or EDITOR',
        } as ApiResponse<null>);
      }

      // Prevent users from changing their own role
      if (req.user?.id === id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot change your own role',
        } as ApiResponse<null>);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      const oldRole = user.role;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role: role as 'ADMIN' | 'USER' | 'EDITOR' },
        select: {
          id: true,
          email: true,
          role: true,
          categoryRole: true,
          createdAt: true,
        },
      });

      // Log audit event and invalidate tokens
      if (req.user?.id) {
        await AuditService.logAuthRoleChange(
          req.user.id,
          id,
          oldRole,
          role
        );
        
        // Increment tokenVersion to invalidate existing tokens
        await prisma.user.update({
          where: { id },
          data: { tokenVersion: { increment: 1 } },
        });
      }

      res.json({
        success: true,
        data: updatedUser,
        message: `User role updated to ${role}. User will need to log in again.`,
      } as ApiResponse<typeof updatedUser>);
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
      } as ApiResponse<null>);
    }
  },

  /**
   * Update user categoryRole
   */
  updateUserCategory: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { categoryRole } = req.body;

      const VALID_CATEGORY_ROLES = ['DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR'];

      if (!categoryRole || !VALID_CATEGORY_ROLES.includes(categoryRole)) {
        return res.status(400).json({
          success: false,
          error: `Invalid categoryRole. Must be one of: ${VALID_CATEGORY_ROLES.join(', ')}`,
        } as ApiResponse<null>);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      const oldCategoryRole = user.categoryRole;

      // Update categoryRole and increment tokenVersion to invalidate existing tokens
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          categoryRole: categoryRole as 'DEALER' | 'EMPLOYEE' | 'TECHNICIAN' | 'STAKEHOLDER' | 'INTERN' | 'VENDOR',
          tokenVersion: { increment: 1 },
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

      // Log audit event
      if (req.user?.id) {
        await AuditService.logCategoryRoleChange(
          req.user.id,
          id,
          oldCategoryRole,
          categoryRole
        );
      }

      res.json({
        success: true,
        data: updatedUser,
        message: `User category updated from ${oldCategoryRole} to ${categoryRole}. User will need to log in again.`,
      } as ApiResponse<typeof updatedUser>);
    } catch (error) {
      console.error('Update user category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user category',
      } as ApiResponse<null>);
    }
  },

  /**
   * Get analytics dashboard data
   */
  getAnalytics: async (req: Request, res: Response) => {
    try {
      // Placeholder for analytics - can be expanded later
      const totalEvents = await prisma.analyticsEvent.count();
      const playEvents = await prisma.analyticsEvent.count({
        where: {
          eventType: 'PLAY',
        },
      });

      res.json({
        success: true,
        data: {
          totalEvents,
          playEvents,
        },
      } as ApiResponse<{ totalEvents: number; playEvents: number }>);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
      } as ApiResponse<null>);
    }
  },

  /**
   * Create a new user (admin only)
   * Password is optional - if not provided, a secure random password will be generated
   * Username is auto-generated from name or email
   */
  createUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { 
        email, 
        password, 
        name, 
        categoryRole, 
        role,
        generateUsername = true,
        generateTempPassword = true,
        sendCredentialsEmail = false,
      } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        } as ApiResponse<null>);
      }

      // Create user using service
      const result = await UserService.createUserByAdmin(
        {
          email,
          name,
          password: password || undefined,
          categoryRole: categoryRole || 'INTERN',
          role: role || 'USER',
          generateUsername,
          generateTempPassword: !password && generateTempPassword,
        },
        req.user.id
      );

      // Get full user data
      const user = await prisma.user.findUnique({
        where: { id: result.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          categoryRole: true,
          createdAt: true,
          passwordMustChange: true,
        },
      });

      if (!user) {
        throw new Error('User created but not found');
      }

      // Log audit event (store initial password for admin retrieval)
      await AuditService.logUserCreation(
        req.user.id,
        result.id,
        {
          email: result.email,
          username: result.username,
          role: user.role,
          categoryRole: user.categoryRole,
          passwordMustChange: result.passwordMustChange,
          initialPassword: result.password, // Store initial password in audit log
        }
      );

      // Send credentials email if requested
      if (sendCredentialsEmail && user.username) {
        try {
          await EmailService.sendUserCredentialsEmail(
            result.email,
            result.username,
            result.password,
            result.passwordMustChange
          );
        } catch (emailError) {
          console.error('[EmailService] Failed to send credentials email:', emailError);
          // Don't fail the request - user is still created
        }
      }

      res.status(201).json({
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
          // Only return password if it was auto-generated
          password: result.passwordMustChange ? result.password : undefined,
        },
        message: password 
          ? 'User created successfully' 
          : 'User created successfully. Please securely share the generated credentials with the user.',
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
        password?: string;
      }>);
    } catch (error: any) {
      console.error('Create user error:', error);
      
      // Check if error is related to missing column
      if (error?.message?.includes('categoryRole') || error?.message?.includes('tokenVersion') || error?.message?.includes('username') || error?.code === 'P2021' || error?.code === '42703') {
        return res.status(500).json({
          success: false,
          error: 'Database migration required. Please run: pnpm --filter backend prisma migrate dev',
          details: 'Some required columns do not exist. Run the migration to add them.',
        } as ApiResponse<null>);
      }

      // Handle duplicate email/username
      if (error?.message?.includes('already exists') || error?.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: error.message || 'User with this email or username already exists',
        } as ApiResponse<null>);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        details: error?.message || 'Unknown error',
      } as ApiResponse<null>);
    }
  },

  /**
   * Send credentials email to an existing user
   * Generates a new temporary password and emails it to the user
   */
  sendUserCredentialsEmail: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;

      // Find user
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          error: 'User is not active',
        } as ApiResponse<null>);
      }

      if (!user.username) {
        return res.status(400).json({
          success: false,
          error: 'User does not have a username',
        } as ApiResponse<null>);
      }

      // Generate a new temporary password
      const newPassword = UserService.generateTempPassword(12);

      // Update user password and set passwordMustChange flag
      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS),
          passwordMustChange: true,
          tokenVersion: { increment: 1 }, // Invalidate existing tokens
          lastPasswordChangeAt: new Date(),
        },
      });

      // Send credentials email
      try {
        await EmailService.sendUserCredentialsEmail(
          user.email,
          user.username,
          newPassword,
          true // isTemporary
        );
      } catch (emailError) {
        console.error('[EmailService] Failed to send credentials email:', emailError);
        // Still return success since password was reset
        // But log the error
      }

      // Note: We could add a separate audit log method for credentials email sending
      // For now, we'll just log via console since this is a different action than user creation

      res.json({
        success: true,
        message: 'Credentials email sent successfully. User will need to use the new password on next login.',
      } as ApiResponse<null>);
    } catch (error: any) {
      console.error('Send credentials email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send credentials email',
        details: error?.message || 'Unknown error',
      } as ApiResponse<null>);
    }
  },

  /**
   * Delete a user (admin only)
   */
  deleteUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account',
        } as ApiResponse<null>);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        } as ApiResponse<null>);
      }

      // Delete user (cascade will handle related records like videos)
      await prisma.user.delete({
        where: { id },
      });

      // Log audit event
      await AuditService.log({
        actorId: req.user.id,
        targetUserId: id,
        action: 'USER_DELETED',
        metadata: {
          deletedUserEmail: user.email,
          deletedUsername: user.username,
        },
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
      } as ApiResponse<null>);
    } catch (error: any) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        details: error?.message || 'Unknown error',
      } as ApiResponse<null>);
    }
  },

  /**
   * Get initial password for a user from audit log
   */
  getUserInitialPassword: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;

      // Find the USER_CREATED audit log entry for this user
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          targetUserId: id,
          action: 'USER_CREATED',
        },
        orderBy: {
          timestamp: 'asc', // Get the first creation entry
        },
      });

      if (!auditLog || !auditLog.metadata) {
        return res.status(404).json({
          success: false,
          error: 'Initial password not found. User may have been created before this feature was added.',
        } as ApiResponse<null>);
      }

      // Parse metadata to get initial password
      let metadata: any = {};
      try {
        metadata = JSON.parse(auditLog.metadata);
      } catch (e) {
        return res.status(500).json({
          success: false,
          error: 'Failed to parse audit log metadata',
        } as ApiResponse<null>);
      }

      const initialPassword = metadata.initialPassword;

      if (!initialPassword) {
        return res.status(404).json({
          success: false,
          error: 'Initial password not found in audit log',
        } as ApiResponse<null>);
      }

      res.json({
        success: true,
        data: {
          initialPassword,
          createdAt: auditLog.timestamp,
        },
      } as ApiResponse<{ initialPassword: string; createdAt: Date }>);
    } catch (error: any) {
      console.error('Get user initial password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve initial password',
        details: error?.message || 'Unknown error',
      } as ApiResponse<null>);
    }
  },
};

