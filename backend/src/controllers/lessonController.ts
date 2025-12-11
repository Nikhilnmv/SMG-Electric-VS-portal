import { Response } from 'express';
import { prisma } from '../lib/db';
import { ApiResponse } from '@vs-platform/types';
import { AuthRequest } from '../middleware/auth';
import { CategoryRole } from '@vs-platform/types';
import { LessonService } from '../services/lessonService';

export const lessonController = {
  // Admin: Create lesson
  create: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { moduleId } = req.params;
      const { title, description, order } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required',
        } as ApiResponse<null>);
      }

      // Verify module exists
      const module = await prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found',
        } as ApiResponse<null>);
      }

      // Get max order if not provided
      let lessonOrder = order;
      if (lessonOrder === undefined) {
        const maxOrder = await prisma.lesson.findFirst({
          where: { moduleId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        lessonOrder = (maxOrder?.order ?? -1) + 1;
      }

      const lesson = await prisma.lesson.create({
        data: {
          moduleId,
          title,
          description: description || null,
          order: lessonOrder,
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: lesson,
      } as ApiResponse<typeof lesson>);
    } catch (error) {
      console.error('Create lesson error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create lesson',
      } as ApiResponse<null>);
    }
  },

  // Admin: Upload video for lesson
  upload: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { lessonId } = req.params;

      // Verify lesson exists
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          module: true,
        },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
        } as ApiResponse<null>);
      }

      // Handle file upload (similar to existing video upload)
      const file = req.file || (req as any).files?.video?.[0];
      const thumbnailFile = (req as any).files?.thumbnail?.[0];

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Video file is required',
        } as ApiResponse<null>);
      }

      // Register lesson video and enqueue processing
      const result = await LessonService.registerLessonVideo({
        lessonId,
        file,
        thumbnailFile,
        userId: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: result,
      } as ApiResponse<typeof result>);
    } catch (error) {
      console.error('Upload lesson video error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload lesson video',
      } as ApiResponse<null>);
    }
  },

  // Admin: Update lesson
  update: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { lessonId } = req.params;
      const { title, description, order } = req.body;

      const lesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(order !== undefined && { order }),
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: lesson,
      } as ApiResponse<typeof lesson>);
    } catch (error) {
      console.error('Update lesson error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update lesson',
      } as ApiResponse<null>);
    }
  },

  // Admin: Delete lesson
  delete: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { lessonId } = req.params;

      await prisma.lesson.delete({
        where: { id: lessonId },
      });

      res.json({
        success: true,
        data: { id: lessonId },
      } as ApiResponse<{ id: string }>);
    } catch (error) {
      console.error('Delete lesson error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete lesson',
      } as ApiResponse<null>);
    }
  },

  // User: Get lesson by ID (with category check and lock check)
  getByIdForUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;
      const userCategory = req.user.categoryRole as CategoryRole;
      const isAdmin = req.user.role === 'ADMIN';

      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          module: true,
        },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
        } as ApiResponse<null>);
      }

      // Check category access
      if (!isAdmin && !lesson.module.allowedCategories.includes(userCategory)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: This lesson is not available for your category',
        } as ApiResponse<null>);
      }

      // Check if lesson is ready
      if (lesson.status !== 'READY') {
        return res.status(400).json({
          success: false,
          error: 'Lesson is not ready for viewing',
        } as ApiResponse<null>);
      }

      // Check video lock: user must complete previous lesson before accessing this one
      if (!isAdmin) {
        const previousLesson = await prisma.lesson.findFirst({
          where: {
            moduleId: lesson.moduleId,
            order: {
              lt: lesson.order,
            },
          },
          orderBy: {
            order: 'desc',
          },
        });

        if (previousLesson) {
          const previousProgress = await prisma.userLessonProgress.findUnique({
            where: {
              userId_lessonId: {
                userId: req.user.id,
                lessonId: previousLesson.id,
              },
            },
          });

          if (!previousProgress || !previousProgress.completed) {
            return res.status(403).json({
              success: false,
              error: 'You must complete the previous lesson before accessing this one',
              data: {
                requiredLessonId: previousLesson.id,
                requiredLessonTitle: previousLesson.title,
              },
            } as ApiResponse<{ requiredLessonId: string; requiredLessonTitle: string }>);
          }
        }
      }

      // Get user progress
      const progress = await prisma.userLessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId: req.user.id,
            lessonId: lesson.id,
          },
        },
      });

      res.json({
        success: true,
        data: {
          ...lesson,
          userProgress: progress || {
            completed: false,
            progress: 0,
            lastWatchedAt: null,
          },
        },
      } as ApiResponse<typeof lesson>);
    } catch (error) {
      console.error('Get lesson for user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lesson',
      } as ApiResponse<null>);
    }
  },

  // User: Get HLS stream URL (with category check)
  getStreamUrl: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;
      const userCategory = req.user.categoryRole as CategoryRole;
      const isAdmin = req.user.role === 'ADMIN';

      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          module: true,
        },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
        } as ApiResponse<null>);
      }

      // Check category access
      if (!isAdmin && !lesson.module.allowedCategories.includes(userCategory)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        } as ApiResponse<null>);
      }

      // Check if lesson is ready
      if (lesson.status !== 'READY' || !lesson.hlsMaster) {
        return res.status(400).json({
          success: false,
          error: 'Lesson video is not ready',
        } as ApiResponse<null>);
      }

      // Build HLS URL
      const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
      let hlsUrl: string;

      if (STORAGE_MODE === 'local') {
        // Local storage: serve from /uploads
        hlsUrl = lesson.hlsMaster.startsWith('/uploads')
          ? lesson.hlsMaster
          : `/uploads/hls/${lesson.id}/master.m3u8`;
      } else {
        // S3: return S3 URL or presigned URL
        const { getS3Url } = await import('../services/s3');
        hlsUrl = await getS3Url(lesson.hlsMaster);
      }

      res.json({
        success: true,
        data: {
          hlsUrl,
          lessonId: lesson.id,
          title: lesson.title,
        },
      } as ApiResponse<{ hlsUrl: string; lessonId: string; title: string }>);
    } catch (error) {
      console.error('Get stream URL error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stream URL',
      } as ApiResponse<null>);
    }
  },

  // User: Update lesson progress
  updateProgress: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;
      const { progress, completed } = req.body;

      // Verify lesson exists and user has access
      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          module: true,
        },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
        } as ApiResponse<null>);
      }

      const userCategory = req.user.categoryRole as CategoryRole;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isAdmin && !lesson.module.allowedCategories.includes(userCategory)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        } as ApiResponse<null>);
      }

      // Update or create progress
      const userProgress = await prisma.userLessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: req.user.id,
            lessonId: id,
          },
        },
        update: {
          progress: progress !== undefined ? Math.min(100, Math.max(0, progress)) : undefined,
          completed: completed !== undefined ? completed : undefined,
          lastWatchedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          lessonId: id,
          progress: progress !== undefined ? Math.min(100, Math.max(0, progress)) : 0,
          completed: completed || false,
          lastWatchedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: userProgress,
      } as ApiResponse<typeof userProgress>);
    } catch (error) {
      console.error('Update lesson progress error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update progress',
      } as ApiResponse<null>);
    }
  },
};

