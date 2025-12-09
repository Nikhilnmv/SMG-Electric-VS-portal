import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Enhanced Helmet configuration for HTTP header hardening
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3001", "http://localhost:3000"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:3001", "http://localhost:3000"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow HLS.js to load segments
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Additional security headers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Strict CORS configuration - only allow frontend origin
 */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [FRONTEND_ORIGIN];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (!origin && process.env.NODE_ENV !== 'production') {
      // Allow no origin in development
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
  maxAge: 86400, // 24 hours
});

/**
 * CSRF protection middleware (for non-API routes like auth pages)
 * Note: Modern approach uses SameSite cookies, but this adds additional protection
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // For production, implement proper CSRF token validation here
  // For now, rely on SameSite cookies and CORS
  // In a full implementation, you would:
  // 1. Generate CSRF token on GET requests
  // 2. Validate token on POST/PUT/DELETE requests
  // 3. Use a library like csurf or implement custom token validation

  next();
}

