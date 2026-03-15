/**
 * @fileoverview Unit tests for FlashForge Adventurer 4 TCP client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashForgeA4Client } from './FlashForgeA4Client';
import { PrintStatus } from './replays/PrintStatus';
import { TempInfo } from './replays/TempInfo';

describe('FlashForgeA4Client', () => {
  let client: FlashForgeA4Client;

  beforeEach(() => {
    client = new FlashForgeA4Client('192.168.1.110');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection', () => {
    it('should use port 8899', () => {
      expect(client['port']).toBe(8899);
    });

    it('should initialize connection with the documented M601 flow', async () => {
      const sendCommandSpy = vi.spyOn(client, 'sendCommandAsync');
      vi.spyOn(client, 'startKeepAlive').mockImplementation(() => {});
      sendCommandSpy
        .mockResolvedValueOnce('CMD M601 Received.\nok\n')
        .mockResolvedValueOnce([
          'CMD M115 Received.',
          'Machine Type: Flashforge Adventurer 4',
          'Machine Name: Shop Printer',
          'Firmware: v2.0.5 20220527',
          'X: 220 Y: 200 Z: 250',
          'Tool Count: 1',
          'Mac Address: 00:11:22:33:44:55',
          'ok',
        ].join('\n'));

      await expect(client.initControl()).resolves.toBe(true);
      expect(sendCommandSpy).toHaveBeenNthCalledWith(1, '~M601');
      expect(sendCommandSpy).toHaveBeenNthCalledWith(2, '~M115');
    });

    it('should handle already connected state gracefully', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('Error: have been connected\n');

      await expect(client.initControl()).resolves.toBe(true);
    });
  });

  describe('Printer Information', () => {
    it('should parse the documented Lite M115 response format', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue([
        'CMD M115 Received.',
        'Machine Type: Flashforge Adventurer 4',
        'Machine Name: Lite Printer',
        'Firmware: v2.0.5 20220527',
        'X: 220 Y: 200 Z: 250',
        'Tool Count: 1',
        'Mac Address: 00:11:22:33:44:55',
        'ok',
      ].join('\n'));

      const info = await client.getPrinterInfo();

      expect(info).not.toBeNull();
      expect(info?.machineType).toBe('Flashforge Adventurer 4');
      expect(info?.machineName).toBe('Lite Printer');
      expect(info?.firmware).toBe('v2.0.5 20220527');
      expect(info?.serialNumber).toBeNull();
      expect(info?.buildVolume).toEqual({ x: 220, y: 200, z: 250 });
      expect(info?.toolCount).toBe(1);
      expect(info?.macAddress).toBe('00:11:22:33:44:55');
      expect(info?.variant).toBe('lite');
    });

    it('should parse the documented Pro M115 response format', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue([
        'CMD M115 Received.',
        'Machine Type: Flashforge Adventurer 4 Pro',
        'Machine Name: Pro Printer',
        'Firmware: v1.2.1 20230906',
        'X: 220 Y: 200 Z: 250',
        'Tool Count: 1',
        'Mac Address: 66:55:44:33:22:11',
        'ok',
      ].join('\n'));

      const info = await client.getPrinterInfo();

      expect(info).not.toBeNull();
      expect(info?.variant).toBe('pro');
      expect(info?.firmware).toBe('v1.2.1 20230906');
    });

    it('should accept optional serial numbers when firmware reports them', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue([
        'CMD M115 Received.',
        'Machine Type: Flashforge Adventurer 4',
        'Machine Name: Serial Printer',
        'Firmware: v2.0.5 20220527',
        'Serial Number: A4SN12345',
        'X: 220 Y: 200 Z: 250',
        'Tool Count: 1',
        'Mac Address: 00:11:22:33:44:55',
        'ok',
      ].join('\n'));

      const info = await client.getPrinterInfo();

      expect(info?.serialNumber).toBe('A4SN12345');
    });
  });

  describe('Status Parsers', () => {
    it('should parse documented M105 responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue([
        'CMD M105 Received.',
        'T0:185/200 B:60/60',
        'ok',
      ].join('\n'));

      const tempInfo = await client.getTempInfo();

      expect(tempInfo).toBeInstanceOf(TempInfo);
      expect(tempInfo?.getExtruderTemp()?.getCurrent()).toBe(185);
      expect(tempInfo?.getExtruderTemp()?.getSet()).toBe(200);
      expect(tempInfo?.getBedTemp()?.getCurrent()).toBe(60);
      expect(tempInfo?.getBedTemp()?.getSet()).toBe(60);
    });

    it('should parse M27 progress responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue([
        'CMD M27 Received.',
        'SD printing byte 45/100',
        'ok',
      ].join('\n'));

      const status = await client.getPrintStatus();

      expect(status).toBeInstanceOf(PrintStatus);
      expect(status?.getSdProgress()).toBe('45/100');
      expect(status?.getPrintPercent()).toBe(45);
    });
  });

  describe('File Operations', () => {
    it('should normalize generic file listings into typed entries', async () => {
      vi.spyOn(client, 'getFileListAsync').mockResolvedValue([
        'benchy.gcode',
        '[FLASH]/cube.gx',
      ]);

      await expect(client.listFiles()).resolves.toEqual([
        { name: 'benchy.gcode', path: '/data/benchy.gcode' },
        { name: 'cube.gx', path: '/data/[FLASH]/cube.gx' },
      ]);
    });
  });
});
