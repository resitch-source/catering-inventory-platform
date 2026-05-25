/**
 * Authentication Service
 * Handles user registration, login, and session management
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/database.js';
import { cache } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { generateAccessToken, generateRefreshToken } from './jwt.service.js';
import { User, UserRole, AuthResponse } from '../../types/index.js';
import { AuthenticationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

/**
 * Register new user
 */
export const registerUser = async (
  email: string,
  name: string,
  password: string,
  role: UserRole = UserRole.KITCHEN_STAFF
): Promise<User> => {
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    // Get role ID
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
    const roleId = roleResult.rows[0]?.id;

    // Create user
    const result = await pool.query(
      `INSERT INTO users (id, email, name, password_hash, role_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, true) 
       RETURNING *`,
      [uuidv4(), email.toLowerCase(), name, passwordHash, roleId]
    );

    logger.info('User registered successfully', {
      module: 'auth',
      userId: result.rows[0].id,
      email: result.rows[0].email,
    });

    return mapUserRow(result.rows[0]);
  } catch (error) {
    logger.error('User registration failed', {
      module: 'auth',
      email,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Login user
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }

    const userRow = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userRow.id]);

    const user = mapUserRow(userRow);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Cache refresh token
    await cache.set(`refresh_token:${user.id}`, refreshToken, 604800); // 7 days

    logger.info('User logged in successfully', {
      module: 'auth',
      userId: user.id,
      email: user.email,
    });

    return { accessToken, refreshToken, user };
  } catch (error) {
    logger.error('Login failed', {
      module: 'auth',
      email,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string, userId: string): Promise<string> => {
  try {
    // Verify cached token
    const cachedToken = await cache.get<string>(`refresh_token:${userId}`);
    if (!cachedToken || cachedToken !== refreshToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Get user
    const result = await pool.query(
      `SELECT u.*, r.name as role_name FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = mapUserRow(result.rows[0]);
    const accessToken = generateAccessToken(user);

    logger.info('Access token refreshed', {
      module: 'auth',
      userId: user.id,
    });

    return accessToken;
  } catch (error) {
    logger.error('Token refresh failed', {
      module: 'auth',
      userId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User> => {
  try {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return mapUserRow(result.rows[0]);
  } catch (error) {
    logger.error('Get user failed', {
      module: 'auth',
      userId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User> => {
  try {
    const updates: string[] = [];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (data.name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.phone) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    if (data.avatar) {
      updates.push(`avatar = $${paramIndex++}`);
      params.push(data.avatar);
    }

    if (updates.length === 0) {
      return getUserById(userId);
    }

    updates.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $1 
       RETURNING *`,
      params
    );

    logger.info('User profile updated', {
      module: 'auth',
      userId,
    });

    return mapUserRow(result.rows[0]);
  } catch (error) {
    logger.error('Update user profile failed', {
      module: 'auth',
      userId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Change password
 */
export const changePassword = async (userId: string, oldPassword: string, newPassword: string): Promise<void> => {
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const passwordMatch = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!passwordMatch) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newPasswordHash,
      userId,
    ]);

    // Invalidate all refresh tokens
    await cache.delete(`refresh_token:${userId}`);

    logger.info('Password changed', {
      module: 'auth',
      userId,
    });
  } catch (error) {
    logger.error('Change password failed', {
      module: 'auth',
      userId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Logout user
 */
export const logoutUser = async (userId: string): Promise<void> => {
  try {
    // Clear refresh token cache
    await cache.delete(`refresh_token:${userId}`);

    logger.info('User logged out', {
      module: 'auth',
      userId,
    });
  } catch (error) {
    logger.error('Logout failed', {
      module: 'auth',
      userId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Map database row to User object
 */
const mapUserRow = (row: any): User => {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role_name as UserRole,
    permissions: row.permissions || [],
    phone: row.phone,
    avatar: row.avatar,
    last_login: row.last_login,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export default {
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserById,
  updateUserProfile,
  changePassword,
  logoutUser,
};
