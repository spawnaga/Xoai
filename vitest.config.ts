import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types.ts',
      ],
    },
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@xoai/healthcare-fhir': path.resolve(__dirname, './packages/healthcare/fhir/src'),
      '@xoai/healthcare-hl7': path.resolve(__dirname, './packages/healthcare/hl7/src'),
      '@xoai/healthcare-cda': path.resolve(__dirname, './packages/healthcare/cda/src'),
      '@xoai/healthcare-terminology': path.resolve(__dirname, './packages/healthcare/terminology/src'),
      '@xoai/healthcare-compliance': path.resolve(__dirname, './packages/healthcare/compliance/src'),
      '@xoai/db': path.resolve(__dirname, './packages/db/src'),
      '@xoai/api': path.resolve(__dirname, './packages/api/src'),
      '@xoai/auth': path.resolve(__dirname, './packages/auth/src'),
      '@xoai/ui': path.resolve(__dirname, './packages/ui/src'),
      '@xoai/ai': path.resolve(__dirname, './packages/ai/src'),
    },
  },
});
