/**
 * Authentication Validators
 * Request body validation schemas for auth endpoints
 */

import Joi from 'joi';

/**
 * Register validation schema
 */
export const registerSchema = Joi.object({
  email: Joi.string().email().required().lowercase(),
  name: Joi.string().min(2).max(255).required(),
  password: Joi.string().min(8).max(255).required(),
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().required(),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

/**
 * Change password validation schema
 */
export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(255).required(),
});

/**
 * Update profile validation schema
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  phone: Joi.string().max(20),
  avatar: Joi.string().uri().max(500),
});

export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
};
