/**
 * Inventory Management Module
 *
 * Handles pharmacy inventory tracking, NDC management,
 * reorder points, and wholesaler integration.
 */

import { z } from 'zod';

// ============================================
// INVENTORY TYPES
// ============================================

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  ndc: string;
  drugName: string;
  manufacturer: string;
  quantityOnHand: number;
  quantityAllocated: number; // Reserved for pending fills
  quantityAvailable: number; // QOH - Allocated
  unit: string;
  reorderPoint: number;
  parLevel: number;
  binLocation: string;
  lotNumber?: string;
  expirationDate?: Date;
  acquisitionCost: number;
  awpPrice?: number;
  lastCountDate?: Date;
  lastReceiveDate?: Date;
  primaryWholesaler: string;
  isControlled: boolean;
  deaSchedule?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  pharmacyId: string;
  ndc: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  runningBalance: number;
  referenceId?: string;
  referenceType?: 'fill' | 'order' | 'return' | 'adjustment' | 'transfer';
  lotNumber?: string;
  expirationDate?: Date;
  cost?: number;
  reason?: string;
  userId: string;
  timestamp: Date;
}

export type InventoryTransactionType =
  | 'receive' // Stock received from wholesaler
  | 'dispense' // Dispensed to patient
  | 'return_to_stock' // Returned from will-call
  | 'return_to_wholesaler' // Returned to wholesaler
  | 'adjustment_up' // Positive adjustment (found extra)
  | 'adjustment_down' // Negative adjustment (damaged, expired, lost)
  | 'transfer_out' // Transferred to another location
  | 'transfer_in' // Received from another location
  | 'cycle_count'; // Physical count adjustment

export interface StockOrder {
  id: string;
  pharmacyId: string;
  wholesalerId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  totalCost: number;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  createdBy: string;
  approvedBy?: string;
}

export type OrderStatus = 'draft' | 'pending_approval' | 'submitted' | 'confirmed' | 'shipped' | 'partial' | 'received' | 'cancelled';

export interface OrderItem {
  ndc: string;
  drugName: string;
  quantityOrdered: number;
  quantityReceived?: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  lotNumber?: string;
  expirationDate?: Date;
  status: 'pending' | 'shipped' | 'received' | 'backordered' | 'substituted';
  substituteNdc?: string;
}

// ============================================
// NDC UTILITIES
// ============================================

/**
 * Validate and format NDC
 * Accepts various formats and normalizes to 11-digit
 */
export function normalizeNDC(ndc: string): string {
  // Remove dashes and spaces
  const cleaned = ndc.replace(/[-\s]/g, '');

  // If already 11 digits, return as-is
  if (/^\d{11}$/.test(cleaned)) {
    return cleaned;
  }

  // If 10 digits, determine format and pad
  if (/^\d{10}$/.test(cleaned)) {
    // Assume 5-4-1 format, convert to 5-4-2
    return cleaned.slice(0, 9) + '0' + cleaned.slice(9);
  }

  // Return original if can't normalize
  return cleaned;
}

/**
 * Format NDC with dashes (5-4-2 format)
 */
