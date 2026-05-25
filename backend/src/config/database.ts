/**
 * PostgreSQL Database Configuration
 * Handles connection pooling and migrations
 * Supports both direct and connection string connections
 */

import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

const { Pool } = pg;

/**
 * Create database connection pool
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  min: env.DATABASE_POOL_MIN,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Handle pool errors
 */
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { stack: err.stack });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

/**
 * Query helper with logging
 */
export const query = async (text: string, params?: (string | number | boolean | null)[], module?: string) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${duration}ms`, { module: module || 'database' });
    }
    
    return result;
  } catch (error) {
    logger.error('Database query error', {
      module: module || 'database',
      query: text.substring(0, 100),
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Transaction helper
 */
export const transaction = async (callback: (client: pg.PoolClient) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', {
      module: 'database',
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Initialize database
 */
export const initializeDatabase = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('✅ Database connection established', {
      module: 'database',
      timestamp: result.rows[0].now,
    });
    return true;
  } catch (error) {
    logger.error('❌ Failed to connect to database', {
      module: 'database',
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

export default pool;
