/**
 * Inventory Validators
 * Request body validation schemas for inventory endpoints
 */

import Joi from 'joi';
import { StockUnit } from '../../types/index.js';

/**
 * Create inventory item validation schema
 */
export const createInventorySchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  sku: Joi.string().min(2).max(100).required(),
  barcode: Joi.string().max(100).optional(),
  category_id: Joi.string().uuid().optional(),
  supplier_id: Joi.string().uuid().required(),
  description: Joi.string().max(500).optional(),
  quantity: Joi.number().min(0).required(),
  unit: Joi.string().valid(...Object.values(StockUnit)).required(),
  reorder_level: Joi.number().min(0).required(),
  reorder_quantity: Joi.number().min(0).optional(),
  unit_cost: Joi.number().min(0).required(),
  selling_price: Joi.number().min(0).required(),
  location: Joi.string().max(255).optional(),
});

/**
 * Update inventory item validation schema
 */
export const updateInventorySchema = Joi.object({
  name: Joi.string().min(2).max(255),
  description: Joi.string().max(500),
  quantity: Joi.number().min(0),
  unit: Joi.string().valid(...Object.values(StockUnit)),
  reorder_level: Joi.number().min(0),
  reorder_quantity: Joi.number().min(0),
  unit_cost: Joi.number().min(0),
  selling_price: Joi.number().min(0),
  location: Joi.string().max(255),
});

/**
 * Stock adjustment validation schema
 */
export const adjustStockSchema = Joi.object({
  quantity: Joi.number().required(),
  reason: Joi.string().max(255).required(),
  notes: Joi.string().max(500).optional(),
  batch_id: Joi.string().uuid().optional(),
});

/**
 * Create batch validation schema
 */
export const createBatchSchema = Joi.object({
  inventory_item_id: Joi.string().uuid().required(),
  batch_number: Joi.string().min(2).max(100).required(),
  supplier_id: Joi.string().uuid().required(),
  quantity_received: Joi.number().min(1).required(),
  received_date: Joi.date().required(),
  expiry_date: Joi.date().min(Joi.ref('received_date')).required(),
  cost: Joi.number().min(0).required(),
  purchase_order_id: Joi.string().uuid().optional(),
});

export default {
  createInventorySchema,
  updateInventorySchema,
  adjustStockSchema,
  createBatchSchema,
};
