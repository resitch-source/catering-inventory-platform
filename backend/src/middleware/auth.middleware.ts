/**
 * Authentication Middleware
 * Validates JWT tokens and enforces authorization
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/jwt.service.js';
import { logger } from '../config/logger.js';
import { sendErrorResponse, ErrorCodes, HttpStatus } from '../utils/errors.js';
import { JWTPayload, Permission } from '../types/index.js';

/**
 * Extend Express Request with auth data
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      requestId?: string;
    }
  }
}

/**
 * Verify JWT token
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return sendErrorResponse(
      res,
      HttpStatus.UNAUTHORIZED,
      'Missing authentication token',
      ErrorCodes.UNAUTHORIZED
    );
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return sendErrorResponse(
      res,
      HttpStatus.UNAUTHORIZED,
      'Invalid or expired token',
      ErrorCodes.TOKEN_EXPIRED
    );
  }

  req.user = payload;
  next();
};

/**
 * Optional auth - doesn't fail if no token
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
};

/**
 * Require specific role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        module: 'auth',
        userId: req.user?.userId,
        requiredRoles: roles,
        userRole: req.user?.role,
      });

      return sendErrorResponse(
        res,
        HttpStatus.FORBIDDEN,
        'Insufficient permissions',
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }
    next();
  };
};

/**
 * Require specific permission
 */
export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendErrorResponse(
        res,
        HttpStatus.UNAUTHORIZED,
        'Authentication required',
        ErrorCodes.UNAUTHORIZED
      );
    }

    // TODO: Check permissions from database
    next();
  };
};

export default {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requirePermission,
};
