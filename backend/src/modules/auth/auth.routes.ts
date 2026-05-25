/**
 * Authentication Routes
 * Defines all authentication endpoints
 */

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

/**
 * Public routes
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authMiddleware, authController.refreshToken);

/**
 * Protected routes
 */
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
