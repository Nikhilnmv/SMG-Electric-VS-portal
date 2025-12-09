import { Request, Response } from 'express';
import { ApiResponse, CategoryRole } from '@vs-platform/types';
import { prisma } from '../lib/db';
import { AuthRequest } from '../middleware/auth';
import { deleteFromS3, deletePrefixFromS3 } from '../services/s3';
import { AuditService } from '../services/auditService';
import { UserService } from '../services/user.service';
import { EmailService } from '../services/email.service';
import bcrypt from 'bcryptjs';

export const adminController = {
  /**
   * Get pending videos (UPLOADED, PROCESSING, or READY but not APPROVED)
   */
  getPendingVideos: async (req: Request, res: Response) => {
    try {
      const videos = await prisma.video.findMany({
        where: {
          status: {
            in: ['UPLOADED', 'PROCESSING', 'READY'],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formattedVideos = videos.map((video) => ({
        id: video.id,
        title: video.title,
        userId: video.userId,
        uploadDate: video.createdAt,
        status: video.status,
        hlsPath: video.hlsPath,
        userEmail: video.user.email,
      }));

      res.json({
        success: true,
        data: formattedVideos,
      } as ApiResponse<typeof formattedVideos>);
    } catch (error) {
      console.error('Get pending videos error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending videos',
      } as ApiResponse<null>);
    }
  },

  /**
   * List all videos (for admin dashboard)
   */
  listVideos: async (req: Request, res: Response) => {
    try {
      const videos = await prisma.video.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: videos,
      } as ApiResponse<typeof videos>);
    } catch (error) {
      console.error('List videos error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch videos',
      } as ApiResponse<null>);
    }
  },

  /**
   * Approve a video (change status to APPROVED)
   */
  approveVideo: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      // Allow approving videos that are READY, UPLOADED, or PROCESSING
      // PROCESSING videos will be approved but won't be visible to users until transcoding completes (status becomes READY)
      if (!['READY', 'UPLOADED', 'PROCESSING'].includes(video.status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot approve video with status ${video.status}. Video must be READY, UPLOADED, or PROCESSING.`,
        } as ApiResponse<null>);
      }

      const updatedVideo = await prisma.video.update({
        where: { id },
        data: {
          status: 'APPROVED',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Log audit event
      if (req.user?.id) {
        await AuditService.logVideoApproval(
          req.user.id,
          id,
          req.body.notes
        );
      }

      res.json({
        success: true,
        data: updatedVideo,
        message: 'Video approved successfully',
      } as ApiResponse<typeof updatedVideo>);
    } catch (error) {
      console.error('Approve video error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve video',
      } as ApiResponse<null>);
    }
  },

  /**
   * Reject a video (change status to REJECTED, optionally delete from S3)
   */
  rejectVideo: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { deleteFromStorage } = req.body; // Optional flag to delete from S3

      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      // Update status to REJECTED
      const updatedVideo = await prisma.video.update({
        where: { id },
        data: {
          status: 'REJECTED',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Log audit event
      if (req.user?.id) {
        await AuditService.logVideoRejection(
          req.user.id,
          id,
          req.body.reason || 'No reason provided',
          req.body.notes
        );
      }

      // Optionally delete from storage
      if (deleteFromStorage) {
        try {
          const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
          
          if (STORAGE_MODE === 'local') {
            // Delete from local storage
            const { deleteLocalVideo } = await import('../services/localStorage');
            await deleteLocalVideo(video.id);
          } else {
            // Delete from S3
            if (video.s3Key) {
              try {
                await deleteFromS3(video.s3Key);
              } catch (s3Error) {
                console.error('Error deleting raw video from S3:', s3Error);
                // Continue with HLS deletion
              }
            }

            // Delete HLS files if they exist
            if (video.hlsPath) {
              try {
                const hlsPrefix = video.hlsPath.substring(0, video.hlsPath.lastIndexOf('/'));
                await deletePrefixFromS3(hlsPrefix);
              } catch (hlsError) {
                console.error('Error deleting HLS files from S3:', hlsError);
                // Continue - video is already marked as rejected
              }
            }
          }
        } catch (storageError) {
          console.error('Error deleting from storage:', storageError);
          // Continue even if deletion fails - video is already marked as rejected
          // Return success but with a warning message
          return res.json({
            success: true,
            data: updatedVideo,
            message: 'Video rejected successfully. Some files may not have been deleted from storage.',
            warning: storageError instanceof Error ? storageError.message : 'Storage deletion failed',
          } as ApiResponse<typeof updatedVideo>);
        }
      }

      res.json({
        success: true,
        data: updatedVideo,
        message: 'Video rejected successfully',
      } as ApiResponse<typeof updatedVideo>);
    } catch (error) {
      console.error('Reject video error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject video',
      } as ApiResponse<null>);
    }
  },

  /**
   * List all users
   */
  listUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
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
      const [totalUsers, totalVideos, completedVideos, pendingVideos] = await Promise.all([
        prisma.user.count(),
        prisma.video.count(),
        prisma.video.count({
          where: {
            status: {
              in: ['READY', 'APPROVED'],
            },
          },
        }),
        prisma.video.count({
          where: {
            status: {
              in: ['UPLOADED', 'PROCESSING'],
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
          pendingApprovals: pendingVideos,
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

      // Log audit event
      await AuditService.logUserCreation(
        req.user.id,
        result.id,
        {
          email: result.email,
          username: result.username,
          role: user.role,
          categoryRole: user.categoryRole,
          passwordMustChange: result.passwordMustChange,
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
};

