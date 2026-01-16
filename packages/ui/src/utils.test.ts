import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('UI Utils', () => {
  describe('cn (className merge)', () => {
    it('should merge simple class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;

      const result = cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled'
      );

      expect(result).toBe('base-class active');
    });

    it('should handle undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle objects', () => {
      const result = cn({
        'text-red-500': true,
        'text-blue-500': false,
        'font-bold': true,
      });

      expect(result).toContain('text-red-500');
      expect(result).toContain('font-bold');
      expect(result).not.toContain('text-blue-500');
    });

    it('should merge conflicting Tailwind classes', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle complex nested inputs', () => {
      const result = cn(
        'base',
        ['flex', 'items-center'],
        {
          'justify-center': true,
          hidden: false,
        },
        undefined,
        'p-4'
      );

      expect(result).toContain('base');
      expect(result).toContain('flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-center');
      expect(result).toContain('p-4');
      expect(result).not.toContain('hidden');
    });

    it('should handle Tailwind modifier conflicts', () => {
      const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
      expect(result).toBe('hover:bg-blue-500');
    });

    it('should preserve order for non-conflicting classes', () => {
      const result = cn('rounded-lg', 'shadow-md', 'border');
      expect(result).toBe('rounded-lg shadow-md border');
    });
  });
});
