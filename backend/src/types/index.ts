/**
 * Type Definitions
 * Shared types across backend modules
 */

// ============================================================================
// AUTH TYPES
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  INVENTORY_MANAGER = 'inventory_manager',
  KITCHEN_STAFF = 'kitchen_staff',
  DELIVERY_STAFF = 'delivery_staff',
  AUDITOR = 'auditor',
}

export enum Permission {
  // Inventory permissions
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_CREATE = 'inventory:create',
  INVENTORY_EDIT = 'inventory:edit',
  INVENTORY_DELETE = 'inventory:delete',
  INVENTORY_EXPORT = 'inventory:export',

  // Barcode permissions
  BARCODE_SCAN = 'barcode:scan',
  BARCODE_HISTORY = 'barcode:history',

  // AI permissions
  AI_VIEW_DETECTIONS = 'ai:view_detections',
  AI_CONFIGURE = 'ai:configure',
  AI_VIEW_ANALYTICS = 'ai:view_analytics',

  // Report permissions
  REPORTS_VIEW = 'reports:view',
  REPORTS_CREATE = 'reports:create',
  REPORTS_EXPORT = 'reports:export',

  // User permissions
  USERS_MANAGE = 'users:manage',
  USERS_VIEW = 'users:view',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_AUDIT = 'system:audit',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  phone?: string;
  avatar?: string;
  last_login?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export enum StockUnit {
  PIECES = 'pieces',
  KG = 'kg',
  LITERS = 'liters',
  BOXES = 'boxes',
  TRAYS = 'trays',
}

export enum InventoryStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  supplier_id: string;
  quantity: number;
  unit: StockUnit;
  reorder_level: number;
  reorder_quantity: number;
  unit_cost: number;
  selling_price: number;
  status: InventoryStatus;
  category: string;
  location?: string;
  expiry_date?: Date;
  batch_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
  user_id: string;
  batch_id?: string;
  notes?: string;
  created_at: Date;
}

export interface Batch {
  id: string;
  inventory_item_id: string;
  batch_number: string;
  supplier_id: string;
  quantity_received: number;
  quantity_remaining: number;
  received_date: Date;
  expiry_date: Date;
  cost: number;
  created_at: Date;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  payment_terms: string;
  rating?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  order_number: string;
  status: 'draft' | 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  total_amount: number;
  expected_delivery: Date;
  items: PurchaseOrderItem[];
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// ============================================================================
// BARCODE TYPES
// ============================================================================

export enum BarcodeFormat {
  CODE128 = 'code128',
  CODE39 = 'code39',
  EAN13 = 'ean13',
  QR = 'qr',
  UPC = 'upc',
}

export interface BarcodeData {
  value: string;
  format: BarcodeFormat;
  raw_data?: string;
}

export interface ScanResult {
  id: string;
  user_id: string;
  inventory_item_id: string;
  barcode_value: string;
  barcode_format: BarcodeFormat;
  quantity_scanned: number;
  status: 'success' | 'duplicate' | 'not_found' | 'error';
  device_type: 'phone_camera' | 'usb_scanner' | 'bluetooth_scanner';
  location?: string;
  timestamp: Date;
  created_at: Date;
}

// ============================================================================
// AI TYPES
// ============================================================================

export interface AIDetection {
  id: string;
  camera_id: string;
  detection_type: 'tray_count' | 'product_recognition' | 'ocr_reading' | 'staff_activity' | 'delivery_verification';
  detected_objects: DetectedObject[];
  confidence: number;
  image_url?: string;
  video_frame?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface DetectedObject {
  class: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  label?: string;
  quantity?: number;
}

export interface PredictionResult {
  inventory_item_id: string;
  predicted_stock_level: number;
  predicted_expiry_rate: number;
  recommended_reorder_quantity: number;
  confidence: number;
  timestamp: Date;
}

export interface AIAlert {
  id: string;
  alert_type: 'anomaly' | 'warning' | 'critical';
  title: string;
  description: string;
  inventory_item_id?: string;
  user_id?: string;
  acknowledged: boolean;
  created_at: Date;
  acknowledged_at?: Date;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardKPI {
  total_inventory_value: number;
  items_in_stock: number;
  items_low_stock: number;
  items_expired: number;
  pending_orders: number;
  recent_transactions: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: Date;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export enum NotificationType {
  LOW_STOCK = 'low_stock',
  EXPIRY_WARNING = 'expiry_warning',
  AI_ALERT = 'ai_alert',
  DELIVERY_UPDATE = 'delivery_update',
  ORDER_RECEIVED = 'order_received',
  SYSTEM_ALERT = 'system_alert',
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: Date;
  read_at?: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
