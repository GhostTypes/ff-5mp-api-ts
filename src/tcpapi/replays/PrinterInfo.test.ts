/**
 * @fileoverview Tests for PrinterInfo parser including M115 response parsing and printer metadata extraction.
 */
import { describe, expect, it } from 'vitest';
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

    it('should return null when machine type is missing', () => {
      const invalidResponse = `CMD M115 Received.
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

    it('should handle blank lines in response (Adventurer 3C Pro format)', () => {
      const response = `CMD M115 Received.
Machine Type: FlashForge Adventurer III Pro
Machine Name:  CowaPrint

Firmware: v2.1.2
SN: SNCCCA95105901
X: 150 Y: 150 Z: 150
Tool Count: 1
Mac Address:88:A9:A7:92:DE:72

ok`;

      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.TypeName).toBe('FlashForge Adventurer III Pro');
      expect(result?.Name).toBe('CowaPrint');
      expect(result?.FirmwareVersion).toBe('v2.1.2');
      expect(result?.SerialNumber).toBe('SNCCCA95105901');
      expect(result?.Dimensions).toBe('X: 150 Y: 150 Z: 150');
      expect(result?.ToolCount).toBe('1');
      expect(result?.MacAddress).toBe('88:A9:A7:92:DE:72');
    });

    it('should handle Serial Number: prefix variant', () => {
      const response = `CMD M115 Received.
Machine Type: FlashForge Adventurer 3
Machine Name: MyPrinter
Firmware: V1.0.0
Serial Number: SN12345
X:150 Y:150 Z:150
Tool count: 1
Mac Address: AA:BB:CC:DD:EE:FF`;

      const printerInfo = new PrinterInfo();
      const result = printerInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.SerialNumber).toBe('SN12345');
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
