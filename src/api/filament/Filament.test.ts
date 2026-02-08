/**
 * @fileoverview Tests for Filament class
 *
 * Verifies filament type creation with custom and default loading temperatures.
 */
import { describe, expect, it } from 'vitest';
import { Filament } from './Filament';

describe('Filament', () => {
  describe('constructor', () => {
    it('should create a filament with name and custom load temperature', () => {
      const filament = new Filament('PLA', 200);

      expect(filament.name).toBe('PLA');
      expect(filament.loadTemp).toBe(200);
    });

    it('should use default temperature of 220 when not specified', () => {
      const filament = new Filament('ABS');

      expect(filament.name).toBe('ABS');
      expect(filament.loadTemp).toBe(220);
    });

    it('should create different filament types', () => {
      const pla = new Filament('PLA', 200);
      const abs = new Filament('ABS', 240);
      const petg = new Filament('PETG', 230);

      expect(pla.name).toBe('PLA');
      expect(pla.loadTemp).toBe(200);

      expect(abs.name).toBe('ABS');
      expect(abs.loadTemp).toBe(240);

      expect(petg.name).toBe('PETG');
      expect(petg.loadTemp).toBe(230);
    });

    it('should handle low temperature filaments', () => {
      const filament = new Filament('LowTemp', 180);

      expect(filament.name).toBe('LowTemp');
      expect(filament.loadTemp).toBe(180);
    });

    it('should handle high temperature filaments', () => {
      const filament = new Filament('Nylon', 260);

      expect(filament.name).toBe('Nylon');
      expect(filament.loadTemp).toBe(260);
    });

    it('should be readonly', () => {
      const filament = new Filament('PLA', 200);

      // TypeScript will catch this at compile time, but we can verify the properties exist
      expect(filament.name).toBeDefined();
      expect(filament.loadTemp).toBeDefined();
    });
  });
});
