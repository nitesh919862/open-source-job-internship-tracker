import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.ts';
import { repository, sanitizeUser } from '../services/repository.ts';
import { ApiError, asyncHandler } from './errorHandler.ts';
import type { UserRole } from '../models/User.ts';

export interface AuthenticatedUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  skills: string[];
  headline: string;
  location: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError(401, 'Authentication required. Please sign in.');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Session expired or invalid token. Please sign in again.');
  }

  const user = await repository.findUserById(decoded.userId);
  if (!user) {
    throw new ApiError(401, 'User account no longer exists.');
  }

  req.user = sanitizeUser(user);
  next();
});

export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      return next();
    }
    try {
      const decoded = verifyToken(token);
      const user = await repository.findUserById(decoded.userId);
      if (user) {
        req.user = sanitizeUser(user);
      }
    } catch {
      // Invalid optional token treated as unauthenticated
    }
    next();
  }
);

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }
  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin privileges required to access this resource.'));
  }
  next();
}
