// Vitest setup file
// This runs before each test file

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  // Setup that runs once before all tests
  console.log('Starting test suite...');
});

afterAll(() => {
  // Cleanup that runs once after all tests
  console.log('Test suite completed.');
});

// Mock crypto for Node.js environment (for encryption tests)
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error - crypto polyfill for tests
  globalThis.crypto = {
    subtle: {
      importKey: async () => ({}),
      encrypt: async () => new ArrayBuffer(32),
      decrypt: async () => new TextEncoder().encode('decrypted'),
      digest: async () => new ArrayBuffer(32),
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  };
}
