/**
 * Inventory Service
 * Handles inventory CRUD operations, stock management, and batch tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { pool, transaction } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { InventoryItem, Batch, InventoryTransaction, InventoryStatus, StockUnit } from '../../types/index.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

/**
 * Create inventory item
 */
export const createInventoryItem = async (data: any): Promise<InventoryItem> => {
  try {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO inventory_items (
        id, name, sku, barcode, category_id, supplier_id, description,
        quantity, unit, reorder_level, reorder_quantity,
        unit_cost, selling_price, status, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, data.name, data.sku, data.barcode, data.category_id, data.supplier_id,
        data.description, data.quantity, data.unit, data.reorder_level,
        data.reorder_quantity, data.unit_cost, data.selling_price,
        InventoryStatus.IN_STOCK, data.location
      ]
    );

    logger.info('Inventory item created', {
      module: 'inventory',
      itemId: id,
      sku: data.sku,
    });

    return mapInventoryRow(result.rows[0]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new ConflictError('SKU or barcode already exists');
    }
    logger.error('Create inventory item failed', {
      module: 'inventory',
      sku: data.sku,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Get inventory item by ID
 */
export const getInventoryItemById = async (itemId: string): Promise<InventoryItem> => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Inventory item');
    }

    return mapInventoryRow(result.rows[0]);
  } catch (error) {
    logger.error('Get inventory item failed', {
      module: 'inventory',
      itemId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Get all inventory items with pagination
 */
export const getAllInventoryItems = async (page: number = 1, limit: number = 50): Promise<any> => {
  try {
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as total FROM inventory_items');
    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM inventory_items ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      data: result.rows.map(mapInventoryRow),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Get all inventory items failed', {
      module: 'inventory',
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Update inventory item
 */
export const updateInventoryItem = async (itemId: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
  try {
    const updates: string[] = [];
    const params: any[] = [itemId];
    let paramIndex = 2;

    const updateFields = ['name', 'description', 'quantity', 'unit', 'reorder_level', 'reorder_quantity', 'unit_cost', 'selling_price', 'location'];
    for (const field of updateFields) {
      if (data[field as keyof InventoryItem] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(data[field as keyof InventoryItem]);
      }
    }

    if (updates.length === 0) {
      return getInventoryItemById(itemId);
    }

    updates.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Inventory item');
    }

    logger.info('Inventory item updated', {
      module: 'inventory',
      itemId,
    });

    return mapInventoryRow(result.rows[0]);
  } catch (error) {
    logger.error('Update inventory item failed', {
      module: 'inventory',
      itemId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Adjust stock (in/out/adjustment)
 */
export const adjustStock = async (
  itemId: string,
  quantity: number,
  type: 'in' | 'out' | 'adjustment',
  userId: string,
  reason?: string,
  batchId?: string
): Promise<InventoryTransaction> => {
  return transaction(async (client) => {
    try {
      // Get current item
      const itemResult = await client.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
      if (itemResult.rows.length === 0) {
        throw new NotFoundError('Inventory item');
      }

      const currentItem = itemResult.rows[0];
      let newQuantity = currentItem.quantity;

      // Calculate new quantity based on type
      if (type === 'in') {
        newQuantity += quantity;
      } else if (type === 'out') {
        if (currentItem.quantity < quantity) {
          throw new Error('Insufficient stock');
        }
        newQuantity -= quantity;
      } else {
        newQuantity = quantity;
      }

      // Determine status
      let status = InventoryStatus.IN_STOCK;
      if (newQuantity === 0) {
        status = InventoryStatus.OUT_OF_STOCK;
      } else if (newQuantity < currentItem.reorder_level) {
        status = InventoryStatus.LOW_STOCK;
      }

      // Update inventory item
      await client.query(
        `UPDATE inventory_items SET quantity = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newQuantity, status, itemId]
      );

      // Create transaction record
      const transactionId = uuidv4();
      const transResult = await client.query(
        `INSERT INTO inventory_transactions (
          id, inventory_item_id, batch_id, transaction_type, quantity, reason, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [transactionId, itemId, batchId, type, quantity, reason || null, userId]
      );

      logger.info('Stock adjusted', {
        module: 'inventory',
        itemId,
        type,
        quantity,
        newQuantity,
        status,
      });

      return mapTransactionRow(transResult.rows[0]);
    } catch (error) {
      logger.error('Stock adjustment failed', {
        module: 'inventory',
        itemId,
        stack: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  });
};

/**
 * Create batch
 */
export const createBatch = async (data: any): Promise<Batch> => {
  try {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO batches (
        id, inventory_item_id, batch_number, supplier_id,
        quantity_received, quantity_remaining, received_date, expiry_date, cost, purchase_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, data.inventory_item_id, data.batch_number, data.supplier_id,
        data.quantity_received, data.quantity_received, data.received_date,
        data.expiry_date, data.cost, data.purchase_order_id || null
      ]
    );

    logger.info('Batch created', {
      module: 'inventory',
      batchId: id,
      batchNumber: data.batch_number,
      itemId: data.inventory_item_id,
    });

    return mapBatchRow(result.rows[0]);
  } catch (error) {
    logger.error('Create batch failed', {
      module: 'inventory',
      batchNumber: data.batch_number,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Get batches for item
 */
export const getBatchesForItem = async (itemId: string): Promise<Batch[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM batches WHERE inventory_item_id = $1 ORDER BY expiry_date ASC`,
      [itemId]
    );

    return result.rows.map(mapBatchRow);
  } catch (error) {
    logger.error('Get batches failed', {
      module: 'inventory',
      itemId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Get expiring batches
 */
export const getExpiringBatches = async (daysThreshold: number = 30): Promise<Batch[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM batches 
       WHERE expiry_date <= NOW() + INTERVAL '${daysThreshold} days'
       AND expiry_date > NOW()
       ORDER BY expiry_date ASC`
    );

    return result.rows.map(mapBatchRow);
  } catch (error) {
    logger.error('Get expiring batches failed', {
      module: 'inventory',
      daysThreshold,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Get inventory transaction history
 */
export const getTransactionHistory = async (
  itemId?: string,
  page: number = 1,
  limit: number = 50
): Promise<any> => {
  try {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let query = 'SELECT * FROM inventory_transactions';
    let countQuery = 'SELECT COUNT(*) as total FROM inventory_transactions';

    if (itemId) {
      query += ' WHERE inventory_item_id = $1';
      countQuery += ' WHERE inventory_item_id = $1';
      params.push(itemId);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const countResult = await pool.query(countQuery, itemId ? [itemId] : []);
    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(query, params);

    return {
      data: result.rows.map(mapTransactionRow),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Get transaction history failed', {
      module: 'inventory',
      itemId,
      stack: error instanceof Error ? error.stack : String(error),
    });
    throw error;
  }
};

/**
 * Map database row to InventoryItem
 */
const mapInventoryRow = (row: any): InventoryItem => {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    supplier_id: row.supplier_id,
    quantity: row.quantity,
    unit: row.unit,
    reorder_level: row.reorder_level,
    reorder_quantity: row.reorder_quantity,
    unit_cost: row.unit_cost,
    selling_price: row.selling_price,
    status: row.status,
    category: row.category_id,
    location: row.location,
    expiry_date: row.expiry_date,
    batch_number: row.batch_number,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Map database row to Batch
 */
const mapBatchRow = (row: any): Batch => {
  return {
    id: row.id,
    inventory_item_id: row.inventory_item_id,
    batch_number: row.batch_number,
    supplier_id: row.supplier_id,
    quantity_received: row.quantity_received,
    quantity_remaining: row.quantity_remaining,
    received_date: row.received_date,
    expiry_date: row.expiry_date,
    cost: row.cost,
    created_at: row.created_at,
  };
};

/**
 * Map database row to InventoryTransaction
 */
const mapTransactionRow = (row: any): InventoryTransaction => {
  return {
    id: row.id,
    inventory_item_id: row.inventory_item_id,
    transaction_type: row.transaction_type,
    quantity: row.quantity,
    reason: row.reason,
    user_id: row.user_id,
    batch_id: row.batch_id,
    notes: row.notes,
    created_at: row.created_at,
  };
};

export default {
  createInventoryItem,
  getInventoryItemById,
  getAllInventoryItems,
  updateInventoryItem,
  adjustStock,
  createBatch,
  getBatchesForItem,
  getExpiringBatches,
  getTransactionHistory,
};
