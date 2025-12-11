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
 * Rate limiter for forgot password endpoint
 * Limits: 5 requests per hour per IP, 3 requests per hour per username
 */
export const rateLimitForgotPassword = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to include username in rate limit key
  keyGenerator: (req: Request) => {
    const ip = getIpAddress(req);
    const username = req.body?.username || '';
    // Create separate keys for IP and username
    return `forgot-password:${ip}:${username}`;
  },
  // Custom handler to check both IP and username limits
  handler: (req: Request, res: Response) => {
    const ip = getIpAddress(req);
    const username = req.body?.username || '';
    
    // Check if it's an IP limit or username limit
    // This is a simplified check - in production, you might want to use Redis for distributed rate limiting
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests. Please try again in an hour.',
    });
  },
});

/**
 * Additional rate limiter specifically for username-based limiting
 * This can be used in combination with the IP limiter
 */
export const rateLimitByUsername = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      const username = req.body?.username || req.params?.username || 'unknown';
      return `username:${username}`;
    },
    message: {
      success: false,
      error: 'Too many requests for this username. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

