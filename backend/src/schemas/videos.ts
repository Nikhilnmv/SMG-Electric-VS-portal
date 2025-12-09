import { z } from 'zod';

/**
 * Validation schema for video registration/creation
 */
export const registerVideoSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title is too long'),
  description: z
    .string()
    .max(5000, 'Description is too long')
    .optional()
    .nullable(),
  fileKey: z
    .string()
    .min(1, 'File key is required')
    .optional(),
  filePath: z
    .string()
    .min(1, 'File path is required')
    .optional(),
  thumbnailUrl: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val === null || val === '') return true;
        // Allow both full URLs and relative paths (starting with /)
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
      },
      {
        message: 'Thumbnail URL must be a valid URL or relative path starting with /',
      }
    ),
  videoId: z
    .string()
    .min(1, 'Video ID is required')
    .optional(),
}).refine(
  (data) => data.fileKey || data.filePath,
  {
    message: 'Either fileKey or filePath must be provided',
    path: ['fileKey'],
  }
);

/**
 * Validation schema for video update
 */
export const updateVideoSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title is too long')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description is too long')
    .optional()
    .nullable(),
  thumbnailUrl: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val === null || val === '') return true;
        // Allow both full URLs and relative paths (starting with /)
        return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
      },
      {
        message: 'Thumbnail URL must be a valid URL or relative path starting with /',
      }
    ),
});

/**
 * Validation schema for video progress update
 */
export const updateVideoProgressSchema = z.object({
  progress: z
    .number()
    .int('Progress must be an integer')
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100'),
});

