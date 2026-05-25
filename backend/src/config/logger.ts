/**
 * Winston Logger Configuration
 * Provides structured logging with multiple transports
 * Logs to: console, file (access, error, inventory, ai, websocket, security)
 */

import winston from 'winston';
import path from 'path';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, errors, metadata } = winston.format;

/**
 * Custom log format for structured logging
 */
const customFormat = printf(({ level, message, timestamp, requestId, userId, ip, module, stack }) => {
  const meta = {
    timestamp,
    level,
    requestId,
    userId,
    ip,
    module,
    message,
    ...(stack && { stack }),
  };

  return env.LOG_FORMAT === 'json' ? JSON.stringify(meta) : 
    `[${timestamp}] ${level.toUpperCase()} [${requestId || '-'}] [${userId || '-'}] [${ip || '-'}] [${module || 'app'}] ${message}${stack ? '\n' + stack : ''}`;
});

/**
 * Create logger instance
 */
const createLogger = () => {
  const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        customFormat
      ),
    }),
  ];

  // File transports in production
  if (env.NODE_ENV === 'production') {
    const logsDir = path.join(process.cwd(), 'logs');

    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          customFormat
        ),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'access.log'),
        level: 'info',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          customFormat
        ),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'inventory.log'),
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          customFormat
        ),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'ai.log'),
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          customFormat
        ),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'security.log'),
        level: 'warn',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          customFormat
        ),
      })
    );
  }

  return winston.createLogger({
    level: env.LOG_LEVEL,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      metadata()
    ),
    transports,
    exitOnError: false,
  });
};

export const logger = createLogger();

/**
 * Child logger with request context
 */
export const createRequestLogger = (requestId: string, userId?: string, ip?: string) => {
  return logger.child({ requestId, userId, ip });
};

export default logger;
