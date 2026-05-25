/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { loginSchema, registerSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema } from './auth.validators.js';
import { logger } from '../../config/logger.js';
import { sendErrorResponse, HttpStatus } from '../../utils/errors.js';
import { UserRole } from '../../types/index.js';

/**
 * @POST /auth/register
 * Register new user
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    const user = await authService.registerUser(
      value.email,
      value.name,
      value.password,
      UserRole.KITCHEN_STAFF
    );

    logger.info('User registration endpoint', {
      module: 'auth',
      requestId: req.requestId,
      userId: user.id,
    });

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: user,
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @POST /auth/login
 * Login user
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    const authResponse = await authService.loginUser(value.email, value.password);

    logger.info('User login endpoint', {
      module: 'auth',
      requestId: req.requestId,
      userId: authResponse.user.id,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: authResponse,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @POST /auth/refresh
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    if (!req.user?.userId) {
      return sendErrorResponse(res, HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const accessToken = await authService.refreshAccessToken(value.refreshToken, req.user.userId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: { accessToken },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @POST /auth/logout
 * Logout user
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendErrorResponse(res, HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    await authService.logoutUser(req.user.userId);

    logger.info('User logout endpoint', {
      module: 'auth',
      requestId: req.requestId,
      userId: req.user.userId,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @GET /auth/me
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendErrorResponse(res, HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const user = await authService.getUserById(req.user.userId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @PUT /auth/profile
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    if (!req.user?.userId) {
      return sendErrorResponse(res, HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const user = await authService.updateUserProfile(req.user.userId, value);

    logger.info('User profile update endpoint', {
      module: 'auth',
      requestId: req.requestId,
      userId: req.user.userId,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @POST /auth/change-password
 * Change user password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    if (!req.user?.userId) {
      return sendErrorResponse(res, HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    await authService.changePassword(req.user.userId, value.oldPassword, value.newPassword);

    logger.info('Password changed endpoint', {
      module: 'auth',
      requestId: req.requestId,
      userId: req.user.userId,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
};
