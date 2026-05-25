/**
 * Notification Routes
 */

import { Router } from 'express';
import * as notificationController from './notification.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', notificationController.getNotifications);
router.put('/:notificationId/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

export default router;
