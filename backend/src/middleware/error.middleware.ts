/**
 * Error Handler Middleware
 * Centralized error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { sendErrorResponse, ErrorCodes, HttpStatus } from '../utils/errors.js';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';
  const userId = req.user?.userId || 'anonymous';
  const ip = req.ip || 'unknown';

  // Log error
  logger.error(err.message || 'Unknown error', {
    module: 'http',
    requestId,
    userId,
    ip,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode,
  });

  // Handle known error types
  if (err.name === 'ValidationError') {
    return sendErrorResponse(
      res,
      HttpStatus.BAD_REQUEST,
      err.message,
      ErrorCodes.VALIDATION_FAILED,
      err.details
    );
  }

  if (err.name === 'AuthenticationError') {
    return sendErrorResponse(
      res,
      HttpStatus.UNAUTHORIZED,
      err.message,
      ErrorCodes.UNAUTHORIZED
    );
  }

  if (err.name === 'AuthorizationError') {
    return sendErrorResponse(
      res,
      HttpStatus.FORBIDDEN,
      err.message,
      ErrorCodes.INSUFFICIENT_PERMISSIONS
    );
  }

  if (err.name === 'NotFoundError') {
    return sendErrorResponse(
      res,
      HttpStatus.NOT_FOUND,
      err.message,
      ErrorCodes.RESOURCE_NOT_FOUND
    );
  }

  if (err.name === 'ConflictError') {
    return sendErrorResponse(
      res,
      HttpStatus.CONFLICT,
      err.message,
      ErrorCodes.RESOURCE_ALREADY_EXISTS
    );
  }

  if (err.name === 'DatabaseError') {
    return sendErrorResponse(
      res,
      HttpStatus.INTERNAL_ERROR,
      'Database operation failed',
      ErrorCodes.DATABASE_ERROR
    );
  }

  // Default error response
  sendErrorResponse(
    res,
    err.statusCode || HttpStatus.INTERNAL_ERROR,
    err.message || 'Internal server error',
    err.errorCode || ErrorCodes.INTERNAL_ERROR
  );
};

/**
 * 404 Not Found Middleware
 */
export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
  sendErrorResponse(
    res,
    HttpStatus.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    ErrorCodes.RESOURCE_NOT_FOUND
  );
};

export default {
  errorMiddleware,
  notFoundMiddleware,
};
