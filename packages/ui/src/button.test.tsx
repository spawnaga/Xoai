import { describe, it, expect } from 'vitest';
import { buttonVariants } from './button';

describe('Button Component', () => {
  describe('buttonVariants', () => {
    it('should generate default variant classes', () => {
      const classes = buttonVariants();

      expect(classes).toContain('inline-flex');
      expect(classes).toContain('items-center');
      expect(classes).toContain('justify-center');
      expect(classes).toContain('bg-primary');
    });

    it('should generate destructive variant classes', () => {
      const classes = buttonVariants({ variant: 'destructive' });

      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('text-destructive-foreground');
    });

    it('should generate outline variant classes', () => {
      const classes = buttonVariants({ variant: 'outline' });

      expect(classes).toContain('border');
      expect(classes).toContain('bg-background');
    });

    it('should generate secondary variant classes', () => {
      const classes = buttonVariants({ variant: 'secondary' });

      expect(classes).toContain('bg-secondary');
      expect(classes).toContain('text-secondary-foreground');
    });

    it('should generate ghost variant classes', () => {
      const classes = buttonVariants({ variant: 'ghost' });

      expect(classes).toContain('hover:bg-accent');
    });

    it('should generate link variant classes', () => {
      const classes = buttonVariants({ variant: 'link' });

      expect(classes).toContain('text-primary');
      expect(classes).toContain('underline-offset-4');
    });

    it('should generate default size classes', () => {
      const classes = buttonVariants();

      expect(classes).toContain('h-9');
      expect(classes).toContain('px-4');
    });

    it('should generate small size classes', () => {
      const classes = buttonVariants({ size: 'sm' });

      expect(classes).toContain('h-8');
      expect(classes).toContain('px-3');
      expect(classes).toContain('text-xs');
    });

    it('should generate large size classes', () => {
      const classes = buttonVariants({ size: 'lg' });

      expect(classes).toContain('h-10');
      expect(classes).toContain('px-8');
    });

    it('should generate icon size classes', () => {
      const classes = buttonVariants({ size: 'icon' });

      expect(classes).toContain('h-9');
      expect(classes).toContain('w-9');
    });

    it('should combine variant and size', () => {
      const classes = buttonVariants({
        variant: 'destructive',
        size: 'lg',
      });

      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('h-10');
      expect(classes).toContain('px-8');
    });

    it('should include custom className', () => {
      const classes = buttonVariants({
        variant: 'default',
        className: 'my-custom-class',
      });

      expect(classes).toContain('my-custom-class');
    });

    it('should include disabled styling in base classes', () => {
      const classes = buttonVariants();

      expect(classes).toContain('disabled:pointer-events-none');
      expect(classes).toContain('disabled:opacity-50');
    });

    it('should include focus styling', () => {
      const classes = buttonVariants();

      expect(classes).toContain('focus-visible:outline-none');
      expect(classes).toContain('focus-visible:ring-1');
    });
  });
});
