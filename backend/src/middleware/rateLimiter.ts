import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

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
  // Use ipKeyGenerator helper to properly handle IPv6 addresses
  // Extract IP from request and normalize it using ipKeyGenerator
  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  },
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
  // Use ipKeyGenerator helper to properly handle IPv6 addresses
  // Extract IP from request and normalize it using ipKeyGenerator
  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  },
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

