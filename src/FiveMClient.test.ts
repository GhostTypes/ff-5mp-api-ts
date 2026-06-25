/**
 * @fileoverview Constructor and endpoint tests for FiveMClient connection port overrides.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiveMClient } from './FiveMClient';
import type { FFMachineInfo } from './models/ff-models';

const { flashForgeClientConstructor, axiosCreate } = vi.hoisted(() => ({
  flashForgeClientConstructor: vi.fn(),
  axiosCreate: vi.fn(),
}));

const httpPost = vi.fn();
const httpHead = vi.fn();
const httpGet = vi.fn();

vi.mock('./tcpapi/FlashForgeClient', () => ({
  FlashForgeClient: flashForgeClientConstructor,
}));

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

describe('FiveMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flashForgeClientConstructor.mockImplementation(function mockFlashForgeClient() {
      return {
        initControl: vi.fn().mockResolvedValue(true),
        dispose: vi.fn().mockResolvedValue(undefined),
        getPrinterInfo: vi.fn().mockResolvedValue(null),
      };
    });
    axiosCreate.mockReturnValue({
      post: httpPost,
      head: httpHead,
      get: httpGet,
    });
  });

  it('uses default HTTP and TCP ports when no overrides are provided', () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');

    expect(client.getEndpoint('/detail')).toBe('http://192.168.1.10:8898/detail');
    expect(flashForgeClientConstructor).toHaveBeenCalledWith('192.168.1.10', undefined);
  });

  it('uses custom HTTP and TCP ports when overrides are provided', () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1', {
      httpPort: 19098,
      tcpPort: 19099,
    });

    expect(client.getEndpoint('/detail')).toBe('http://192.168.1.10:19098/detail');
    expect(flashForgeClientConstructor).toHaveBeenCalledWith('192.168.1.10', { port: 19099 });
  });

  it('caches the runtime OEM camera stream URL from machine info', () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');
    const machineInfo = {
      Name: 'FlashForge 5M',
      IsPro: false,
      IsAD5X: false,
      FirmwareVersion: '3.2.7',
      CameraStreamUrl: 'http://192.168.1.10:8080/?action=stream',
      MacAddress: 'AA:BB:CC:DD:EE:FF',
      FlashCloudRegisterCode: '',
      PolarCloudRegisterCode: '',
      FormattedTotalRunTime: '0h:0m',
      CumulativeFilament: 0,
    } as FFMachineInfo;

    expect(client.cacheDetails(machineInfo)).toBe(true);
    expect(client.cameraStreamUrl).toBe('http://192.168.1.10:8080/?action=stream');
  });

  it('detects the OEM camera stream from a successful HEAD probe', async () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');

    httpHead.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'multipart/x-mixed-replace; boundary=frame',
      },
    });

    await expect(client.detectCameraStream()).resolves.toBe(
      'http://192.168.1.10:8080/?action=stream'
    );
    expect(httpHead).toHaveBeenCalledTimes(1);
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('falls back to GET when HEAD does not detect a stream', async () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');
    const destroy = vi.fn();

    httpHead.mockResolvedValue({
      status: 405,
      headers: {},
    });
    httpGet.mockResolvedValue({
      status: 200,
      headers: {},
      data: { destroy },
    });

    await expect(client.detectCameraStream()).resolves.toBe(
      'http://192.168.1.10:8080/?action=stream'
    );
    expect(httpHead).toHaveBeenCalledTimes(1);
    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('returns an empty string when neither probe method finds a camera stream', async () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');
    const destroy = vi.fn();

    httpHead.mockRejectedValue(new Error('timeout'));
    httpGet.mockResolvedValue({
      status: 404,
      headers: {
        'content-type': 'text/html',
      },
      data: { destroy },
    });

    await expect(client.detectCameraStream()).resolves.toBe('');
    expect(httpHead).toHaveBeenCalledTimes(1);
    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  describe('deriveCapabilities', () => {
    it('maps 1=available control states to capability flags', () => {
      const caps = FiveMClient.deriveCapabilities({
        chamberTempCtrlState: 1,
        externalFanCtrlState: 1,
        internalFanCtrlState: 1,
        lightCtrlState: 1,
        nozzleTempCtrlState: 1,
        platformTempCtrlState: 1,
      });

      expect(caps).toEqual({
        hasLed: true,
        hasFiltration: true,
        hasChamberControl: true,
        hasNozzleControl: true,
        hasPlatformControl: true,
      });
    });

    it('requires BOTH fans for filtration (Creator 5 Pro reports 0/0)', () => {
      // Live C5 Pro /product: light + chamber + nozzle + platform available,
      // but internal/external fans reported 0 -> filtration must be false here.
      const caps = FiveMClient.deriveCapabilities({
        chamberTempCtrlState: 1,
        externalFanCtrlState: 0,
        internalFanCtrlState: 0,
        lightCtrlState: 1,
        nozzleTempCtrlState: 1,
        platformTempCtrlState: 1,
      });

      expect(caps.hasFiltration).toBe(false);
      expect(caps.hasLed).toBe(true);
      expect(caps.hasChamberControl).toBe(true);
    });

    it('treats missing control states as not-available', () => {
      const caps = FiveMClient.deriveCapabilities({});

      expect(caps).toEqual({
        hasLed: false,
        hasFiltration: false,
        hasChamberControl: false,
        hasNozzleControl: false,
        hasPlatformControl: false,
      });
    });
  });

  // Creator 5 / 5 Pro run no legacy TCP server; initControl must succeed on the
  // HTTP product command alone and never touch the TCP client.
  describe('HTTP-only mode', () => {
    const okProduct = { status: 200, data: { code: 0, message: 'Success', product: {} } };

    it('initControl skips TCP init when constructed with httpOnly: true', async () => {
      httpPost.mockResolvedValue(okProduct);
      const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1', { httpOnly: true });

      await expect(client.initControl()).resolves.toBe(true);
      expect(client.httpOnly).toBe(true);
      expect(
        (client.tcpClient as unknown as { initControl: ReturnType<typeof vi.fn> }).initControl
      ).not.toHaveBeenCalled();
    });

    it('initControl still initializes TCP for dual-API printers (default)', async () => {
      httpPost.mockResolvedValue(okProduct);
      const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');

      await expect(client.initControl()).resolves.toBe(true);
      expect(client.httpOnly).toBe(false);
      expect(
        (client.tcpClient as unknown as { initControl: ReturnType<typeof vi.fn> }).initControl
      ).toHaveBeenCalled();
    });

    it('dispose does not touch the TCP client in HTTP-only mode', async () => {
      const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1', { httpOnly: true });

      await client.dispose();
      expect(
        (client.tcpClient as unknown as { dispose: ReturnType<typeof vi.fn> }).dispose
      ).not.toHaveBeenCalled();
    });

    it('forces chamber control on by model for the Creator 5 even when /product reports 0', async () => {
      // /product is unreliable for the chamber; both C5 and C5 Pro have one, so the
      // capability is enabled by model regardless of chamberTempCtrlState.
      httpPost.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success', product: { chamberTempCtrlState: 0 } },
      });
      const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1', { httpOnly: true });
      client.isCreator5 = true;

      await expect(client.sendProductCommand()).resolves.toBe(true);
      expect(client.capabilities.hasChamberControl).toBe(true);
    });
  });
});
