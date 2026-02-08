/**
 * @fileoverview Tests for Temperature class
 *
 * Verifies temperature value storage, retrieval, and string conversion
 * for positive, negative, zero, and decimal values.
 */
import { Temperature } from './Temperature';

describe('Temperature', () => {
  describe('constructor and getValue', () => {
    it('should store and retrieve positive temperature values', () => {
      const temp = new Temperature(25.5);
      expect(temp.getValue()).toBe(25.5);
    });

    it('should store and retrieve negative temperature values', () => {
      const temp = new Temperature(-10.2);
      expect(temp.getValue()).toBe(-10.2);
    });

    it('should store and retrieve zero temperature', () => {
      const temp = new Temperature(0);
      expect(temp.getValue()).toBe(0);
    });

    it('should store and retrieve high temperature values', () => {
      const temp = new Temperature(250);
      expect(temp.getValue()).toBe(250);
    });
  });

  describe('toString', () => {
    it('should convert positive temperature to string', () => {
      const temp = new Temperature(25.5);
      expect(temp.toString()).toBe('25.5');
    });

    it('should convert negative temperature to string', () => {
      const temp = new Temperature(-10.2);
      expect(temp.toString()).toBe('-10.2');
    });

    it('should convert zero temperature to string', () => {
      const temp = new Temperature(0);
      expect(temp.toString()).toBe('0');
    });

    it('should convert integer temperature to string', () => {
      const temp = new Temperature(200);
      expect(temp.toString()).toBe('200');
    });

    it('should handle very precise decimal values', () => {
      const temp = new Temperature(27.123456);
      expect(temp.toString()).toBe('27.123456');
    });
  });
});
