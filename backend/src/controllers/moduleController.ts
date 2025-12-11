import { Response } from 'express';
import { prisma } from '../lib/db';
import { ApiResponse } from '@vs-platform/types';
import { AuthRequest } from '../middleware/auth';
import { CategoryRole } from '@vs-platform/types';

export const moduleController = {
  // Admin: Create module
  create: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { title, description, allowedCategories } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required',
        } as ApiResponse<null>);
      }

      const module = await prisma.module.create({
        data: {
          title,
          description: description || null,
          allowedCategories: allowedCategories || [],
          createdById: req.user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          lessons: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: module,
      } as ApiResponse<typeof module>);
    } catch (error) {
      console.error('Create module error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create module',
      } as ApiResponse<null>);
    }
  },

  // Admin: List all modules
  list: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const modules = await prisma.module.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          lessons: {
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              title: true,
              order: true,
              status: true,
            },
          },
          _count: {
            select: {
              lessons: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: modules,
      } as ApiResponse<typeof modules>);
    } catch (error) {
      console.error('List modules error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch modules',
      } as ApiResponse<null>);
    }
  },

  // Admin: Get module by ID
  getById: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;

      const module = await prisma.module.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          lessons: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found',
        } as ApiResponse<null>);
      }

      res.json({
        success: true,
        data: module,
      } as ApiResponse<typeof module>);
    } catch (error) {
      console.error('Get module error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch module',
      } as ApiResponse<null>);
    }
  },

  // Admin: Update module
  update: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;
      const { title, description, allowedCategories } = req.body;

      const module = await prisma.module.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(allowedCategories !== undefined && { allowedCategories }),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          lessons: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      res.json({
        success: true,
        data: module,
      } as ApiResponse<typeof module>);
    } catch (error) {
      console.error('Update module error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update module',
      } as ApiResponse<null>);
    }
  },

  // Admin: Delete module
  delete: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;

      await prisma.module.delete({
        where: { id },
      });

      res.json({
        success: true,
        data: { id },
      } as ApiResponse<{ id: string }>);
    } catch (error) {
      console.error('Delete module error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete module',
      } as ApiResponse<null>);
    }
  },

  // User: List modules accessible to user's category
  listForUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const userCategory = req.user.categoryRole as CategoryRole;
      const isAdmin = req.user.role === 'ADMIN';

      // Admins can see all modules, users see only modules where their category is in allowedCategories
      const where: any = {};
      if (!isAdmin) {
        where.allowedCategories = {
          has: userCategory,
        };
      }

      const modules = await prisma.module.findMany({
        where,
        include: {
          lessons: {
            where: {
              status: 'READY', // Only show ready lessons
            },
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              thumbnailUrl: true,
              duration: true,
            },
          },
          _count: {
            select: {
              lessons: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // For each module, get user's progress
      const modulesWithProgress = await Promise.all(
        modules.map(async (module) => {
          const userProgress = await prisma.userLessonProgress.findMany({
            where: {
              userId: req.user!.id,
              lesson: {
                moduleId: module.id,
              },
            },
            select: {
              lessonId: true,
              completed: true,
              progress: true,
            },
          });

          const completedLessons = userProgress.filter((p) => p.completed).length;
          const totalLessons = module.lessons.length;
          const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

          return {
            ...module,
            userProgress: {
              completedLessons,
              totalLessons,
              progressPercentage: Math.round(progressPercentage),
            },
          };
        })
      );

      res.json({
        success: true,
        data: modulesWithProgress,
      } as ApiResponse<typeof modulesWithProgress>);
    } catch (error) {
      console.error('List modules for user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch modules',
      } as ApiResponse<null>);
    }
  },

  // User: Get module by ID (with category check)
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

      const module = await prisma.module.findUnique({
        where: { id },
        include: {
          lessons: {
            where: {
              status: 'READY',
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found',
        } as ApiResponse<null>);
      }

      // Check category access
      if (!isAdmin && !module.allowedCategories.includes(userCategory)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: This module is not available for your category',
        } as ApiResponse<null>);
      }

      // Get user progress for each lesson
      const lessonsWithProgress = await Promise.all(
        module.lessons.map(async (lesson) => {
          const progress = await prisma.userLessonProgress.findUnique({
            where: {
              userId_lessonId: {
                userId: req.user!.id,
                lessonId: lesson.id,
              },
            },
          });

          return {
            ...lesson,
            userProgress: progress || {
              completed: false,
              progress: 0,
              lastWatchedAt: null,
            },
          };
        })
      );

      res.json({
        success: true,
        data: {
          ...module,
          lessons: lessonsWithProgress,
        },
      } as ApiResponse<typeof module>);
    } catch (error) {
      console.error('Get module for user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch module',
      } as ApiResponse<null>);
    }
  },
};