export function formatNDC(ndc: string): string {
  const normalized = normalizeNDC(ndc);
  if (normalized.length !== 11) return ndc;
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 9)}-${normalized.slice(9)}`;
}

/**
 * Validate NDC format
 */
export function isValidNDCFormat(ndc: string): boolean {
  const cleaned = ndc.replace(/[-\s]/g, '');
  return /^\d{10,11}$/.test(cleaned);
}

/**
 * Parse NDC components
 */
export function parseNDC(ndc: string): NDCComponents | null {
  const normalized = normalizeNDC(ndc);
  if (normalized.length !== 11) return null;

  return {
    labelerCode: normalized.slice(0, 5),
    productCode: normalized.slice(5, 9),
    packageCode: normalized.slice(9, 11),
    full: normalized,
    formatted: formatNDC(normalized),
  };
}

export interface NDCComponents {
  labelerCode: string;
  productCode: string;
  packageCode: string;
  full: string;
  formatted: string;
}

// ============================================
// INVENTORY OPERATIONS
// ============================================

/**
 * Calculate available quantity
 */
export function calculateAvailableQuantity(item: InventoryItem): number {
  return Math.max(0, item.quantityOnHand - item.quantityAllocated);
}

/**
 * Check if item needs reorder
 */
export function needsReorder(item: InventoryItem): boolean {
  const available = calculateAvailableQuantity(item);
  return available <= item.reorderPoint;
}

/**
 * Calculate order quantity to reach par level
 */
export function calculateOrderQuantity(item: InventoryItem): number {
  const available = calculateAvailableQuantity(item);
  if (available >= item.reorderPoint) return 0;
  return Math.max(0, item.parLevel - available);
}

/**
 * Check if item is expiring soon (within 90 days)
 */
export function isExpiringSoon(item: InventoryItem, daysThreshold: number = 90): boolean {
  if (!item.expirationDate) return false;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return item.expirationDate <= thresholdDate;
}

/**
 * Check if item is expired
 */
export function isExpired(item: InventoryItem): boolean {
  if (!item.expirationDate) return false;
  return item.expirationDate < new Date();
}

/**
 * Generate reorder list for pharmacy
 */
export function generateReorderList(inventory: InventoryItem[]): ReorderItem[] {
  return inventory
    .filter(item => needsReorder(item))
    .map(item => ({
      ndc: item.ndc,
      drugName: item.drugName,
      currentQuantity: calculateAvailableQuantity(item),
      reorderPoint: item.reorderPoint,
      parLevel: item.parLevel,
      orderQuantity: calculateOrderQuantity(item),
      wholesaler: item.primaryWholesaler,
      estimatedCost: calculateOrderQuantity(item) * item.acquisitionCost,
      priority: calculateReorderPriority(item),
      isControlled: item.isControlled,
    }))
    .sort((a, b) => b.priority - a.priority);
}

export interface ReorderItem {
  ndc: string;
  drugName: string;
  currentQuantity: number;
  reorderPoint: number;
  parLevel: number;
  orderQuantity: number;
  wholesaler: string;
  estimatedCost: number;
  priority: number;
  isControlled: boolean;
}

/**
 * Calculate reorder priority (1-10, higher = more urgent)
 */
function calculateReorderPriority(item: InventoryItem): number {
  const available = calculateAvailableQuantity(item);

  // Out of stock = highest priority
  if (available === 0) return 10;

  // Critical if below 25% of reorder point
  if (available < item.reorderPoint * 0.25) return 9;

  // High if below 50% of reorder point
  if (available < item.reorderPoint * 0.5) return 7;

  // Medium if at or below reorder point
  if (available <= item.reorderPoint) return 5;

  // Low priority
  return 3;
}

/**
 * Generate inventory valuation report
 */
export function calculateInventoryValue(inventory: InventoryItem[]): InventoryValuation {
  const items = inventory.map(item => ({
    ndc: item.ndc,
    drugName: item.drugName,
    quantity: item.quantityOnHand,
    unitCost: item.acquisitionCost,
    totalValue: item.quantityOnHand * item.acquisitionCost,
  }));

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    totalValue: Math.round(totalValue * 100) / 100,
    totalItems,
    totalUnits,
    averageValuePerItem: totalItems > 0 ? Math.round((totalValue / totalItems) * 100) / 100 : 0,
  };
}

export interface InventoryValuation {
  items: Array<{
    ndc: string;
    drugName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
  }>;
  totalValue: number;
  totalItems: number;
  totalUnits: number;
  averageValuePerItem: number;
}

/**
 * Find expired or soon-to-expire inventory
 */
export function findExpiringInventory(
  inventory: InventoryItem[],
  daysThreshold: number = 90
): ExpiringItem[] {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return inventory
    .filter(item => item.expirationDate && item.expirationDate <= thresholdDate)
    .map(item => ({
      ndc: item.ndc,
      drugName: item.drugName,
      lotNumber: item.lotNumber,
      quantity: item.quantityOnHand,
      expirationDate: item.expirationDate!,
      daysUntilExpiration: Math.ceil((item.expirationDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      isExpired: item.expirationDate! < today,
      value: item.quantityOnHand * item.acquisitionCost,
    }))
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
}

export interface ExpiringItem {
  ndc: string;
  drugName: string;
  lotNumber?: string;
  quantity: number;
  expirationDate: Date;
  daysUntilExpiration: number;
  isExpired: boolean;
  value: number;
}

/**
 * Record inventory transaction
 */
export function createInventoryTransaction(
  item: InventoryItem,
  type: InventoryTransactionType,
  quantity: number,
  userId: string,
  options?: {
    referenceId?: string;
    referenceType?: 'fill' | 'order' | 'return' | 'adjustment' | 'transfer';
    lotNumber?: string;
    expirationDate?: Date;
    cost?: number;
    reason?: string;
  }
): InventoryTransaction {
  // Calculate new running balance based on transaction type
  let balanceChange = 0;
  switch (type) {
    case 'receive':
    case 'return_to_stock':
    case 'adjustment_up':
    case 'transfer_in':
      balanceChange = quantity;
      break;
    case 'dispense':
    case 'return_to_wholesaler':
    case 'adjustment_down':
    case 'transfer_out':
      balanceChange = -quantity;
      break;
    case 'cycle_count':
      // For cycle count, quantity is the actual count, not a change
      balanceChange = quantity - item.quantityOnHand;
      break;
  }

  const newBalance = item.quantityOnHand + balanceChange;

  return {
    id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    inventoryItemId: item.id,
    pharmacyId: item.pharmacyId,
    ndc: item.ndc,
    transactionType: type,
    quantity: Math.abs(quantity),
    runningBalance: Math.max(0, newBalance),
    referenceId: options?.referenceId,
    referenceType: options?.referenceType,
    lotNumber: options?.lotNumber || item.lotNumber,
    expirationDate: options?.expirationDate || item.expirationDate,
    cost: options?.cost,
    reason: options?.reason,
    userId,
    timestamp: new Date(),
  };
}

/**
 * Validate inventory adjustment
 */
export function validateAdjustment(
  item: InventoryItem,
  adjustmentQuantity: number,
  type: 'up' | 'down'
): AdjustmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (type === 'down') {
    if (adjustmentQuantity > item.quantityOnHand) {
      errors.push(`Cannot adjust down by ${adjustmentQuantity}. Only ${item.quantityOnHand} on hand.`);
    }
    if (adjustmentQuantity > item.quantityOnHand * 0.1) {
      warnings.push('Large downward adjustment (>10% of stock). Ensure proper documentation.');
    }
  }

  if (type === 'up' && adjustmentQuantity > item.parLevel * 2) {
    warnings.push('Large upward adjustment. Verify this is not a receiving error.');
  }

  if (item.isControlled) {
    warnings.push('This is a controlled substance. DEA documentation may be required.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiresWitness: item.isControlled && type === 'down',
    requiresDocumentation: true,
  };
}

export interface AdjustmentValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiresWitness: boolean;
  requiresDocumentation: boolean;
}

// ============================================
// WHOLESALER INTEGRATION
// ============================================

export const WHOLESALERS = {
  CARDINAL: { id: 'CARDINAL', name: 'Cardinal Health', ediId: 'CAH' },
  MCKESSON: { id: 'MCKESSON', name: 'McKesson Corporation', ediId: 'MCK' },
  AMERISOURCE: { id: 'AMERISOURCE', name: 'AmerisourceBergen', ediId: 'ABC' },
  MORRIS_DICKSON: { id: 'MORRIS_DICKSON', name: 'Morris & Dickson', ediId: 'MND' },
  HD_SMITH: { id: 'HD_SMITH', name: 'HD Smith', ediId: 'HDS' },
} as const;

export type WholesalerId = keyof typeof WHOLESALERS;

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const InventoryItemSchema = z.object({
  pharmacyId: z.string().uuid(),
  ndc: z.string().min(10).max(13),
  drugName: z.string().min(1),
  manufacturer: z.string(),
  quantityOnHand: z.number().min(0),
  quantityAllocated: z.number().min(0).default(0),
  unit: z.string(),
  reorderPoint: z.number().min(0),
  parLevel: z.number().min(0),
  binLocation: z.string(),
  lotNumber: z.string().optional(),
  expirationDate: z.date().optional(),
  acquisitionCost: z.number().min(0),
  primaryWholesaler: z.string(),
  isControlled: z.boolean().default(false),
  deaSchedule: z.string().optional(),
});

export const InventoryTransactionSchema = z.object({
  inventoryItemId: z.string().uuid(),
  transactionType: z.enum([
    'receive',
    'dispense',
    'return_to_stock',
    'return_to_wholesaler',
    'adjustment_up',
    'adjustment_down',
    'transfer_out',
    'transfer_in',
    'cycle_count',
  ]),
  quantity: z.number().positive(),
  referenceId: z.string().optional(),
  referenceType: z.enum(['fill', 'order', 'return', 'adjustment', 'transfer']).optional(),
  lotNumber: z.string().optional(),
  expirationDate: z.date().optional(),
  cost: z.number().optional(),
  reason: z.string().optional(),
  userId: z.string().uuid(),
});

export const StockOrderSchema = z.object({
  pharmacyId: z.string().uuid(),
  wholesalerId: z.string(),
  items: z.array(z.object({
    ndc: z.string(),
    drugName: z.string(),
    quantityOrdered: z.number().positive(),
    unit: z.string(),
    unitCost: z.number().nonnegative(),
  })),
});
