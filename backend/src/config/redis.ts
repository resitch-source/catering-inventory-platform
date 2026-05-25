/**
 * Redis Configuration
 * Handles Redis connection and caching utilities
 * Used for sessions, caching, and Socket.IO adapter
 */

import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Create Redis client
 */
export const redisClient = createClient({
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis max retries exceeded');
      }
      return retries * 100;
    },
  },
});

/**
 * Redis event handlers
 */
redisClient.on('connect', () => {
  logger.info('✅ Redis connection established', { module: 'redis' });
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', {
    module: 'redis',
    stack: err.stack,
  });
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting', { module: 'redis' });
});

/**
 * Initialize Redis connection
 */
export const initializeRedis = async () => {
  try {
    await redisClient.connect();
    await redisClient.ping();
    logger.info('✅ Redis connection verified', { module: 'redis' });
    return true;
  } catch (error) {
    logger.error('❌ Failed to connect to Redis', {
      module: 'redis',
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Cache operations
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', {
        module: 'redis',
        key,
        stack: error instanceof Error ? error.stack : String(error),
      });
      return null;
    }
  },

  /**
   * Set value in cache
   */
  async set(key: string, value: any, expirySeconds?: number): Promise<boolean> {
    try {
      await redisClient.setEx(
        key,
        expirySeconds || 3600,
        JSON.stringify(value)
      );
      return true;
    } catch (error) {
      logger.error('Cache set error', {
        module: 'redis',
        key,
        stack: error instanceof Error ? error.stack : String(error),
      });
      return false;
    }
  },

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', {
        module: 'redis',
        key,
        stack: error instanceof Error ? error.stack : String(error),
      });
      return false;
    }
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      await redisClient.flushDb();
      return true;
    } catch (error) {
      logger.error('Cache clear error', {
        module: 'redis',
        stack: error instanceof Error ? error.stack : String(error),
      });
      return false;
    }
  },
};

export default redisClient;
