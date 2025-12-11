import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders, corsMiddleware, csrfProtection } from './middleware/security';
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { healthCheck, readinessCheck } from './middleware/healthCheck';
import { authRouter } from './routes/auth';
import { videoRouter } from './routes/videos';
import { uploadRouter } from './routes/upload';
import { analyticsRouter } from './routes/analytics';
import { adminRouter } from './routes/admin';
import { liveRouter } from './routes/live';
import { moduleRouter } from './routes/modules';
import { lessonRouter } from './routes/lessons';

dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - enables proper IP extraction from X-Forwarded-For headers
// This is important for rate limiting to work correctly behind proxies/load balancers
app.set('trust proxy', true);

// Security Middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting (100 requests per 15 min per IP)
app.use('/api', globalRateLimiter);

// CSRF protection for non-API routes (auth pages)
app.use(csrfProtection);

// Serve static files from uploads directory (for local storage mode)
if (process.env.STORAGE_MODE === 'local') {
  const uploadsPath = path.join(__dirname, '../uploads');
  // Ensure uploads directory exists
  if (!require('fs').existsSync(uploadsPath)) {
    require('fs').mkdirSync(uploadsPath, { recursive: true });
  }
  
  // Configure static file serving with proper MIME types for HLS and images
  app.use('/uploads', express.static(uploadsPath, {
    etag: true,
    lastModified: true,
    maxAge: '1d',
    setHeaders: (res: express.Response, filePath: string) => {
      // Set proper MIME types and CORS headers for HLS files
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
      } else if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        // Enable range requests for video segments
        res.setHeader('Accept-Ranges', 'bytes');
      } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        // Set CORS headers for image files (thumbnails)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }
    },
  }));
  console.log(`[Backend] Serving static files from: ${uploadsPath}`);
  console.log(`[Backend] Static files available at: http://localhost:${PORT}/uploads/...`);
}

// Health check endpoints (before rate limiting)
app.get('/health', healthCheck);
app.get('/ready', readinessCheck);

// Metrics endpoint (optional, for Prometheus scraping)
// To enable, install prom-client and implement the monitoring service
if (process.env.ENABLE_METRICS === 'true') {
  app.get('/metrics', async (req, res) => {
    try {
      const { getMetricsEndpoint } = await import('./services/monitoring');
      const metrics = await getMetricsEndpoint();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      console.error('Error exporting metrics:', error);
      res.status(500).send('# Metrics not available');
    }
  });
}

// Routes
// Auth routes with stricter rate limiting
app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/videos', videoRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/live', liveRouter);
app.use('/api/modules', moduleRouter);
app.use('/api/lessons', lessonRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;

