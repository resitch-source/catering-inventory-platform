/**
 * Environment Configuration
 * Loads and validates all environment variables
 * Supports both .env files and direct environment variables
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().pipe(z.coerce.number()).default('3000'),
  API_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string(),
  DATABASE_POOL_MIN: z.string().pipe(z.coerce.number()).default('2'),
  DATABASE_POOL_MAX: z.string().pipe(z.coerce.number()).default('10'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: z.string().pipe(z.coerce.number()).default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().pipe(z.coerce.number()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().pipe(z.coerce.number()).default('100'),

  // Google Sheets (MVP)
  GOOGLE_SHEETS_API_KEY: z.string().optional(),
  GOOGLE_SHEETS_ID: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // LiveKit
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().pipe(z.coerce.number()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Feature Flags
  ENABLE_AI_DETECTION: z.string().pipe(z.coerce.boolean()).default('true'),
  ENABLE_EMAIL_NOTIFICATIONS: z.string().pipe(z.coerce.boolean()).default('false'),
  ENABLE_REALTIME_SYNC: z.string().pipe(z.coerce.boolean()).default('true'),
});

/**
 * Parse and validate environment variables
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
};

export const env = parseEnv();

// Export typed environment
export type Environment = z.infer<typeof envSchema>;

export default env;
