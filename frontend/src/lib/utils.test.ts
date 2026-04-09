import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should merge Tailwind classes with proper precedence', () => {
      // Later classes should override earlier ones
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should handle arrays of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects with boolean values', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle complex mixed inputs', () => {
      const result = cn(
        'base-class',
        { 'conditional-class': true, 'skipped-class': false },
        ['array-class-1', 'array-class-2'],
        undefined,
        'final-class'
      );
      expect(result).toBe('base-class conditional-class array-class-1 array-class-2 final-class');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle Tailwind responsive classes', () => {
      expect(cn('sm:px-2', 'md:px-4', 'lg:px-6')).toBe('sm:px-2 md:px-4 lg:px-6');
    });

    it('should merge conflicting Tailwind utilities correctly', () => {
      // Test that twMerge handles Tailwind conflicts
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
      expect(cn('bg-white', 'bg-black')).toBe('bg-black');
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('should preserve non-conflicting Tailwind utilities', () => {
      expect(cn('text-red-500', 'bg-blue-500', 'p-4')).toContain('text-red-500');
      expect(cn('text-red-500', 'bg-blue-500', 'p-4')).toContain('bg-blue-500');
      expect(cn('text-red-500', 'bg-blue-500', 'p-4')).toContain('p-4');
    });
  });
});
