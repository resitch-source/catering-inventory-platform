/**
 * JWT Service
 * Handles token generation, validation, and refresh logic
 */

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { JWTPayload, User, UserRole } from '../../types/index.js';

/**
 * Generate access token
 */
export const generateAccessToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
  };

  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256' });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { algorithm: 'HS256' });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    logger.warn('Access token verification failed', {
      module: 'auth',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; iat: number; exp: number } | null => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
  } catch (error) {
    logger.warn('Refresh token verification failed', {
      module: 'auth',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
