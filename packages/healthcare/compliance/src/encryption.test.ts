import { describe, it, expect, vi } from 'vitest';
import { encryptPHI, decryptPHI, hashPHI } from './encryption';

describe('HIPAA Encryption', () => {
  const testEncryptionKey = 'test-encryption-key-32-bytes-ok';
  const sensitiveData = 'Patient SSN: 123-45-6789';

  describe('encryptPHI', () => {
    it('should encrypt data and return encrypted structure', async () => {
      const result = await encryptPHI(sensitiveData, testEncryptionKey);

      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(result.authTag).toBeDefined();
    });

    it('should produce different output for same input (due to random IV)', async () => {
      const result1 = await encryptPHI(sensitiveData, testEncryptionKey);
      const result2 = await encryptPHI(sensitiveData, testEncryptionKey);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle empty string', async () => {
      const result = await encryptPHI('', testEncryptionKey);

      expect(result.encrypted).toBeDefined();
    });

    it('should handle long data', async () => {
      const longData = 'A'.repeat(10000);
      const result = await encryptPHI(longData, testEncryptionKey);

      expect(result.encrypted.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const specialData = 'Name: José García\nAddress: 123 Main St\n日本語テスト';
      const result = await encryptPHI(specialData, testEncryptionKey);

      expect(result.encrypted).toBeDefined();
    });
  });

  describe('decryptPHI', () => {
    it('should decrypt data back to original', async () => {
      const encrypted = await encryptPHI(sensitiveData, testEncryptionKey);
      const decrypted = await decryptPHI(encrypted, testEncryptionKey);

      expect(decrypted).toBe(sensitiveData);
    });

    it('should handle empty string', async () => {
      const encrypted = await encryptPHI('', testEncryptionKey);
      const decrypted = await decryptPHI(encrypted, testEncryptionKey);

      expect(decrypted).toBe('');
    });

    it('should decrypt special characters correctly', async () => {
      const specialData = 'Prescription: Céftriaxone 1g IV q24h';
      const encrypted = await encryptPHI(specialData, testEncryptionKey);
      const decrypted = await decryptPHI(encrypted, testEncryptionKey);

      expect(decrypted).toBe(specialData);
    });
  });

  describe('hashPHI', () => {
    it('should produce consistent hash for same input', async () => {
      const hash1 = await hashPHI('test data');
      const hash2 = await hashPHI('test data');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', async () => {
      const hash1 = await hashPHI('test data 1');
      const hash2 = await hashPHI('test data 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return hex string', async () => {
      const hash = await hashPHI('test');

      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should handle empty string', async () => {
      const hash = await hashPHI('');

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('encryption roundtrip', () => {
    it('should encrypt and decrypt various PHI data types', async () => {
      const testCases = [
        'SSN: 123-45-6789',
        'DOB: 1990-05-15',
        'Medical Record #: MRN-12345',
        'Diagnosis: Hypertension, Type 2 Diabetes',
        'Medication: Metformin 500mg BID',
        'Insurance ID: BCBS-987654321',
      ];

      for (const testData of testCases) {
        const encrypted = await encryptPHI(testData, testEncryptionKey);
        const decrypted = await decryptPHI(encrypted, testEncryptionKey);
        expect(decrypted).toBe(testData);
      }
    });

    it('should work with different key lengths', async () => {
      const shortKey = 'short';
      const encrypted = await encryptPHI(sensitiveData, shortKey);
      const decrypted = await decryptPHI(encrypted, shortKey);

      expect(decrypted).toBe(sensitiveData);
    });
  });
});
