/**
 * Main Express Application
 * Initializes and configures the server
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initializeDatabase } from './config/database.js';
import { initializeRedis } from './config/redis.js';

// Middleware
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';

export const app: Express = express();
export const httpServer = createServer(app);
export let io: SocketIOServer;

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

/**
 * CORS Configuration
 */
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * Request ID Middleware
 */
app.use(requestIdMiddleware);

/**
 * Health Check Endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);

/**
 * 404 Handler
 */
app.use(notFoundMiddleware);

/**
 * Error Handler (must be last)
 */
app.use(errorMiddleware);

/**
 * Initialize Socket.IO
 */
export const initializeSocketIO = () => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket event handlers
  io.on('connection', (socket) => {
    logger.info('Socket connected', {
      module: 'websocket',
      socketId: socket.id,
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', {
        module: 'websocket',
        socketId: socket.id,
      });
    });
  });

  logger.info('Socket.IO initialized', { module: 'websocket' });
};

/**
 * Initialize Application
 */
export const initializeApp = async () => {
  try {
    logger.info('Initializing application...', { module: 'app' });

    // Initialize database
    await initializeDatabase();

    // Initialize Redis
    await initializeRedis();

    // Initialize Socket.IO
    initializeSocketIO();

    logger.info('✅ Application initialized successfully', { module: 'app' });
  } catch (error) {
    logger.error('❌ Application initialization failed', {
      module: 'app',
      stack: error instanceof Error ? error.stack : String(error),
    });
    process.exit(1);
  }
};

export default app;
