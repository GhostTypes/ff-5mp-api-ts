/**
 * @fileoverview Tests for PrinterInfo parser including M115 response parsing and printer metadata extraction.
 */
import { describe, it, expect } from 'vitest';
import { PrinterInfo } from './PrinterInfo';

describe('PrinterInfo', () => {
  describe('fromReplay', () => {
    const validM115Response = `CMD M115 Received.
Machine Type: Adventurer 5M Pro
Machine Name: MyPrinter
Firmware: V1.2.3
SN: SN123456789
X:220 Y:220 Z:220
Tool count: 1
Mac Address: AA:BB:CC:DD:EE:FF`;

    it('should parse a valid M115 response correctly', () => {
      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(validM115Response);

      expect(result).not.toBeNull();
      expect(result?.TypeName).toBe('Adventurer 5M Pro');
      expect(result?.Name).toBe('MyPrinter');
      expect(result?.FirmwareVersion).toBe('V1.2.3');
      expect(result?.SerialNumber).toBe('SN123456789');
      expect(result?.Dimensions).toBe('X:220 Y:220 Z:220');
      expect(result?.ToolCount).toBe('1');
      expect(result?.MacAddress).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('should handle different machine types', () => {
      const response = `CMD M115 Received.
Machine Type: FlashForge Adventurer 5M
Machine Name: TestPrinter
Firmware: V2.0.0
SN: SN987654321
X:300 Y:300 Z:300
Tool count: 2
Mac Address: 11:22:33:44:55:66`;

      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.TypeName).toBe('FlashForge Adventurer 5M');
      expect(result?.ToolCount).toBe('2');
    });

    it('should return null for empty string', () => {
      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay('');

      expect(result).toBeNull();
    });

    it('should return null for invalid response with missing lines', () => {
      const invalidResponse = `CMD M115 Received.
Machine Type: Adventurer 5M Pro`;

      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(invalidResponse);

      expect(result).toBeNull();
    });

    it('should return null when machine type line is malformed', () => {
      const invalidResponse = `CMD M115 Received.
InvalidLine
Machine Name: MyPrinter
Firmware: V1.2.3
SN: SN123456789
X:220 Y:220 Z:220
Tool count: 1
Mac Address: AA:BB:CC:DD:EE:FF`;

      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(invalidResponse);

      expect(result).toBeNull();
    });

    it('should handle extra whitespace in values', () => {
      const response = `CMD M115 Received.
Machine Type:   Adventurer 5M Pro
Machine Name:  MyPrinter
Firmware:  V1.2.3
SN:  SN123456789
  X:220 Y:220 Z:220
Tool count:  1
Mac Address:  AA:BB:CC:DD:EE:FF  `;

      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.TypeName).toBe('Adventurer 5M Pro');
      expect(result?.Name).toBe('MyPrinter');
      expect(result?.MacAddress).toBe('AA:BB:CC:DD:EE:FF');
    });
  });

  describe('toString', () => {
    it('should format printer info correctly', () => {
      const printerInfo = new PrinterInfo();
      printerInfo.TypeName = 'Adventurer 5M Pro';
      printerInfo.Name = 'MyPrinter';
      printerInfo.FirmwareVersion = 'V1.2.3';
      printerInfo.SerialNumber = 'SN123456789';
      printerInfo.Dimensions = 'X:220 Y:220 Z:220';
      printerInfo.ToolCount = '1';
      printerInfo.MacAddress = 'AA:BB:CC:DD:EE:FF';

      const result = printerInfo.toString();

      expect(result).toContain('Printer Type: Adventurer 5M Pro');
      expect(result).toContain('Name: MyPrinter');
      expect(result).toContain('Firmware: V1.2.3');
      expect(result).toContain('Serial Number: SN123456789');
      expect(result).toContain('Print Dimensions: X:220 Y:220 Z:220');
      expect(result).toContain('Tool Count: 1');
      expect(result).toContain('MAC Address: AA:BB:CC:DD:EE:FF');
    });
  });
});
