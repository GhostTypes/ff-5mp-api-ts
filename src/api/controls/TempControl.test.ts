/**
 * @fileoverview Unit tests for TempControl module.
 * Tests temperature control operations including setting/canceling extruder and bed temperatures via mocked TCP client.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FiveMClient } from '../../FiveMClient';
import type { GCodeController } from '../../tcpapi/client/GCodeController';
import type { FlashForgeClient } from '../../tcpapi/FlashForgeClient';
import { TempControl } from './TempControl';

// Mock the FlashForgeClient
vi.mock('../../tcpapi/FlashForgeClient');

describe('TempControl', () => {
  let mockFiveMClient: FiveMClient;
  let mockTcpClient: FlashForgeClient & {
    setExtruderTemp: ReturnType<typeof vi.fn>;
    setBedTemp: ReturnType<typeof vi.fn>;
    cancelExtruderTemp: ReturnType<typeof vi.fn>;
    cancelBedTemp: ReturnType<typeof vi.fn>;
    gCode: ReturnType<typeof vi.fn>;
  };
  let mockGCodeController: GCodeController & {
    waitForBedTemp: ReturnType<typeof vi.fn>;
  };
  let tempControl: TempControl;

  beforeEach(() => {
    // Create mock GCodeController
    mockGCodeController = {
      waitForBedTemp: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock TCP client
    mockTcpClient = {
      setExtruderTemp: vi.fn().mockResolvedValue(true),
      setBedTemp: vi.fn().mockResolvedValue(true),
      cancelExtruderTemp: vi.fn().mockResolvedValue(true),
      cancelBedTemp: vi.fn().mockResolvedValue(true),
      gCode: vi.fn().mockReturnValue(mockGCodeController),
    } as any;

    // Create mock FiveMClient
    mockFiveMClient = {
      tcpClient: mockTcpClient,
    } as FiveMClient;

    tempControl = new TempControl(mockFiveMClient);
  });

  describe('setExtruderTemp', () => {
    it('should set extruder temperature successfully', async () => {
      const result = await tempControl.setExtruderTemp(210);

      expect(result).toBe(true);
      expect(mockTcpClient.setExtruderTemp).toHaveBeenCalledWith(210);
    });

    it('should handle different temperature values', async () => {
      await tempControl.setExtruderTemp(200);
      await tempControl.setExtruderTemp(240);
      await tempControl.setExtruderTemp(180);

      expect(mockTcpClient.setExtruderTemp).toHaveBeenCalledTimes(3);
      expect(mockTcpClient.setExtruderTemp).toHaveBeenCalledWith(200);
      expect(mockTcpClient.setExtruderTemp).toHaveBeenCalledWith(240);
      expect(mockTcpClient.setExtruderTemp).toHaveBeenCalledWith(180);
    });

    it('should return false when TCP client fails', async () => {
      mockTcpClient.setExtruderTemp.mockResolvedValue(false);

      const result = await tempControl.setExtruderTemp(210);

      expect(result).toBe(false);
    });
  });

  describe('setBedTemp', () => {
    it('should set bed temperature successfully', async () => {
      const result = await tempControl.setBedTemp(60);

      expect(result).toBe(true);
      expect(mockTcpClient.setBedTemp).toHaveBeenCalledWith(60);
    });

    it('should handle different bed temperature values', async () => {
      await tempControl.setBedTemp(50);
      await tempControl.setBedTemp(80);
      await tempControl.setBedTemp(100);

      expect(mockTcpClient.setBedTemp).toHaveBeenCalledTimes(3);
      expect(mockTcpClient.setBedTemp).toHaveBeenCalledWith(50);
      expect(mockTcpClient.setBedTemp).toHaveBeenCalledWith(80);
      expect(mockTcpClient.setBedTemp).toHaveBeenCalledWith(100);
    });

    it('should return false when TCP client fails', async () => {
      mockTcpClient.setBedTemp.mockResolvedValue(false);

      const result = await tempControl.setBedTemp(60);

      expect(result).toBe(false);
    });
  });

  describe('cancelExtruderTemp', () => {
    it('should cancel extruder temperature successfully', async () => {
      const result = await tempControl.cancelExtruderTemp();

      expect(result).toBe(true);
      expect(mockTcpClient.cancelExtruderTemp).toHaveBeenCalled();
    });

    it('should return false when TCP client fails', async () => {
      mockTcpClient.cancelExtruderTemp.mockResolvedValue(false);

      const result = await tempControl.cancelExtruderTemp();

      expect(result).toBe(false);
    });
  });

  describe('cancelBedTemp', () => {
    it('should cancel bed temperature successfully', async () => {
      const result = await tempControl.cancelBedTemp();

      expect(result).toBe(true);
      expect(mockTcpClient.cancelBedTemp).toHaveBeenCalled();
    });

    it('should return false when TCP client fails', async () => {
      mockTcpClient.cancelBedTemp.mockResolvedValue(false);

      const result = await tempControl.cancelBedTemp();

      expect(result).toBe(false);
    });
  });

  describe('waitForPartCool', () => {
    it('should wait for bed to cool to specified temperature', async () => {
      await tempControl.waitForPartCool(40);

      expect(mockTcpClient.gCode).toHaveBeenCalled();
      expect(mockGCodeController.waitForBedTemp).toHaveBeenCalledWith(40, true);
    });

    it('should handle different cooling temperatures', async () => {
      await tempControl.waitForPartCool(30);
      await tempControl.waitForPartCool(50);
      await tempControl.waitForPartCool(25);

      expect(mockGCodeController.waitForBedTemp).toHaveBeenCalledTimes(3);
      expect(mockGCodeController.waitForBedTemp).toHaveBeenCalledWith(30, true);
      expect(mockGCodeController.waitForBedTemp).toHaveBeenCalledWith(50, true);
      expect(mockGCodeController.waitForBedTemp).toHaveBeenCalledWith(25, true);
    });
  });
});
