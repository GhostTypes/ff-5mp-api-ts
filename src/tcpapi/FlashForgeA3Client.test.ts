/**
 * @fileoverview Unit tests for FlashForge Adventurer 3 TCP client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashForgeA3Client } from './FlashForgeA3Client';
import { A3GCodeController } from './client/A3GCodeController';
import { PrintStatus } from './replays/PrintStatus';
import { TempInfo } from './replays/TempInfo';

describe('FlashForgeA3Client', () => {
  let client: FlashForgeA3Client;

  beforeEach(() => {
    client = new FlashForgeA3Client('192.168.1.100');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection', () => {
    it('should use port 8899', () => {
      expect(client['port']).toBe(8899);
    });

    it('should initialize connection with M601 S1', async () => {
      const sendCommandSpy = vi.spyOn(client, 'sendCommandAsync');
      sendCommandSpy.mockResolvedValue('CMD M601 Received.\nok\n');

      const result = await client.initControl();

      expect(sendCommandSpy).toHaveBeenCalledWith('~M601 S1');
      expect(result).toBe(true);
    });

    it('should handle already connected state gracefully', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('Error: have been connected\n');

      await expect(client.initControl()).resolves.toBe(true);
    });
  });

  describe('Printer Information', () => {
    it('should parse the documented M115 response format', async () => {
      const mockResponse = [
        'echo: Machine Type: FlashForge Adventurer III',
        'Machine Name: MyPrinter',
        'Firmware: v1.3.7',
        'Serial Number: SNADVA3M12345',
        'X: 150 Y: 150 Z: 150',
        'Tool Count: 1',
        'Mac Address:00:11:22:33:44:55',
        '',
      ].join('\n');
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(mockResponse);

      const info = await client.getPrinterInfo();

      expect(info).not.toBeNull();
      expect(info?.machineType).toBe('FlashForge Adventurer III');
      expect(info?.machineName).toBe('MyPrinter');
      expect(info?.firmware).toBe('v1.3.7');
      expect(info?.serialNumber).toBe('SNADVA3M12345');
      expect(info?.buildVolume).toEqual({ x: 150, y: 150, z: 150 });
      expect(info?.toolCount).toBe(1);
      expect(info?.macAddress).toBe('00:11:22:33:44:55');
    });

    it('should return null on invalid M115 data', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('invalid response');

      await expect(client.getPrinterInfo()).resolves.toBeNull();
    });

    it('should parse SN-prefixed serial numbers and blank lines in M115', async () => {
      const mockResponse = [
        'echo: Machine Type: FlashForge Adventurer III',
        'Machine Name: MyPrinter',
        '',
        'Firmware: v1.3.7',
        'SN: SNADVA3M12345',
        'X: 150 Y: 150 Z: 150',
        'Tool Count: 1',
        'Mac Address:00:11:22:33:44:55',
        'ok',
      ].join('\n');
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(mockResponse);

      const info = await client.getPrinterInfo();

      expect(info).not.toBeNull();
      expect(info?.serialNumber).toBe('SNADVA3M12345');
      expect(info?.firmware).toBe('v1.3.7');
    });
  });

  describe('Print Job Control', () => {
    it('should select a file for printing', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(
        'File opened: /data/test.gcode Size: 123456\nDone printing file\nok\n'
      );

      await expect(client.selectFile('test.gcode')).resolves.toBe(true);
    });

    it('should start a print job on command echo responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('ack: "M24"\n');

      await expect(client.startPrint()).resolves.toBe(true);
    });

    it('should pause a print job on command echo responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('ack: "M25"\n');

      await expect(client.pausePrint()).resolves.toBe(true);
    });

    it('should stop a print job on received responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M26 Received.\n');

      await expect(client.stopPrint()).resolves.toBe(true);
    });

    it('should parse M27 progress without legacy layer metadata', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('ack: "SD printing byte 45/100\r\n"');

      const status = await client.getPrintStatus();

      expect(status).toBeInstanceOf(PrintStatus);
      expect(status?.getSdProgress()).toBe('45/100');
      expect(status?.getPrintPercent()).toBe(45);
    });
  });

  describe('Temperature Control', () => {
    it('should parse single-line M105 responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('ok T0:185/200 B:60/60\r\n');

      const tempInfo = await client.getTempInfo();

      expect(tempInfo).toBeInstanceOf(TempInfo);
      expect(tempInfo?.getExtruderTemp()?.getCurrent()).toBe(185);
      expect(tempInfo?.getExtruderTemp()?.getSet()).toBe(200);
      expect(tempInfo?.getBedTemp()?.getCurrent()).toBe(60);
      expect(tempInfo?.getBedTemp()?.getSet()).toBe(60);
    });
  });

  describe('Motion Control', () => {
    it('should enable motors with M17', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M17 Received.\n');

      await expect(client.enableMotors()).resolves.toBe(true);
    });

    it('should disable motors with M18', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M18 Received.\n');

      await expect(client.disableMotors()).resolves.toBe(true);
    });

    it('should treat homing as a fire-and-forget success when the write succeeds', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('');

      await expect(client.home()).resolves.toBe(true);
    });

    it('should treat manual moves as fire-and-forget success when the write succeeds', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('');

      await expect(client.move(100, 100, 10, 3000)).resolves.toBe(true);
    });
  });

  describe('G-code Controller Integration', () => {
    it('should map inherited LED methods to Adventurer 3 M146 semantics', async () => {
      const controller = new A3GCodeController(client);
      const sendCommandSpy = vi.spyOn(client, 'sendCommandAsync');
      sendCommandSpy
        .mockResolvedValueOnce('ack: "M146 1"\n')
        .mockResolvedValueOnce('ack: "M146 0"\n');

      await expect(controller.ledOn()).resolves.toBe(true);
      await expect(controller.ledOff()).resolves.toBe(true);

      expect(sendCommandSpy).toHaveBeenNthCalledWith(1, '~M146 1');
      expect(sendCommandSpy).toHaveBeenNthCalledWith(2, '~M146 0');
    });

    it('should select then start a job using the Adventurer 3 M23/M24 flow', async () => {
      const controller = new A3GCodeController(client);
      const sendCommandSpy = vi.spyOn(client, 'sendCommandAsync');
      sendCommandSpy
        .mockResolvedValueOnce('File opened: /data/test.gcode Size: 123456\nDone printing file\nok\n')
        .mockResolvedValueOnce('ack: "M24"\n');

      await expect(controller.startJob('test.gcode')).resolves.toBe(true);

      expect(sendCommandSpy).toHaveBeenNthCalledWith(1, '~M23 /data/test.gcode');
      expect(sendCommandSpy).toHaveBeenNthCalledWith(2, '~M24');
    });

    it('should get the printer model from M115 rather than M650', async () => {
      const controller = new A3GCodeController(client);
      const sendCommandSpy = vi.spyOn(client, 'sendCommandAsync').mockResolvedValue([
        'echo: Machine Type: FlashForge Adventurer III',
        'Machine Name: MyPrinter',
        'Firmware: v1.3.7',
        'Serial Number: SNADVA3M12345',
        'X: 150 Y: 150 Z: 150',
        'Tool Count: 1',
        'Mac Address:00:11:22:33:44:55',
        '',
      ].join('\n'));

      await expect(controller.getPrinterModel()).resolves.toBe('FlashForge Adventurer III');
      expect(sendCommandSpy).toHaveBeenCalledWith('~M115');
    });
  });

  describe('File Operations', () => {
    it('should list files from the documented M661 response format', async () => {
      const mockResponse = [
        'CMD M661 Received.',
        'info_list.size: 3',
        'test1.gcode',
        'test2.gx',
        'test3.g',
      ].join('\n');
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(mockResponse);

      const files = await client.listFiles();

      expect(files).toHaveLength(3);
      expect(files[0].name).toBe('test1.gcode');
      expect(files[0].path).toBe('/data/test1.gcode');
    });

    it('should return an empty file list on documented M661 error responses', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M661 Error.\n');

      await expect(client.listFiles()).resolves.toEqual([]);
    });

    it('should parse thumbnails after the documented M662 text header', async () => {
      const thumbnailPayload = Buffer.alloc(100);
      thumbnailPayload.writeUInt32BE(0xa2a22a2a, 0);
      thumbnailPayload.writeUInt32BE(92, 4);

      const fullResponse = Buffer.concat([
        Buffer.from('CMD M662 Received.\nack header length: 64\n', 'utf8'),
        thumbnailPayload,
      ]);
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(fullResponse.toString('binary'));

      const thumbnail = await client.getThumbnail('test.gcode');

      expect(thumbnail).not.toBeNull();
      expect(thumbnail?.data).toBeInstanceOf(Buffer);
      expect(thumbnail?.data.length).toBe(92);
    });

    it('should return null for documented M662 file-not-found errors', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(
        'CMD M662 Received.\nError: File not exists\n'
      );

      await expect(client.getThumbnail('missing.gcode')).resolves.toBeNull();
    });
  });

  describe('Position and Status', () => {
    it('should parse variable M114 position formats defensively', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(
        'CMD M114 Received.\nX:100.5 Y:120.3 Z:0.3 A:5.2 B:0.0\n'
      );

      const position = await client.getPosition();

      expect(position).not.toBeNull();
      expect(position?.X).toBe('100.5');
      expect(position?.Y).toBe('120.3');
      expect(position?.Z).toBe('0.3');
    });

    it('should return null when M663 only acknowledges the command', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M663 Received.\nok\n');

      await expect(client.getPositionXYZE()).resolves.toBeNull();
    });

    it('should parse the documented Adventurer 3 M119 status format', async () => {
      const mockResponse = [
        'echo: Endstop: X-max: 0 Y-max: 0 Z-min: 1',
        'MachineStatus: IDLE',
        'MoveMode: 0.0',
        'FilamentStatus: ok',
        'LEDStatus: on',
        'PrintFileName: test.gcode',
      ].join('\n');
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(mockResponse);

      const endstop = await client.getEndstopStatus();

      expect(endstop).not.toBeNull();
      expect(endstop?.isReady()).toBe(true);
      expect(endstop?._Endstop?.Zmin).toBe(1);
      expect(endstop?._FilamentStatus).toBe('ok');
      expect(endstop?._LedEnabled).toBe(true);
      expect(endstop?._CurrentFile).toBe('test.gcode');
    });
  });

  describe('Emergency Operations', () => {
    it('should treat emergency stop acknowledgements as success', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('echo: Emergency Stop!!!\n');

      await expect(client.emergencyStop()).resolves.toBe(true);
    });

    it('should acknowledge the documented no-op M108 handler', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M108 Received.\n');

      await expect(client.cancelHeatWait()).resolves.toBe(true);
    });
  });

  describe('LED Control', () => {
    it('should send the documented on/off style M146 command', async () => {
      const sendCommandSpy = vi
        .spyOn(client, 'sendCommandAsync')
        .mockResolvedValue('ack: "M146 1"\n');

      await expect(client.ledControl('1')).resolves.toBe(true);
      expect(sendCommandSpy).toHaveBeenCalledWith('~M146 1');
    });
  });

  describe('Custom Commands', () => {
    it('should send M144 command', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('ack: "M144"\n');

      await expect(client.customM144()).resolves.toContain('M144');
    });

    it('should send M145 command', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('ack: "M145"\n');

      await expect(client.customM145()).resolves.toContain('M145');
    });

    it('should return M650 calibration values rather than a model name', async () => {
      const mockResponse = 'echo: "CMD M650 Received.\nX: 1.0 Y: 0.5\n"';
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(mockResponse);

      await expect(client.customM650()).resolves.toContain('X: 1.0 Y: 0.5');
    });

    it('should send M610 to set printer name', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('CMD M610 Received.\nok\n');

      await expect(client.setPrinterName('My Printer')).resolves.toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return false when a command fails', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue(null);

      await expect(client.startPrint()).resolves.toBe(false);
    });

    it('should return false on explicit printer errors', async () => {
      vi.spyOn(client, 'sendCommandAsync').mockResolvedValue('Error: failed\n');

      await expect(client.startPrint()).resolves.toBe(false);
    });
  });
});
