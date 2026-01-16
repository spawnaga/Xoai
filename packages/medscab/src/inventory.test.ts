import { describe, it, expect } from 'vitest';
import {
  normalizeNDC,
  formatNDC,
  isValidNDCFormat,
  parseNDC,
  calculateAvailableQuantity,
  needsReorder,
  calculateOrderQuantity,
  isExpiringSoon,
  isExpired,
  generateReorderList,
  calculateInventoryValue,
  findExpiringInventory,
  createInventoryTransaction,
  validateAdjustment,
  WHOLESALERS,
  type InventoryItem,
} from './inventory';

describe('Inventory Module', () => {
  describe('NDC Utilities', () => {
    describe('normalizeNDC', () => {
      it('should return 11-digit NDC as-is', () => {
        expect(normalizeNDC('12345678901')).toBe('12345678901');
      });

      it('should remove dashes from NDC', () => {
        expect(normalizeNDC('12345-6789-01')).toBe('12345678901');
      });

      it('should remove spaces from NDC', () => {
        expect(normalizeNDC('12345 6789 01')).toBe('12345678901');
      });

      it('should pad 10-digit NDC to 11 digits', () => {
        expect(normalizeNDC('1234567890')).toBe('12345678900');
      });
    });

    describe('formatNDC', () => {
      it('should format 11-digit NDC with dashes (5-4-2)', () => {
        expect(formatNDC('12345678901')).toBe('12345-6789-01');
      });

      it('should normalize and format NDC', () => {
        expect(formatNDC('123456789-01')).toBe('12345-6789-01');
      });

      it('should return original for invalid NDC', () => {
        expect(formatNDC('12345')).toBe('12345');
      });
    });

    describe('isValidNDCFormat', () => {
      it('should validate 11-digit NDC', () => {
        expect(isValidNDCFormat('12345678901')).toBe(true);
      });

      it('should validate 10-digit NDC', () => {
        expect(isValidNDCFormat('1234567890')).toBe(true);
      });

      it('should validate NDC with dashes', () => {
        expect(isValidNDCFormat('12345-6789-01')).toBe(true);
      });

      it('should reject short NDC', () => {
        expect(isValidNDCFormat('12345')).toBe(false);
      });

      it('should reject alpha characters', () => {
        expect(isValidNDCFormat('1234567890A')).toBe(false);
      });
    });

    describe('parseNDC', () => {
      it('should parse NDC into components', () => {
        const result = parseNDC('12345678901');

        expect(result).not.toBeNull();
        expect(result?.labelerCode).toBe('12345');
        expect(result?.productCode).toBe('6789');
        expect(result?.packageCode).toBe('01');
        expect(result?.full).toBe('12345678901');
        expect(result?.formatted).toBe('12345-6789-01');
      });

      it('should return null for invalid NDC', () => {
        expect(parseNDC('12345')).toBeNull();
      });
    });
  });

  describe('Inventory Operations', () => {
    const mockItem: InventoryItem = {
      id: 'INV-001',
      pharmacyId: 'PHARM-001',
      ndc: '12345678901',
      drugName: 'Test Drug',
      manufacturer: 'Test Mfg',
      quantityOnHand: 100,
      quantityAllocated: 20,
      quantityAvailable: 80,
      unit: 'EA',
      reorderPoint: 30,
      parLevel: 100,
      binLocation: 'A-01',
      acquisitionCost: 5.00,
      primaryWholesaler: 'CARDINAL',
      isControlled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('calculateAvailableQuantity', () => {
      it('should calculate QOH minus allocated', () => {
        expect(calculateAvailableQuantity(mockItem)).toBe(80);
      });

      it('should return 0 if allocated exceeds QOH', () => {
        const item = { ...mockItem, quantityOnHand: 10, quantityAllocated: 20 };
        expect(calculateAvailableQuantity(item)).toBe(0);
      });
    });

    describe('needsReorder', () => {
      it('should return true when available <= reorder point', () => {
        const item = { ...mockItem, quantityOnHand: 40, quantityAllocated: 20 };
        expect(needsReorder(item)).toBe(true);
      });

      it('should return false when available > reorder point', () => {
        expect(needsReorder(mockItem)).toBe(false);
      });
    });

    describe('calculateOrderQuantity', () => {
      it('should calculate quantity to reach par level', () => {
        const item = { ...mockItem, quantityOnHand: 30, quantityAllocated: 10 };
        // Available = 20, Par = 100, Order = 80
        expect(calculateOrderQuantity(item)).toBe(80);
      });

      it('should return 0 if above reorder point', () => {
        expect(calculateOrderQuantity(mockItem)).toBe(0);
      });
    });

    describe('isExpiringSoon', () => {
      it('should return true for items expiring within threshold', () => {
        const item = {
          ...mockItem,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
        expect(isExpiringSoon(item, 90)).toBe(true);
      });

      it('should return false for items not expiring soon', () => {
        const item = {
          ...mockItem,
          expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
        };
        expect(isExpiringSoon(item, 90)).toBe(false);
      });

      it('should return false for items without expiration date', () => {
        expect(isExpiringSoon(mockItem)).toBe(false);
      });
    });

    describe('isExpired', () => {
      it('should return true for expired items', () => {
        const item = {
          ...mockItem,
          expirationDate: new Date('2020-01-01'),
        };
        expect(isExpired(item)).toBe(true);
      });

      it('should return false for non-expired items', () => {
        const item = {
          ...mockItem,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };
        expect(isExpired(item)).toBe(false);
      });
    });
  });

  describe('generateReorderList', () => {
    it('should generate reorder list for items below reorder point', () => {
      // QOH - Allocated = Available; needs reorder if Available <= ReorderPoint
      const inventory: InventoryItem[] = [
        createMockItem('001', 'Drug A', 30, 10, 30, 100),  // Available=20, Reorder=30, needs reorder
        createMockItem('002', 'Drug B', 20, 0, 20, 50),    // Available=20, Reorder=20, needs reorder (at point)
        createMockItem('003', 'Drug C', 100, 0, 30, 100),  // Available=100, Reorder=30, above reorder
      ];

      const result = generateReorderList(inventory);

      expect(result).toHaveLength(2);
      expect(result[0].drugName).toBe('Drug A');
      expect(result[1].drugName).toBe('Drug B');
    });

    it('should sort by priority (highest first)', () => {
      const inventory: InventoryItem[] = [
        createMockItem('001', 'Drug A', 30, 10, 30, 100), // Available: 20, below reorder point
        createMockItem('002', 'Drug B', 30, 30, 30, 100), // Available: 0, out of stock
      ];

      const result = generateReorderList(inventory);

      expect(result[0].drugName).toBe('Drug B'); // Out of stock = highest priority
      expect(result[0].priority).toBe(10);
    });

    it('should calculate estimated cost', () => {
      // Available = QOH - Allocated = 10 - 0 = 10
      // Order quantity = Par - Available = 100 - 10 = 90
      // Estimated cost = 90 * $5 = $450
      const inventory: InventoryItem[] = [
        createMockItem('001', 'Drug A', 10, 0, 30, 100, 5.00), // Available=10, need 90 @ $5 = $450
      ];

      const result = generateReorderList(inventory);

      expect(result[0].estimatedCost).toBe(450);
    });
  });

  describe('calculateInventoryValue', () => {
    it('should calculate total inventory value', () => {
      const inventory: InventoryItem[] = [
        createMockItem('001', 'Drug A', 100, 0, 30, 100, 5.00), // 100 * $5 = $500
        createMockItem('002', 'Drug B', 50, 0, 20, 50, 10.00),  // 50 * $10 = $500
      ];

      const result = calculateInventoryValue(inventory);

      expect(result.totalValue).toBe(1000);
      expect(result.totalItems).toBe(2);
      expect(result.totalUnits).toBe(150);
      expect(result.averageValuePerItem).toBe(500);
    });

    it('should handle empty inventory', () => {
      const result = calculateInventoryValue([]);

      expect(result.totalValue).toBe(0);
      expect(result.averageValuePerItem).toBe(0);
    });
  });

  describe('findExpiringInventory', () => {
    it('should find items expiring within threshold', () => {
      const futureDate30 = new Date();
      futureDate30.setDate(futureDate30.getDate() + 30);

      const futureDate180 = new Date();
      futureDate180.setDate(futureDate180.getDate() + 180);

      const inventory: InventoryItem[] = [
        { ...createMockItem('001', 'Drug A', 100, 0, 30, 100), expirationDate: futureDate30 },
        { ...createMockItem('002', 'Drug B', 50, 0, 20, 50), expirationDate: futureDate180 },
      ];

      const result = findExpiringInventory(inventory, 90);

      expect(result).toHaveLength(1);
      expect(result[0].drugName).toBe('Drug A');
      expect(result[0].daysUntilExpiration).toBeLessThanOrEqual(30);
    });

    it('should identify already expired items', () => {
      const pastDate = new Date('2020-01-01');

      const inventory: InventoryItem[] = [
        { ...createMockItem('001', 'Drug A', 100, 0, 30, 100), expirationDate: pastDate },
      ];

      const result = findExpiringInventory(inventory);

      expect(result).toHaveLength(1);
      expect(result[0].isExpired).toBe(true);
    });

    it('should sort by expiration date (soonest first)', () => {
      const date30 = new Date();
      date30.setDate(date30.getDate() + 30);

      const date60 = new Date();
      date60.setDate(date60.getDate() + 60);

      const inventory: InventoryItem[] = [
        { ...createMockItem('001', 'Drug B', 50, 0, 20, 50), expirationDate: date60 },
        { ...createMockItem('002', 'Drug A', 100, 0, 30, 100), expirationDate: date30 },
      ];

      const result = findExpiringInventory(inventory, 90);

      expect(result[0].drugName).toBe('Drug A'); // Expires sooner
    });
  });

  describe('createInventoryTransaction', () => {
    const mockItem: InventoryItem = createMockItem('001', 'Drug A', 100, 0, 30, 100);

    it('should create receive transaction with increased balance', () => {
      const txn = createInventoryTransaction(mockItem, 'receive', 50, 'user-001');

      expect(txn.transactionType).toBe('receive');
      expect(txn.quantity).toBe(50);
      expect(txn.runningBalance).toBe(150);
    });

    it('should create dispense transaction with decreased balance', () => {
      const txn = createInventoryTransaction(mockItem, 'dispense', 30, 'user-001');

      expect(txn.transactionType).toBe('dispense');
      expect(txn.quantity).toBe(30);
      expect(txn.runningBalance).toBe(70);
    });

    it('should create adjustment transaction', () => {
      const txn = createInventoryTransaction(mockItem, 'cycle_count', 95, 'user-001');

      expect(txn.transactionType).toBe('cycle_count');
      expect(txn.runningBalance).toBe(95);
    });

    it('should not allow negative balance', () => {
      const txn = createInventoryTransaction(mockItem, 'dispense', 150, 'user-001');

      expect(txn.runningBalance).toBe(0);
    });

    it('should include optional fields', () => {
      const txn = createInventoryTransaction(mockItem, 'receive', 50, 'user-001', {
        referenceId: 'ORDER-001',
        referenceType: 'order',
        lotNumber: 'LOT123',
        cost: 250,
      });

      expect(txn.referenceId).toBe('ORDER-001');
      expect(txn.referenceType).toBe('order');
      expect(txn.lotNumber).toBe('LOT123');
      expect(txn.cost).toBe(250);
    });
  });

  describe('validateAdjustment', () => {
    const mockItem: InventoryItem = createMockItem('001', 'Drug A', 100, 0, 30, 100);

    it('should allow valid downward adjustment', () => {
      const result = validateAdjustment(mockItem, 5, 'down');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject adjustment exceeding QOH', () => {
      const result = validateAdjustment(mockItem, 150, 'down');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Only 100 on hand'))).toBe(true);
    });

    it('should warn for large downward adjustment', () => {
      const result = validateAdjustment(mockItem, 20, 'down');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('>10%'))).toBe(true);
    });

    it('should warn for large upward adjustment', () => {
      const item = { ...mockItem, parLevel: 100 };
      const result = validateAdjustment(item, 250, 'up');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Large upward'))).toBe(true);
    });

    it('should warn for controlled substances', () => {
      const controlledItem = { ...mockItem, isControlled: true };
      const result = validateAdjustment(controlledItem, 5, 'down');

      expect(result.warnings.some(w => w.includes('DEA'))).toBe(true);
      expect(result.requiresWitness).toBe(true);
    });
  });

  describe('WHOLESALERS', () => {
    it('should have major wholesalers defined', () => {
      expect(WHOLESALERS.CARDINAL).toBeDefined();
      expect(WHOLESALERS.MCKESSON).toBeDefined();
      expect(WHOLESALERS.AMERISOURCE).toBeDefined();
    });

    it('should have EDI identifiers', () => {
      expect(WHOLESALERS.CARDINAL.ediId).toBe('CAH');
      expect(WHOLESALERS.MCKESSON.ediId).toBe('MCK');
      expect(WHOLESALERS.AMERISOURCE.ediId).toBe('ABC');
    });
  });
});

// Helper function to create mock inventory items
function createMockItem(
  id: string,
  drugName: string,
  qoh: number,
  allocated: number,
  reorderPoint: number,
  parLevel: number,
  acquisitionCost: number = 5.00
): InventoryItem {
  return {
    id: `INV-${id}`,
    pharmacyId: 'PHARM-001',
    ndc: '12345678901',
    drugName,
    manufacturer: 'Test Mfg',
    quantityOnHand: qoh,
    quantityAllocated: allocated,
    quantityAvailable: qoh - allocated,
    unit: 'EA',
    reorderPoint,
    parLevel,
    binLocation: 'A-01',
    acquisitionCost,
    primaryWholesaler: 'CARDINAL',
    isControlled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
