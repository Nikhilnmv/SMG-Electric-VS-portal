import { Request, Response } from 'express';
import { ApiResponse } from '@vs-platform/types';
import { AuthRequest } from '../middleware/auth';
import { getClickHouseClient } from '../services/clickhouse';
import { prisma } from '../lib/db';
import { AnalyticsEventSchema } from '../schemas/analytics';
import { v4 as uuidv4 } from 'uuid';

export const analyticsController = {
  // New event collector endpoint with Zod validation
  trackEvent: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      // Get device info from request
      const device = req.headers['user-agent'] || 'unknown';
      
      // Get user's categoryRole from database
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { categoryRole: true },
      });

      // Validate required fields early
      if (!req.body.videoId) {
        return res.status(400).json({
          success: false,
          error: 'videoId is required',
        } as ApiResponse<null>);
      }

      if (!req.body.eventType) {
        return res.status(400).json({
          success: false,
          error: 'eventType is required',
        } as ApiResponse<null>);
      }

      // Validate videoId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(req.body.videoId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid videoId format (must be a valid UUID)',
        } as ApiResponse<null>);
      }

      // Note: sessionId from frontend might not be a valid UUID, so we generate one if needed
      let sessionId = req.body.sessionId;
      if (sessionId && !uuidRegex.test(sessionId)) {
        // If sessionId is not a valid UUID, generate a new one
        sessionId = uuidv4();
      } else if (!sessionId) {
        sessionId = uuidv4();
      }

      const eventData = {
        userId: req.user.id,
        videoId: req.body.videoId,
        timestamp: req.body.timestamp || new Date().toISOString(),
        eventType: req.body.eventType,
        currentTime: req.body.currentTime,
        duration: req.body.duration,
        playbackQuality: req.body.playbackQuality,
        device: device,
        categoryRole: user?.categoryRole || 'INTERN',
        sessionId: sessionId,
      };

      // Validate with Zod
      const validationResult = AnalyticsEventSchema.safeParse(eventData);
      if (!validationResult.success) {
        console.error('Analytics event validation failed:', validationResult.error.errors);
        console.error('Event data:', JSON.stringify(eventData, null, 2));
        return res.status(400).json({
          success: false,
          error: 'Invalid event data',
          details: validationResult.error.errors,
        } as ApiResponse<null>);
      }

      const validatedEvent = validationResult.data;

      // Verify video exists
      const video = await prisma.video.findUnique({
        where: { id: validatedEvent.videoId },
        select: { id: true, duration: true },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      // Write event to ClickHouse events_raw table
      const clickhouse = getClickHouseClient();
      await clickhouse.insert({
        table: 'events_raw',
        values: [{
          userId: validatedEvent.userId,
          videoId: validatedEvent.videoId,
          eventType: validatedEvent.eventType,
          timestamp: validatedEvent.timestamp || new Date().toISOString(),
          currentTime: validatedEvent.currentTime || 0,
          fullDuration: validatedEvent.duration || video.duration || 0,
          device: validatedEvent.device || device,
          categoryRole: validatedEvent.categoryRole || user?.categoryRole || 'INTERN',
          sessionId: validatedEvent.sessionId || uuidv4(),
          playbackQuality: validatedEvent.playbackQuality || '',
        }],
        format: 'JSONEachRow',
      });

      res.json({
        success: true,
        data: { message: 'Event tracked successfully' },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      console.error('Track event error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track event',
      } as ApiResponse<null>);
    }
  },

  // GET /api/analytics/video/:videoId
  getVideoAnalytics: async (req: Request, res: Response) => {
    try {
      const { videoId } = req.params;
      const clickhouse = getClickHouseClient();

      // Verify video exists
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true, title: true, duration: true },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        } as ApiResponse<null>);
      }

      // Total views (VIDEO_OPENED events)
      const viewsResult = await clickhouse.query({
        query: `
          SELECT count() as totalViews
          FROM events_raw
          WHERE videoId = {videoId:String} AND eventType = 'VIDEO_OPENED'
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const totalViews = Number((await viewsResult.json() as any[])[0]?.totalViews || 0);

      // Unique viewers
      const uniqueViewersResult = await clickhouse.query({
        query: `
          SELECT uniqExact(userId) as uniqueViewers
          FROM events_raw
          WHERE videoId = {videoId:String} AND eventType = 'VIDEO_OPENED'
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const uniqueViewers = Number((await uniqueViewersResult.json() as any[])[0]?.uniqueViewers || 0);

      // Average watch time
      const avgWatchTimeResult = await clickhouse.query({
        query: `
          SELECT avg(currentTime) as avgWatchTime
          FROM events_raw
          WHERE videoId = {videoId:String} AND eventType = 'VIDEO_PROGRESS' AND currentTime > 0
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const avgWatchTime = Number((await avgWatchTimeResult.json() as any[])[0]?.avgWatchTime || 0);

      // Completion rate
      const completionResult = await clickhouse.query({
        query: `
          SELECT 
            countIf(eventType = 'VIDEO_COMPLETE') as completes,
            countIf(eventType = 'VIDEO_OPENED') as opens
          FROM events_raw
          WHERE videoId = {videoId:String}
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const completionData = (await completionResult.json() as any[])[0] || { completes: 0, opens: 0 };
      const completionRate = completionData.opens > 0 
        ? (completionData.completes / completionData.opens) * 100 
        : 0;

      // Drop-off points (histogram of where users stop watching)
      const dropOffResult = await clickhouse.query({
        query: `
          SELECT 
            toInt32(currentTime / 10) * 10 as timeBucket,
            count() as count
          FROM events_raw
          WHERE videoId = {videoId:String} 
            AND eventType = 'VIDEO_PROGRESS' 
            AND currentTime > 0
          GROUP BY timeBucket
          ORDER BY timeBucket
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const dropOffPoints = (await dropOffResult.json() as Array<{ timeBucket: number; count: number }>)
        .map(d => ({ timestamp: Number(d.timeBucket), viewers: Number(d.count) }));

      // Buffering stats
      const bufferingResult = await clickhouse.query({
        query: `
          SELECT count() as bufferingEvents
          FROM events_raw
          WHERE videoId = {videoId:String} AND eventType = 'VIDEO_BUFFER'
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const bufferingEvents = Number((await bufferingResult.json() as any[])[0]?.bufferingEvents || 0);

      // Device distribution
      const deviceResult = await clickhouse.query({
        query: `
          SELECT device, count() as count
          FROM events_raw
          WHERE videoId = {videoId:String} AND eventType = 'VIDEO_OPENED'
          GROUP BY device
          ORDER BY count DESC
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const devices = (await deviceResult.json() as Array<{ device: string; count: number }>)
        .map(d => ({ device: d.device, count: Number(d.count) }));

      // Category distribution
      const categoryResult = await clickhouse.query({
        query: `
          SELECT categoryRole, count() as count
          FROM events_raw
          WHERE videoId = {videoId:String} AND eventType = 'VIDEO_OPENED'
          GROUP BY categoryRole
          ORDER BY count DESC
        `,
        query_params: { videoId },
        format: 'JSONEachRow',
      });
      const categories = (await categoryResult.json() as Array<{ categoryRole: string; count: number }>)
        .map(d => ({ category: d.categoryRole, count: Number(d.count) }));

      res.json({
        success: true,
        data: {
          videoId,
          totalViews,
          uniqueViewers,
          avgWatchTime: Number(avgWatchTime.toFixed(2)),
          completionRate: Number(completionRate.toFixed(2)),
          dropOffPoints,
          bufferingStats: {
            totalEvents: bufferingEvents,
            rate: totalViews > 0 ? Number((bufferingEvents / totalViews).toFixed(2)) : 0,
          },
          devices,
          categories,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Get video analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video analytics',
      } as ApiResponse<null>);
    }
  },

  // GET /api/analytics/user/:userId
  getUserAnalytics: async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Users can only view their own analytics unless admin
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        } as ApiResponse<null>);
      }

      const clickhouse = getClickHouseClient();

      // Total watch time
      const watchTimeResult = await clickhouse.query({
        query: `
          SELECT sum(currentTime) as totalWatchTime
          FROM events_raw
          WHERE userId = {userId:String} AND eventType = 'VIDEO_PROGRESS'
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const totalWatchTime = Number((await watchTimeResult.json() as any[])[0]?.totalWatchTime || 0);

      // Videos completed
      const completedResult = await clickhouse.query({
        query: `
          SELECT count() as videosCompleted
          FROM events_raw
          WHERE userId = {userId:String} AND eventType = 'VIDEO_COMPLETE'
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const videosCompleted = Number((await completedResult.json() as any[])[0]?.videosCompleted || 0);

      // Focus mode time
      const focusTimeResult = await clickhouse.query({
        query: `
          SELECT sum(currentTime) as focusModeTime
          FROM events_raw
          WHERE userId = {userId:String} AND eventType = 'FOCUS_MODE_START'
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const focusModeTime = Number((await focusTimeResult.json() as any[])[0]?.focusModeTime || 0);

      // Recently watched videos (last 10)
      const recentVideosResult = await clickhouse.query({
        query: `
          SELECT 
            videoId,
            max(timestamp) as lastWatched
          FROM events_raw
          WHERE userId = {userId:String} AND eventType = 'VIDEO_OPENED'
          GROUP BY videoId
          ORDER BY lastWatched DESC
          LIMIT 10
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const recentVideoIds = (await recentVideosResult.json() as Array<{ videoId: string; lastWatched: string }>)
        .map(r => r.videoId);

      // Get video details
      const recentVideos = await Promise.all(
        recentVideoIds.map(async (videoId) => {
          const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: { id: true, title: true, duration: true },
          });
          if (!video) return null;
          
          const watchResult = await clickhouse.query({
            query: `
              SELECT max(timestamp) as lastWatched
              FROM events_raw
              WHERE userId = {userId:String} AND videoId = {videoId:String} AND eventType = 'VIDEO_OPENED'
            `,
            query_params: { userId, videoId },
            format: 'JSONEachRow',
          });
          const lastWatched = (await watchResult.json() as any[])[0]?.lastWatched;
          
          return {
            videoId: video.id,
            title: video.title,
            duration: video.duration,
            lastWatched: lastWatched || null,
          };
        })
      );

      // Watch history with timestamps
      const historyResult = await clickhouse.query({
        query: `
          SELECT 
            videoId,
            eventType,
            timestamp,
            currentTime
          FROM events_raw
          WHERE userId = {userId:String}
          ORDER BY timestamp DESC
          LIMIT 100
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const watchHistory = (await historyResult.json() as Array<{
        videoId: string;
        eventType: string;
        timestamp: string;
        currentTime: number;
      }>).map(h => ({
        videoId: h.videoId,
        eventType: h.eventType,
        timestamp: h.timestamp,
        currentTime: Number(h.currentTime || 0),
      }));

      res.json({
        success: true,
        data: {
          userId,
          totalWatchTime: Number(totalWatchTime.toFixed(2)),
          videosCompleted,
          focusModeTime: Number(focusModeTime.toFixed(2)),
          recentlyWatched: recentVideos.filter(v => v !== null),
          watchHistory,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user analytics',
      } as ApiResponse<null>);
    }
  },

  // GET /api/analytics/dashboard/admin
  getAdminDashboard: async (req: AuthRequest, res: Response) => {
    try {
      const clickhouse = getClickHouseClient();

      // Total videos
      const totalVideos = await prisma.video.count({
        where: { status: 'APPROVED' },
      });

      // Total views
      const totalViewsResult = await clickhouse.query({
        query: `
          SELECT count() as totalViews
          FROM events_raw
          WHERE eventType = 'VIDEO_OPENED'
        `,
        format: 'JSONEachRow',
      });
      const totalViews = Number((await totalViewsResult.json() as any[])[0]?.totalViews || 0);

      // Total watch time
      const totalWatchTimeResult = await clickhouse.query({
        query: `
          SELECT sum(currentTime) as totalWatchTime
          FROM events_raw
          WHERE eventType = 'VIDEO_PROGRESS'
        `,
        format: 'JSONEachRow',
      });
      const totalWatchTime = Number((await totalWatchTimeResult.json() as any[])[0]?.totalWatchTime || 0);

      // Average completion rate
      const completionResult = await clickhouse.query({
        query: `
          SELECT 
            countIf(eventType = 'VIDEO_COMPLETE') as completes,
            countIf(eventType = 'VIDEO_OPENED') as opens
          FROM events_raw
        `,
        format: 'JSONEachRow',
      });
      const completionData = (await completionResult.json() as any[])[0] || { completes: 0, opens: 0 };
      const avgCompletionRate = completionData.opens > 0 
        ? (completionData.completes / completionData.opens) * 100 
        : 0;

      // Category-wise engagement
      const categoryEngagementResult = await clickhouse.query({
        query: `
          SELECT 
            categoryRole,
            count() as views,
            sum(currentTime) as watchTime
          FROM events_raw
          WHERE eventType = 'VIDEO_OPENED'
          GROUP BY categoryRole
          ORDER BY views DESC
        `,
        format: 'JSONEachRow',
      });
      const categoryWiseEngagement = (await categoryEngagementResult.json() as Array<{
        categoryRole: string;
        views: number;
        watchTime: number;
      }>).map(c => ({
        category: c.categoryRole,
        views: Number(c.views),
        watchTime: Number(c.watchTime || 0),
      }));

      // Top performing videos
      const topVideosResult = await clickhouse.query({
        query: `
            SELECT 
              videoId,
            count() as views,
            sum(currentTime) as watchTime,
            countIf(eventType = 'VIDEO_COMPLETE') * 100.0 / countIf(eventType = 'VIDEO_OPENED') as completionRate
          FROM events_raw
          WHERE eventType IN ('VIDEO_OPENED', 'VIDEO_PROGRESS', 'VIDEO_COMPLETE')
          GROUP BY videoId
          ORDER BY views DESC
          LIMIT 10
        `,
        format: 'JSONEachRow',
      });
      const topVideoIds = (await topVideosResult.json() as Array<{
        videoId: string;
        views: number;
        watchTime: number;
        completionRate: number;
      }>);

      const topPerformingVideos = await Promise.all(
        topVideoIds.map(async (v) => {
          const video = await prisma.video.findUnique({
            where: { id: v.videoId },
            select: { id: true, title: true },
          });
          return {
            videoId: v.videoId,
            title: video?.title || 'Unknown',
            views: Number(v.views),
            watchTime: Number(v.watchTime || 0),
            completionRate: Number(v.completionRate || 0),
          };
        })
      );

      // Least performing videos
      const leastVideosResult = await clickhouse.query({
        query: `
          SELECT 
            videoId,
            count() as views,
            sum(currentTime) as watchTime,
            countIf(eventType = 'VIDEO_COMPLETE') * 100.0 / countIf(eventType = 'VIDEO_OPENED') as completionRate
          FROM events_raw
          WHERE eventType IN ('VIDEO_OPENED', 'VIDEO_PROGRESS', 'VIDEO_COMPLETE')
          GROUP BY videoId
          HAVING views > 0
          ORDER BY views ASC, completionRate ASC
          LIMIT 10
        `,
        format: 'JSONEachRow',
      });
      const leastVideoIds = (await leastVideosResult.json() as Array<{
        videoId: string;
        views: number;
        watchTime: number;
        completionRate: number;
      }>);

      const leastPerformingVideos = await Promise.all(
        leastVideoIds.map(async (v) => {
        const video = await prisma.video.findUnique({
            where: { id: v.videoId },
          select: { id: true, title: true },
        });
          return {
            videoId: v.videoId,
            title: video?.title || 'Unknown',
            views: Number(v.views),
            watchTime: Number(v.watchTime || 0),
            completionRate: Number(v.completionRate || 0),
          };
        })
      );

      // Video upload trends (last 30 days)
      const uploadTrends = await prisma.video.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          id: true,
        },
      });

      // Daily active users (last 30 days)
      const dailyActiveUsersResult = await clickhouse.query({
        query: `
          SELECT 
            toDate(timestamp) as date,
            uniqExact(userId) as activeUsers
          FROM events_raw
          WHERE timestamp >= now() - INTERVAL 30 DAY
          GROUP BY date
          ORDER BY date DESC
        `,
        format: 'JSONEachRow',
      });
      const dailyActiveUsers = (await dailyActiveUsersResult.json() as Array<{
        date: string;
        activeUsers: number;
      }>).map(d => ({
        date: d.date,
        activeUsers: Number(d.activeUsers),
      }));

      // Watch time per day (last 30 days)
      const watchTimePerDayResult = await clickhouse.query({
        query: `
          SELECT 
            toDate(timestamp) as date,
            sum(currentTime) as watchTime
          FROM events_raw
          WHERE eventType = 'VIDEO_PROGRESS' AND timestamp >= now() - INTERVAL 30 DAY
          GROUP BY date
          ORDER BY date DESC
        `,
        format: 'JSONEachRow',
      });
      const watchTimePerDay = (await watchTimePerDayResult.json() as Array<{
        date: string;
        watchTime: number;
      }>).map(d => ({
        date: d.date,
        watchTime: Number(d.watchTime || 0),
      }));

      res.json({
        success: true,
        data: {
          totalVideos,
          totalViews,
          totalWatchTime: Number(totalWatchTime.toFixed(2)),
          avgCompletionRate: Number(avgCompletionRate.toFixed(2)),
          categoryWiseEngagement,
          topPerformingVideos,
          leastPerformingVideos,
          videoUploadTrends: uploadTrends.map(t => ({
            date: t.createdAt.toISOString().split('T')[0],
            count: t._count.id,
          })),
          dailyActiveUsers,
          watchTimePerDay,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Get admin dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin dashboard analytics',
      } as ApiResponse<null>);
    }
  },

  // GET /api/analytics/dashboard/user
  getUserDashboard: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const userId = req.user.id;
      console.log(`[Analytics] Fetching user dashboard for userId: ${userId}`);

      let clickhouse;
      try {
        clickhouse = getClickHouseClient();
      } catch (error: any) {
        console.error('[Analytics] ClickHouse connection error:', error);
        return res.status(500).json({
          success: false,
          error: 'ClickHouse connection failed. Please check ClickHouse is running.',
        } as ApiResponse<null>);
      }

      // Videos watched
      let videosWatched = 0;
      try {
        const videosWatchedResult = await clickhouse.query({
          query: `
            SELECT uniqExact(videoId) as videosWatched
            FROM events_raw
            WHERE userId = {userId:String} AND eventType = 'VIDEO_OPENED'
          `,
          query_params: { userId },
          format: 'JSONEachRow',
        });
        videosWatched = Number((await videosWatchedResult.json() as any[])[0]?.videosWatched || 0);
      } catch (error: any) {
        console.error('[Analytics] Error fetching videos watched:', error);
        // Continue with default value
      }

      // Total watch time
      let totalWatchTime = 0;
      try {
        const totalWatchTimeResult = await clickhouse.query({
          query: `
            SELECT sum(currentTime) as totalWatchTime
            FROM events_raw
            WHERE userId = {userId:String} AND eventType = 'VIDEO_PROGRESS'
          `,
          query_params: { userId },
          format: 'JSONEachRow',
        });
        totalWatchTime = Number((await totalWatchTimeResult.json() as any[])[0]?.totalWatchTime || 0);
      } catch (error: any) {
        console.error('[Analytics] Error fetching total watch time:', error);
        // Continue with default value
      }

      // Completion rate
      let completionRate = 0;
      try {
        const completionResult = await clickhouse.query({
          query: `
            SELECT 
              countIf(eventType = 'VIDEO_COMPLETE') as completes,
              countIf(eventType = 'VIDEO_OPENED') as opens
            FROM events_raw
            WHERE userId = {userId:String}
          `,
          query_params: { userId },
          format: 'JSONEachRow',
        });
        const completionData = (await completionResult.json() as any[])[0] || { completes: 0, opens: 0 };
        completionRate = completionData.opens > 0 
          ? (completionData.completes / completionData.opens) * 100 
          : 0;
      } catch (error: any) {
        console.error('[Analytics] Error fetching completion rate:', error);
        // Continue with default value
      }

      // Streak insights (consecutive days with activity)
      const streakResult = await clickhouse.query({
        query: `
          SELECT 
            toDate(timestamp) as date
          FROM events_raw
          WHERE userId = {userId:String} AND eventType = 'VIDEO_OPENED'
          GROUP BY date
          ORDER BY date DESC
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const activityDates = (await streakResult.json() as Array<{ date: string }>)
        .map(d => new Date(d.date).toISOString().split('T')[0])
        .sort()
        .reverse();

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (activityDates.includes(today) || activityDates.includes(yesterday)) {
        currentStreak = 1;
        for (let i = 1; i < activityDates.length; i++) {
          const currentDate = new Date(activityDates[i - 1]);
          const prevDate = new Date(activityDates[i]);
          const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Recently watched videos (last 10)
      const recentVideosResult = await clickhouse.query({
        query: `
          SELECT 
            videoId,
            max(timestamp) as lastWatched
          FROM events_raw
          WHERE userId = {userId:String} AND eventType = 'VIDEO_OPENED'
          GROUP BY videoId
          ORDER BY lastWatched DESC
          LIMIT 10
        `,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const recentVideoIds = (await recentVideosResult.json() as Array<{ videoId: string; lastWatched: string }>);

      // Get video details for recently watched
      const recentlyWatched = await Promise.all(
        recentVideoIds.map(async (r) => {
          const video = await prisma.video.findUnique({
            where: { id: r.videoId },
            select: { id: true, title: true, duration: true },
          });
          if (!video) return null;
          return {
            videoId: video.id,
            title: video.title,
            duration: video.duration,
            lastWatched: r.lastWatched || null,
          };
        })
      );

      // Recommended videos (based on user's category)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { categoryRole: true },
      });

      const recommendedVideos = await prisma.video.findMany({
        where: {
          status: 'APPROVED',
          categoryRole: user?.categoryRole || 'INTERN',
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
        },
      });

      res.json({
        success: true,
        data: {
          videosWatched,
          totalWatchTime: Number(totalWatchTime.toFixed(2)),
          completionRate: Number(completionRate.toFixed(2)),
          streak: {
            current: currentStreak,
            longest: activityDates.length > 0 ? 1 : 0, // Simplified
            lastActivity: activityDates[0] || null,
          },
          recentlyWatched: recentlyWatched.filter(v => v !== null),
          recommendedVideos,
        },
      } as ApiResponse<any>);
    } catch (error: any) {
      console.error('[Analytics] Get user dashboard error:', error);
      console.error('[Analytics] Error stack:', error?.stack);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch user dashboard analytics',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      } as ApiResponse<null>);
    }
  },

  // Legacy endpoints for backward compatibility
  getOverview: async (req: AuthRequest, res: Response) => {
    try {
      const clickhouse = getClickHouseClient();

      const totalEventsResult = await clickhouse.query({
        query: 'SELECT count() as total FROM events_raw',
        format: 'JSONEachRow',
      });
      const totalEvents = Number((await totalEventsResult.json() as any[])[0]?.total || 0);

      const watchTimeResult = await clickhouse.query({
        query: `
          SELECT sum(currentTime) as totalWatchTime 
          FROM events_raw 
          WHERE eventType = 'VIDEO_PROGRESS'
        `,
        format: 'JSONEachRow',
      });
      const totalWatchTime = Number((await watchTimeResult.json() as any[])[0]?.totalWatchTime || 0);

      const completionResult = await clickhouse.query({
        query: `
          SELECT 
            countIf(eventType = 'VIDEO_COMPLETE') as completes,
            countIf(eventType = 'VIDEO_OPENED') as opens
          FROM events_raw
        `,
        format: 'JSONEachRow',
      });
      const completionData = (await completionResult.json() as any[])[0] || { completes: 0, opens: 0 };
      const averageCompletionRate = completionData.opens > 0 
        ? (completionData.completes / completionData.opens) * 100 
        : 0;

      const activeUsersResult = await clickhouse.query({
        query: `
          SELECT uniqExact(userId) as activeUsers
          FROM events_raw
          WHERE timestamp >= now() - INTERVAL 24 HOUR
        `,
        format: 'JSONEachRow',
      });
      const activeUsersLast24h = Number((await activeUsersResult.json() as any[])[0]?.activeUsers || 0);

      const focusSessionsResult = await clickhouse.query({
        query: `
          SELECT countIf(eventType = 'FOCUS_MODE_START') as totalFocusSessions
          FROM events_raw
        `,
        format: 'JSONEachRow',
      });
      const totalFocusSessions = Number((await focusSessionsResult.json() as any[])[0]?.totalFocusSessions || 0);

      res.json({
        success: true,
        data: {
          totalEvents,
          totalWatchTime,
          averageCompletionRate: Number(averageCompletionRate.toFixed(2)),
          activeUsersLast24h,
          totalFocusSessions,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Get overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics overview',
      } as ApiResponse<null>);
    }
  },

  getFocusAnalytics: async (req: AuthRequest, res: Response) => {
    try {
      const clickhouse = getClickHouseClient();

      const focusSessionsResult = await clickhouse.query({
        query: `
          SELECT countIf(eventType = 'FOCUS_MODE_START') as focusSessions
          FROM events_raw
        `,
        format: 'JSONEachRow',
      });
      const focusSessions = Number((await focusSessionsResult.json() as any[])[0]?.focusSessions || 0);

      res.json({
        success: true,
        data: {
          focusSessions,
          averageFocusDuration: 0, // Simplified
          mostFocusedVideo: null,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error('Get focus analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch focus analytics',
      } as ApiResponse<null>);
    }
  },

  getVideoAnalyticsLegacy: async (req: Request, res: Response) => {
    // Redirect to new endpoint
    return analyticsController.getVideoAnalytics(req, res);
  },
};
