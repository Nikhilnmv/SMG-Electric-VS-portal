import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Helper to extract IP address from request
const getIpAddress = (req: Request): string => {
  return (req.ip || 
    req.headers['x-forwarded-for']?.toString().split(',')[0] || 
    req.headers['x-real-ip']?.toString() || 
    req.socket.remoteAddress || 
    'unknown').trim();
};

/**
 * Global rate limiter: 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use custom key generator to properly handle IPv6 addresses
  keyGenerator: (req: Request) => getIpAddress(req),
  // Custom handler for when limit is exceeded
  handler: (req: Request, res: Response) => {
    const rateLimitInfo = (req as any).rateLimit;
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: rateLimitInfo?.resetTime 
        ? Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
        : Math.ceil((15 * 60 * 1000) / 1000),
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use custom key generator to properly handle IPv6 addresses
  keyGenerator: (req: Request) => getIpAddress(req),
  handler: (req: Request, res: Response) => {
    const rateLimitInfo = (req as any).rateLimit;
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: rateLimitInfo?.resetTime 
        ? Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
        : Math.ceil((15 * 60 * 1000) / 1000),
    });
  },
  skipSuccessfulRequests: false, // Count successful requests too (prevents enumeration)
});

