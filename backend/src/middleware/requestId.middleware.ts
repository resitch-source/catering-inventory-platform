/**
 * Request ID Middleware
 * Generates unique request ID for tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger.js';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    module: 'http',
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  next();
};

export default requestIdMiddleware;
