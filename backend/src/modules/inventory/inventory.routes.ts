/**
 * Inventory Routes
 * Defines all inventory endpoints
 */

import { Router } from 'express';
import * as inventoryController from './inventory.controller.js';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '../../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Inventory CRUD operations
 */
router.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.INVENTORY_MANAGER),
  inventoryController.createInventory
);

router.get('/', inventoryController.getAllInventory);
router.get('/:itemId', inventoryController.getInventory);

router.put(
  '/:itemId',
  requireRole(UserRole.SUPER_ADMIN, UserRole.INVENTORY_MANAGER),
  inventoryController.updateInventory
);

/**
 * Stock management
 */
router.post(
  '/:itemId/adjust-stock',
  requireRole(UserRole.SUPER_ADMIN, UserRole.INVENTORY_MANAGER, UserRole.KITCHEN_STAFF),
  inventoryController.adjustStock
);

/**
 * Batch operations
 */
router.post(
  '/batches',
  requireRole(UserRole.SUPER_ADMIN, UserRole.INVENTORY_MANAGER),
  inventoryController.createBatch
);

router.get('/:itemId/batches', inventoryController.getBatches);
router.get('/batches/expiring', inventoryController.getExpiringBatches);

/**
 * Transaction history
 */
router.get('/transactions', inventoryController.getTransactions);

export default router;
