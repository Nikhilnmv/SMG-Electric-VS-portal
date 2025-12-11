import { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { ApiResponse } from '@vs-platform/types';
import { AuthRequest } from '../middleware/auth';
import { VideoService } from '../services/videoService';

export const videoController = {
  list: async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
      const enforceCategoryAccess = process.env.ENFORCE_CATEGORY_ACCESS !== 'false';

      // Build where clause
      // Only show APPROVED videos that have HLS path (transcoding complete)
      // This ensures PROCESSING videos that were pre-approved don't show up until ready
      const where: any = {
        status: 'APPROVED',
        hlsPath: {
          not: null,
        },
      };

      // If not admin and category access is enforced, filter by categoryRole
      if (!isAdmin && enforceCategoryAccess && user?.categoryRole) {
        where.categoryRole = user.categoryRole;
      }

      const videos = await prisma.video.findMany({
        where,
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

  myVideos: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      // Get all videos for the current user, regardless of status
      const videos = await prisma.video.findMany({
        where: {
          userId: req.user.id,
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

      res.json({
        success: true,
        data: videos,
      } as ApiResponse<typeof videos>);
    } catch (error) {
      console.error('My videos error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch videos',
      } as ApiResponse<null>);
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
      const enforceCategoryAccess = process.env.ENFORCE_CATEGORY_ACCESS !== 'false';

      const video = await prisma.video.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          renditions: true,
        },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      // Enforce category-based access control
      // Allow users to view their own videos regardless of category
      // Allow users to view videos from the same category
      // Admins can view all videos
      if (!isAdmin && enforceCategoryAccess && user?.categoryRole) {
        const isOwnVideo = video.userId === user.id;
        const isSameCategory = video.categoryRole === user.categoryRole;
        
        if (!isOwnVideo && !isSameCategory) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to this video. It belongs to a different category.',
          } as ApiResponse<null>);
        }
      }

      // Check if video is ready for playback
      // Only allow playback if video has hlsPath (transcoding complete)
      if (!video.hlsPath) {
        return res.status(400).json({
          success: false,
          error: `Video is not ready for playback. Current status: ${video.status}. Please wait for processing to complete.`,
        } as ApiResponse<null>);
      }

      // Get user progress if authenticated
      let userProgress = null;
      if (req.user?.id) {
        const latestProgress = await prisma.analyticsEvent.findFirst({
          where: {
            videoId: id,
            userId: req.user.id,
            eventType: 'PROGRESS',
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        if (latestProgress && latestProgress.progress !== null) {
          userProgress = latestProgress.progress;
        }
      }

      res.json({
        success: true,
        data: {
          video,
          userProgress,
        },
      } as ApiResponse<{ video: typeof video; userProgress: number | null }>);
    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video',
      } as ApiResponse<null>);
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { title, description, fileKey, filePath, videoId, thumbnailUrl } = req.body;

      if (!title || (!fileKey && !filePath)) {
        return res.status(400).json({
          success: false,
          error: 'Title and fileKey/filePath are required',
        } as ApiResponse<null>);
      }

      console.log(`[VideoController] Registering video: title=${title}, filePath=${filePath}, fileKey=${fileKey}, videoId=${videoId}, thumbnailUrl=${thumbnailUrl}`);

      // Check if video with this ID already exists (prevent duplicates)
      if (videoId) {
        const existingVideo = await prisma.video.findUnique({
          where: { id: videoId },
        });
        if (existingVideo) {
          console.warn(`[VideoController] Video with ID ${videoId} already exists`);
          return res.status(409).json({
            success: false,
            error: 'Video with this ID already exists',
          } as ApiResponse<null>);
        }
      }

      // Use VideoService to register video and enqueue processing job
      const video = await VideoService.registerUploadedVideo({
        title,
        description: description || null,
        fileKey: fileKey || filePath || '',
        filePath: filePath || undefined,
        userId: req.user.id,
        thumbnailUrl: thumbnailUrl || null,
      }, videoId);

      console.log(`[VideoController] Video registered: id=${video.id}, status=${video.status}`);

      res.status(201).json({
        success: true,
        data: video,
      } as ApiResponse<typeof video>);
    } catch (error: any) {
      console.error('Create video error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create video';
      let statusCode = 500;
      
      if (error?.code === 'P2002') {
        // Prisma unique constraint violation
        errorMessage = 'A video with this ID already exists';
        statusCode = 409;
      } else if (error?.code === 'P2025') {
        // Prisma record not found
        errorMessage = 'Required record not found';
        statusCode = 404;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      } as ApiResponse<null>);
    }
  },

  update: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Update video - to be implemented' });
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;
      const user = req.user;
      const isAdmin = user.role?.toUpperCase() === 'ADMIN';

      // Find the video
      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      // Check ownership - only owner or admin can delete
      if (!isAdmin && video.userId !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this video',
        } as ApiResponse<null>);
      }

      console.log(`[VideoController] Deleting video ${id} by user ${user.id}`);

      // Delete files from storage
      const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
      let storageDeletionSuccess = false;
      let storageDeletionError: string | null = null;

      if (STORAGE_MODE === 'local') {
        const { deleteLocalVideo } = await import('../services/localStorage');
        try {
          await deleteLocalVideo(id);
          storageDeletionSuccess = true;
          console.log(`[VideoController] Local files deleted successfully for video ${id}`);
        } catch (error: any) {
          storageDeletionError = error.message || 'Unknown error';
          console.error(`[VideoController] Error deleting local files for video ${id}:`, error);
          // Continue with DB deletion even if file deletion fails, but log the error
        }
      } else {
        // S3 deletion
        const { deleteVideoFromS3 } = await import('../services/s3');
        try {
          await deleteVideoFromS3({
            s3Key: video.s3Key,
            hlsPath: video.hlsPath,
            thumbnailUrl: video.thumbnailUrl,
          });
          storageDeletionSuccess = true;
          console.log(`[VideoController] S3 files deleted successfully for video ${id}`);
        } catch (error: any) {
          storageDeletionError = error.message || 'Unknown error';
          console.error(`[VideoController] Error deleting S3 files for video ${id}:`, error);
          // Continue with DB deletion even if file deletion fails, but log the error
        }
      }

      // Delete from database (cascading deletes will handle renditions and analytics events)
      await prisma.video.delete({
        where: { id },
      });

      console.log(`[VideoController] Video ${id} deleted successfully from database`);

      // Return response with information about storage deletion
      const message = storageDeletionSuccess
        ? 'Video deleted successfully'
        : `Video deleted from database${storageDeletionError ? `, but some files may not have been removed from storage: ${storageDeletionError}` : ''}`;

      res.json({
        success: true,
        message,
        ...(storageDeletionError && {
          warning: 'Some files may not have been removed from storage. Please check the server logs.',
        }),
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete video',
      } as ApiResponse<null>);
    }
  },

  updateProgress: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const { id } = req.params;
      const { progressSeconds } = req.body;

      if (typeof progressSeconds !== 'number' || progressSeconds < 0) {
        return res.status(400).json({
          success: false,
          error: 'progressSeconds must be a non-negative number',
        } as ApiResponse<null>);
      }

      // Verify video exists
      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      const progressValue = Math.floor(progressSeconds);
      
      console.log(`[UpdateProgress] Creating PROGRESS event for video ${id}, user ${req.user.id}, progress: ${progressValue}`);
      
      // Create or update progress via AnalyticsEvent
      const progressEvent = await prisma.analyticsEvent.create({
        data: {
          videoId: id,
          userId: req.user.id,
          eventType: 'PROGRESS',
          progress: progressValue,
        },
      });
      
      console.log(`[UpdateProgress] Created event ${progressEvent.id}`);

      // If video is completed (progress >= 95% of duration), also create a COMPLETE event
      if (video.duration && progressValue >= Math.floor(video.duration * 0.95)) {
        try {
          await prisma.analyticsEvent.create({
            data: {
              videoId: id,
              userId: req.user.id,
              eventType: 'COMPLETE',
              progress: video.duration,
            },
          });
        } catch (err) {
          // Don't fail if COMPLETE event creation fails, just log it
          console.error('Error creating COMPLETE event:', err);
        }
      }

      res.json({
        success: true,
        data: {
          progressSeconds: progressEvent.progress || 0,
        },
      } as ApiResponse<{ progressSeconds: number }>);
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update progress',
      } as ApiResponse<null>);
    }
  },

  getWatchHistory: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      // Get all unique videos the user has watched (has PROGRESS or COMPLETE events for)
      // Get the latest progress/complete event for each video
      const allEvents = await prisma.analyticsEvent.findMany({
        where: {
          userId: req.user.id,
          eventType: {
            in: ['PROGRESS', 'COMPLETE'],
          },
          // Only get events that have either a videoId or lessonId (not both null)
          OR: [
            { videoId: { not: null } },
            { lessonId: { not: null } },
          ],
        },
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          video: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          lesson: {
            include: {
              module: true,
            },
          },
        },
      });

      console.log(`[WatchHistory] Found ${allEvents.length} events for user ${req.user.id}`);
      
      // Log event details for debugging
      if (allEvents.length > 0) {
        console.log(`[WatchHistory] Sample events:`, allEvents.slice(0, 3).map(e => ({
          id: e.id,
          eventType: e.eventType,
          videoId: e.videoId,
          lessonId: e.lessonId,
          progress: e.progress,
          hasVideo: !!e.video,
          hasLesson: !!e.lesson,
          videoStatus: e.video?.status,
          lessonStatus: e.lesson?.status,
        })));
      }

      // Group by videoId and get the latest progress for each video
      const videoMap = new Map<string, {
        video: typeof allEvents[0]['video'];
        progress: number;
        lastWatched: Date;
      }>();

      // Group by lessonId and get the latest progress for each lesson
      const lessonMap = new Map<string, {
        lesson: typeof allEvents[0]['lesson'];
        progress: number;
        lastWatched: Date;
      }>();

      for (const event of allEvents) {
        // Handle video events
        // If video relation is null but videoId exists, try to fetch the video
        if (event.videoId && !event.video) {
          console.log(`[WatchHistory] Event ${event.id} has videoId ${event.videoId} but no video relation, fetching...`);
          try {
            const video = await prisma.video.findUnique({
              where: { id: event.videoId },
            });
            if (video) {
              (event as any).video = video;
            }
          } catch (err) {
            console.error(`[WatchHistory] Failed to fetch video ${event.videoId}:`, err);
          }
        }
        
        if (event.video) {
          const videoId = event.video.id;
          
          // Include videos that are ready for playback
          // Check status - allow APPROVED, READY, and PROCESSING (in case they're ready but not approved yet)
          const validStatuses = ['APPROVED', 'READY', 'PROCESSING'];
          if (!validStatuses.includes(event.video.status)) {
            console.log(`[WatchHistory] Skipping video ${videoId} - status: ${event.video.status}`);
            continue;
          }
          
          // Only require hlsPath for APPROVED and READY videos
          // PROCESSING videos might not have hlsPath yet, but we can still show them
          if ((event.video.status === 'APPROVED' || event.video.status === 'READY') && !event.video.hlsPath) {
            console.log(`[WatchHistory] Skipping video ${videoId} - no hlsPath for ${event.video.status} video`);
            continue;
          }

          if (!videoMap.has(videoId)) {
            // For COMPLETE events, use video duration as progress
            // For PROGRESS events, use the progress value (default to 0 if null)
            let progress = 0;
            if (event.eventType === 'COMPLETE') {
              progress = event.video.duration || 0;
            } else {
              progress = event.progress ?? 0;
            }

            videoMap.set(videoId, {
              video: event.video,
              progress,
              lastWatched: event.timestamp,
            });
          } else {
            // If we already have this video, check if this event is more recent
            const existing = videoMap.get(videoId)!;
            if (event.timestamp > existing.lastWatched) {
              // Update with more recent event
              let progress = 0;
              if (event.eventType === 'COMPLETE') {
                progress = event.video.duration || 0;
              } else {
                progress = event.progress ?? 0;
              }
              
              videoMap.set(videoId, {
                video: event.video,
                progress,
                lastWatched: event.timestamp,
              });
            } else if (event.eventType === 'COMPLETE' && existing.progress < (event.video.duration || 0)) {
              // If this is a COMPLETE event and we have a less complete progress, update it
              videoMap.set(videoId, {
                video: event.video,
                progress: event.video.duration || 0,
                lastWatched: event.timestamp > existing.lastWatched ? event.timestamp : existing.lastWatched,
              });
            }
          }
        }

        // Handle lesson events
        // If lesson relation is null but lessonId exists, try to fetch the lesson
        if (event.lessonId && !event.lesson) {
          console.log(`[WatchHistory] Event ${event.id} has lessonId ${event.lessonId} but no lesson relation, fetching...`);
          try {
            const lesson = await prisma.lesson.findUnique({
              where: { id: event.lessonId },
              include: { module: true },
            });
            if (lesson) {
              (event as any).lesson = lesson;
            }
          } catch (err) {
            console.error(`[WatchHistory] Failed to fetch lesson ${event.lessonId}:`, err);
          }
        }
        
        if (event.lesson) {
          const lessonId = event.lesson.id;
          
          // Only include lessons that are ready for playback
          if (event.lesson.status !== 'READY' || !event.lesson.hlsMaster) {
            continue;
          }

          if (!lessonMap.has(lessonId)) {
            // For COMPLETE events, use lesson duration as progress
            // For PROGRESS events, use the progress value
            let progress = 0;
            if (event.eventType === 'COMPLETE') {
              progress = event.lesson.duration || 0;
            } else {
              progress = event.progress || 0;
            }

            lessonMap.set(lessonId, {
              lesson: event.lesson,
              progress,
              lastWatched: event.timestamp,
            });
          } else {
            // If we already have this lesson, check if this event is more recent
            const existing = lessonMap.get(lessonId)!;
            if (event.timestamp > existing.lastWatched) {
              // Update with more recent event
              let progress = 0;
              if (event.eventType === 'COMPLETE') {
                progress = event.lesson.duration || 0;
              } else {
                progress = event.progress || 0;
              }
              
              lessonMap.set(lessonId, {
                lesson: event.lesson,
                progress,
                lastWatched: event.timestamp,
              });
            } else if (event.eventType === 'COMPLETE' && existing.progress < (event.lesson.duration || 0)) {
              // If this is a COMPLETE event and we have a less complete progress, update it
              lessonMap.set(lessonId, {
                lesson: event.lesson,
                progress: event.lesson.duration || 0,
                lastWatched: event.timestamp > existing.lastWatched ? event.timestamp : existing.lastWatched,
              });
            }
          }
        }
      }

      // Convert video map to array
      const videoHistory = Array.from(videoMap.values())
        .filter(item => item.video !== null)
        .map(item => ({
          videoId: item.video!.id,
          videoTitle: item.video!.title,
          thumbnailUrl: item.video!.thumbnailUrl,
          progress: item.progress,
          duration: item.video!.duration || 0,
          lastWatched: item.lastWatched,
        }));

      // Convert lesson map to array
      const lessonHistory = Array.from(lessonMap.values())
        .filter(item => item.lesson !== null)
        .map(item => ({
          videoId: item.lesson!.id, // Using videoId field for compatibility with frontend
          videoTitle: item.lesson!.title,
          thumbnailUrl: item.lesson!.thumbnailUrl,
          progress: item.progress,
          duration: item.lesson!.duration || 0,
          lastWatched: item.lastWatched,
          isLesson: true, // Flag to indicate this is a lesson
          lessonId: item.lesson!.id,
        }));

      // Combine and sort by lastWatched (most recent first)
      const watchHistory = [...videoHistory, ...lessonHistory]
        .sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime());

      console.log(`[WatchHistory] Returning ${watchHistory.length} items (${videoHistory.length} videos, ${lessonHistory.length} lessons)`);

      res.json({
        success: true,
        data: watchHistory,
      } as ApiResponse<typeof watchHistory>);
    } catch (error) {
      console.error('Get watch history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch watch history',
      } as ApiResponse<null>);
    }
  },
};
