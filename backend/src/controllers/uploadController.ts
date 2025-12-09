import { Request, Response } from 'express';
import { generatePresignedUploadUrl } from '../services/s3';
import { saveLocalFile, saveLocalThumbnail } from '../services/localStorage';
import { ApiResponse } from '@vs-platform/types';
import { AuthRequest } from '../middleware/auth';

const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

export const uploadController = {
  generatePresignedUrl: async (req: Request, res: Response) => {
    // Only available in S3 mode
    if (STORAGE_MODE !== 's3') {
      return res.status(400).json({
        success: false,
        error: 'Presigned URLs are only available in S3 mode. Use /upload-local for local storage.',
      } as ApiResponse<null>);
    }

    try {
      const { contentType, fileSize } = req.body;

      if (!contentType) {
        return res.status(400).json({
          success: false,
          error: 'Content type is required',
        } as ApiResponse<null>);
      }

      // Validate MIME type
      if (!contentType.startsWith('video/')) {
        return res.status(400).json({
          success: false,
          error: 'Only video files are allowed',
        } as ApiResponse<null>);
      }

      const result = await generatePresignedUploadUrl(contentType, fileSize);

      res.json({
        success: true,
        data: result,
      } as ApiResponse<typeof result>);
    } catch (error) {
      console.error('Presigned URL generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate upload URL',
      } as ApiResponse<null>);
    }
  },

  uploadLocal: async (req: AuthRequest, res: Response) => {
    // Only available in local mode
    if (STORAGE_MODE !== 'local') {
      return res.status(400).json({
        success: false,
        error: 'Local upload is only available in local storage mode.',
      } as ApiResponse<null>);
    }

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        } as ApiResponse<null>);
      }

      const videoFile = req.files && 'video' in req.files ? (req.files as { video: Express.Multer.File[] }).video[0] : req.file;
      const thumbnailFile = req.files && 'thumbnail' in req.files ? (req.files as { thumbnail: Express.Multer.File[] }).thumbnail[0] : undefined;

      if (!videoFile) {
        return res.status(400).json({
          success: false,
          error: 'No video file uploaded',
        } as ApiResponse<null>);
      }

      // Get videoId from form data if provided (to prevent duplicates)
      // Multer puts text fields in req.body
      const requestedVideoId: string | undefined = req.body?.videoId;

      console.log(`[Upload] Saving file for user ${req.user.id}, size: ${videoFile.size} bytes, type: ${videoFile.mimetype}`);
      if (requestedVideoId) {
        console.log(`[Upload] Using provided videoId: ${requestedVideoId}`);
      }
      
      const result = await saveLocalFile(videoFile, requestedVideoId);
      
      // Save thumbnail if provided
      let thumbnailPath: string | undefined;
      if (thumbnailFile) {
        console.log(`[Upload] Saving thumbnail for video ${result.videoId}, size: ${thumbnailFile.size} bytes, type: ${thumbnailFile.mimetype}`);
        thumbnailPath = await saveLocalThumbnail(thumbnailFile, result.videoId);
        console.log(`[Upload] Thumbnail saved successfully: ${thumbnailPath}`);
      }
      
      console.log(`[Upload] File saved successfully: ${result.filePath}, videoId: ${result.videoId}`);

      res.json({
        success: true,
        data: {
          videoId: result.videoId,
          filePath: result.filePath,
          thumbnailPath,
        },
      } as ApiResponse<typeof result & { thumbnailPath?: string }>);
    } catch (error: any) {
      console.error('Local upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save file',
      } as ApiResponse<null>);
    }
  },

  completeUpload: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Complete upload - to be implemented' });
  },
};
