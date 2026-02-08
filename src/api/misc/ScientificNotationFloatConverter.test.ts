/**
 * @fileoverview Tests for scientific notation number formatting
 *
 * Verifies correct formatting behavior for small numbers, large numbers,
 * and standard decimal numbers within normal range.
 */
import { describe, expect, it } from 'vitest';
import { formatScientificNotation } from './ScientificNotationFloatConverter';

describe('formatScientificNotation', () => {
  describe('scientific notation for very small numbers', () => {
    it('should format numbers less than 0.001 in scientific notation', () => {
      const result = formatScientificNotation(0.0001);
      expect(result).toMatch(/^1\.?0*e-4$/);
    });

    it('should format very small decimal values in scientific notation', () => {
      const result = formatScientificNotation(0.000123);
      expect(result).toContain('e-');
    });

    it('should format negative very small numbers in scientific notation', () => {
      const result = formatScientificNotation(-0.0005);
      expect(result).toMatch(/-5\.?0*e-4$/);
    });
  });

  describe('scientific notation for very large numbers', () => {
    it('should format numbers >= 10000 in scientific notation', () => {
      const result = formatScientificNotation(10000);
      expect(result).toMatch(/^1\.?0*e\+4$/);
    });

    it('should format large numbers in scientific notation', () => {
      const result = formatScientificNotation(12345);
      expect(result).toContain('e+');
    });

    it('should format negative large numbers in scientific notation', () => {
      const result = formatScientificNotation(-50000);
      expect(result).toMatch(/-5\.?0*e\+4$/);
    });
  });

  describe('standard notation for normal numbers', () => {
    it('should use standard notation for numbers >= 0.001 and < 10000', () => {
      expect(formatScientificNotation(0.001)).toBe('0.001');
    });

    it('should use standard notation for small positive numbers', () => {
      expect(formatScientificNotation(1.5)).toBe('1.5');
    });

    it('should use standard notation for medium numbers', () => {
      expect(formatScientificNotation(123.45)).toBe('123.45');
    });

    it('should use standard notation for numbers just below 10000', () => {
      expect(formatScientificNotation(9999)).toBe('9999');
    });

    it('should use standard notation for negative normal numbers', () => {
      expect(formatScientificNotation(-50.5)).toBe('-50.5');
    });
  });

  describe('edge cases', () => {
    it('should handle zero', () => {
      // Zero falls into the "< 0.001" category and is formatted as exponential
      expect(formatScientificNotation(0)).toMatch(/^0(\.0*)?e\+0$/);
    });

    it('should handle exactly 0.001', () => {
      expect(formatScientificNotation(0.001)).toBe('0.001');
    });

    it('should handle exactly -0.001', () => {
      expect(formatScientificNotation(-0.001)).toBe('-0.001');
    });

    it('should handle exactly 9999.99', () => {
      expect(formatScientificNotation(9999.99)).toBe('9999.99');
    });

    it('should handle exactly -9999.99', () => {
      expect(formatScientificNotation(-9999.99)).toBe('-9999.99');
    });
  });
});
