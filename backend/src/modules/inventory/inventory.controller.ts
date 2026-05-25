/**
 * Inventory Controller
 * Handles HTTP requests for inventory operations
 */

import { Request, Response, NextFunction } from 'express';
import * as inventoryService from './inventory.service.js';
import { createInventorySchema, updateInventorySchema, adjustStockSchema, createBatchSchema } from './inventory.validators.js';
import { logger } from '../../config/logger.js';
import { sendErrorResponse, HttpStatus } from '../../utils/errors.js';

/**
 * @POST /inventory
 * Create inventory item
 */
export const createInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createInventorySchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    const item = await inventoryService.createInventoryItem(value);

    logger.info('Inventory created via API', {
      module: 'inventory',
      requestId: req.requestId,
      userId: req.user?.userId,
      itemId: item.id,
    });

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: item,
      message: 'Inventory item created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @GET /inventory/:itemId
 * Get inventory item by ID
 */
export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await inventoryService.getInventoryItemById(req.params.itemId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @GET /inventory
 * Get all inventory items with pagination
 */
export const getAllInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await inventoryService.getAllInventoryItems(page, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @PUT /inventory/:itemId
 * Update inventory item
 */
export const updateInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = updateInventorySchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    const item = await inventoryService.updateInventoryItem(req.params.itemId, value);

    logger.info('Inventory updated via API', {
      module: 'inventory',
      requestId: req.requestId,
      userId: req.user?.userId,
      itemId: req.params.itemId,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: item,
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @POST /inventory/:itemId/adjust-stock
 * Adjust inventory stock
 */
export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = adjustStockSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    if (!req.user?.userId) {
      return sendErrorResponse(res, HttpStatus.UNAUTHORIZED, 'User not authenticated');
    }

    const transaction = await inventoryService.adjustStock(
      req.params.itemId,
      value.quantity,
      value.type || 'adjustment',
      req.user.userId,
      value.reason,
      value.batch_id
    );

    logger.info('Stock adjusted via API', {
      module: 'inventory',
      requestId: req.requestId,
      userId: req.user.userId,
      itemId: req.params.itemId,
      quantity: value.quantity,
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: transaction,
      message: 'Stock adjusted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @POST /inventory/batches
 * Create batch
 */
export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createBatchSchema.validate(req.body);
    if (error) {
      return sendErrorResponse(res, HttpStatus.BAD_REQUEST, error.message);
    }

    const batch = await inventoryService.createBatch(value);

    logger.info('Batch created via API', {
      module: 'inventory',
      requestId: req.requestId,
      userId: req.user?.userId,
      batchId: batch.id,
    });

    res.status(HttpStatus.CREATED).json({
      success: true,
      data: batch,
      message: 'Batch created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @GET /inventory/:itemId/batches
 * Get batches for item
 */
export const getBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await inventoryService.getBatchesForItem(req.params.itemId);

    res.status(HttpStatus.OK).json({
      success: true,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @GET /inventory/batches/expiring
 * Get expiring batches
 */
export const getExpiringBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const daysThreshold = parseInt(req.query.days as string) || 30;
    const batches = await inventoryService.getExpiringBatches(daysThreshold);

    res.status(HttpStatus.OK).json({
      success: true,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @GET /inventory/transactions
 * Get transaction history
 */
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.query.itemId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await inventoryService.getTransactionHistory(itemId, page, limit);

    res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createInventory,
  getInventory,
  getAllInventory,
  updateInventory,
  adjustStock,
  createBatch,
  getBatches,
  getExpiringBatches,
  getTransactions,
};
