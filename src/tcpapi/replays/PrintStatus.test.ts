/**
 * @fileoverview Tests for PrintStatus parser including M27 response parsing and progress calculation.
 */
import { describe, it, expect } from 'vitest';
import { PrintStatus } from './PrintStatus';

describe('PrintStatus', () => {
  describe('fromReplay', () => {
    const validM27Response = `CMD M27 Received.
SD printing byte 12345/67890
Layer: 10/250`;

    it('should parse a valid M27 response correctly', () => {
      const printStatus = new PrintStatus();
      const result = printStatus.fromReplay(validM27Response);

      expect(result).not.toBeNull();
      expect(result?._sdCurrent).toBe('12345');
      expect(result?._sdTotal).toBe('67890');
      expect(result?._layerCurrent).toBe('10');
      expect(result?._layerTotal).toBe('250');
    });

    it('should calculate print percent correctly', () => {
      const printStatus = new PrintStatus();
      printStatus.fromReplay(validM27Response);

      expect(printStatus.getPrintPercent()).toBe(4); // 10/250 * 100 = 4
    });

    it('should handle 50% progress', () => {
      const response = `CMD M27 Received.
SD printing byte 50000/100000
Layer: 125/250`;

      const printStatus = new PrintStatus();
      printStatus.fromReplay(response);

      expect(printStatus.getPrintPercent()).toBe(50);
    });

    it('should handle 100% progress', () => {
      const response = `CMD M27 Received.
SD printing byte 67890/67890
Layer: 250/250`;

      const printStatus = new PrintStatus();
      printStatus.fromReplay(response);

      expect(printStatus.getPrintPercent()).toBe(100);
    });

    it('should handle 0% progress', () => {
      const response = `CMD M27 Received.
SD printing byte 0/67890
Layer: 0/250`;

      const printStatus = new PrintStatus();
      printStatus.fromReplay(response);

      expect(printStatus.getPrintPercent()).toBe(0);
    });

    it('should clamp values above 100%', () => {
      const response = `CMD M27 Received.
SD printing byte 100000/67890
Layer: 300/250`;

      const printStatus = new PrintStatus();
      printStatus.fromReplay(response);

      const percent = printStatus.getPrintPercent();
      expect(percent).toBe(100);
    });

    it('should return NaN when total layers is 0', () => {
      const response = `CMD M27 Received.
SD printing byte 0/0
Layer: 0/0`;

      const printStatus = new PrintStatus();
      printStatus.fromReplay(response);

      expect(printStatus.getPrintPercent()).toBeNaN();
    });

    it('should return layer progress string', () => {
      const printStatus = new PrintStatus();
      printStatus.fromReplay(validM27Response);

      expect(printStatus.getLayerProgress()).toBe('10/250');
    });

    it('should return SD progress string', () => {
      const printStatus = new PrintStatus();
      printStatus.fromReplay(validM27Response);

      expect(printStatus.getSdProgress()).toBe('12345/67890');
    });

    it('should return null for missing layer data', () => {
      const response = `CMD M27 Received.
SD printing byte 12345/67890`;

      const printStatus = new PrintStatus();
      const result = printStatus.fromReplay(response);

      expect(result).toBeNull();
    });

    it('should return null for malformed layer data', () => {
      const response = `CMD M27 Received.
SD printing byte 12345/67890
Layer: invalid`;

      const printStatus = new PrintStatus();
      const result = printStatus.fromReplay(response);

      expect(result).toBeNull();
    });

    it('should handle extra whitespace', () => {
      const response = `CMD M27 Received.
SD printing byte   12345  /  67890
Layer:   10  /  250  `;

      const printStatus = new PrintStatus();
      const result = printStatus.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?._sdCurrent).toBe('12345');
      expect(result?._sdTotal).toBe('67890');
      expect(result?._layerCurrent).toBe('10');
      expect(result?._layerTotal).toBe('250');
    });

    it('should handle large file sizes', () => {
      const response = `CMD M27 Received.
SD printing byte 999999999/1234567890
Layer: 1000/5000`;

      const printStatus = new PrintStatus();
      const result = printStatus.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?._sdCurrent).toBe('999999999');
      expect(result?._sdTotal).toBe('1234567890');
      expect(printStatus.getPrintPercent()).toBe(20); // 1000/5000 * 100 = 20
    });
  });
});
