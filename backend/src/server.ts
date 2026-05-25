/**
 * Server Entry Point
 * Starts the HTTP server and handles graceful shutdown
 */

import { httpServer, app, initializeApp, io } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './config/database.js';
import { redisClient } from './config/redis.js';

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Initialize app (database, redis, sockets)
    await initializeApp();

    // Start HTTP server
    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server running on ${env.API_URL}`, {
        module: 'server',
        port: env.PORT,
        environment: env.NODE_ENV,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      module: 'server',
      stack: error instanceof Error ? error.stack : String(error),
    });
    process.exit(1);
  }
};

/**
 * Graceful Shutdown
 */
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...', { module: 'server' });

  try {
    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed', { module: 'server' });
    });

    // Close Socket.IO
    if (io) {
      io.close();
      logger.info('Socket.IO server closed', { module: 'server' });
    }

    // Close database connection
    await pool.end();
    logger.info('Database connection closed', { module: 'server' });

    // Close Redis connection
    await redisClient.disconnect();
    logger.info('Redis connection closed', { module: 'server' });

    logger.info('✅ Graceful shutdown complete', { module: 'server' });
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      module: 'server',
      stack: error instanceof Error ? error.stack : String(error),
    });
    process.exit(1);
  }
};

/**
 * Handle termination signals
 */
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    module: 'server',
    stack: error.stack,
  });
  gracefulShutdown();
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    module: 'server',
    reason: String(reason),
  });
});

// Start the server
startServer();
