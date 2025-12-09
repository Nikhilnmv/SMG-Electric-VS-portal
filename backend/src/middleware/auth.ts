import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '@vs-platform/types';
import { prisma } from '../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify tokenVersion if present in token
    if (decoded.tokenVersion !== undefined) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true },
      });
      
      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        return res.status(403).json({ 
          success: false, 
          error: 'Token has been invalidated. Please log in again.' 
        });
      }
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Map Prisma enum to shared types (handle both uppercase and lowercase)
    const userRole = req.user.role.toUpperCase() as UserRole;
    const normalizedRoles = roles.map(r => r.toUpperCase() as UserRole);
    
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
}
