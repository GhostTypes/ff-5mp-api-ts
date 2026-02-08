/**
 * @fileoverview Unit tests for Files module.
 * Tests file listing and thumbnail retrieval with AD5X and legacy printer format support using mocked HTTP responses.
 */

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FiveMClient } from '../../FiveMClient';
import type { FFGcodeFileEntry } from '../../models/ff-models';
import { NetworkUtils } from '../network/NetworkUtils';
import { Files } from './Files';

// Mock FiveMClient and its dependencies as needed
vi.mock('axios');
const mockedAxios = axios as typeof axios & {
  post: ReturnType<typeof vi.fn>;
};

// Mock NetworkUtils.isOk
vi.mock('../network/NetworkUtils', () => ({
  NetworkUtils: {
    isOk: vi.fn(),
  },
}));
const mockedNetworkUtils = NetworkUtils as typeof NetworkUtils & {
  isOk: ReturnType<typeof vi.fn>;
};

describe('Files Control', () => {
  let mockFiveMClient: FiveMClient;
  let filesControl: Files;

  beforeEach(() => {
    // Reset mocks before each test
    mockedAxios.post.mockReset();
    mockedNetworkUtils.isOk.mockReset();

    // Setup default mock behavior
    mockedNetworkUtils.isOk.mockImplementation((response: any) => response && response.code === 0);

    // A very basic mock for FiveMClient, only providing what Files control needs
    mockFiveMClient = {
      getEndpoint: (endpoint: string) => `http://fakeprinter:8898${endpoint}`,
      serialNumber: 'testSN',
      checkCode: 'testCC',
    } as FiveMClient; // Cast to FiveMClient, add more properties if Files uses them

    filesControl = new Files(mockFiveMClient);
  });

  describe('getRecentFileList', () => {
    const ad5xGcodeListResponse: FFGcodeFileEntry[] = [
      {
        gcodeFileName: 'FISH_PLA.3mf',
        gcodeToolCnt: 4,
        gcodeToolDatas: [
          {
            filamentWeight: 3.28,
            materialColor: '#FFFF00',
            materialName: 'PLA',
            slotId: 0,
            toolId: 0,
          },
          {
            filamentWeight: 0.51,
            materialColor: '#FFFF00',
            materialName: 'PLA',
            slotId: 0,
            toolId: 1,
          },
          {
            filamentWeight: 18.1,
            materialColor: '#FF0000',
            materialName: 'PLA',
            slotId: 0,
            toolId: 2,
          },
          {
            filamentWeight: 6.15,
            materialColor: '#FF8040',
            materialName: 'PLA',
            slotId: 0,
            toolId: 3,
          },
        ],
        printingTime: 29958,
        totalFilamentWeight: 28.04,
        useMatlStation: true,
      },
      {
        gcodeFileName: 'FlashForge-TestModel-01.3mf',
        gcodeToolCnt: 2,
        gcodeToolDatas: [
          {
            filamentWeight: 3.46,
            materialColor: '#FFFFFF',
            materialName: 'PLA',
            slotId: 0,
            toolId: 0,
          },
          {
            filamentWeight: 0.26,
            materialColor: '#0000FF',
            materialName: 'PLA',
            slotId: 0,
            toolId: 1,
          },
        ],
        printingTime: 849,
        totalFilamentWeight: 3.73,
        useMatlStation: true,
      },
    ];

    const olderPrinterGcodeListResponse: string[] = ['test_file1.gcode', 'another_print.gcode'];

    it('should correctly parse AD5X-style detailed G-code list', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success', gcodeList: ad5xGcodeListResponse },
      });
      mockedNetworkUtils.isOk.mockReturnValue(true);

      const result = await filesControl.getRecentFileList();

      expect(result).toHaveLength(2);
      expect(result[0].gcodeFileName).toBe('FISH_PLA.3mf');
      expect(result[0].gcodeToolCnt).toBe(4);
      expect(result[0].gcodeToolDatas).toHaveLength(4);
      expect(result[0].gcodeToolDatas?.[2].materialColor).toBe('#FF0000');
      expect(result[0].totalFilamentWeight).toBe(28.04);
      expect(result[0].useMatlStation).toBe(true);
      expect(result[1].gcodeFileName).toBe('FlashForge-TestModel-01.3mf');
    });

    it('should correctly parse older printer string-array G-code list', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success', gcodeList: olderPrinterGcodeListResponse },
      });
      mockedNetworkUtils.isOk.mockReturnValue(true);

      const result = await filesControl.getRecentFileList();

      expect(result).toHaveLength(2);
      expect(result[0].gcodeFileName).toBe('test_file1.gcode');
      expect(result[0].printingTime).toBe(0); // Defaulted
      expect(result[0].gcodeToolDatas).toBeUndefined();
      expect(result[1].gcodeFileName).toBe('another_print.gcode');
    });

    it('should return an empty array for an empty G-code list', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success', gcodeList: [] },
      });
      mockedNetworkUtils.isOk.mockReturnValue(true);

      const result = await filesControl.getRecentFileList();
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if API response is not OK', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 1, message: 'Error from printer', gcodeList: [] },
      });
      mockedNetworkUtils.isOk.mockReturnValue(false); // Simulate NetworkUtils.isOk returning false

      const result = await filesControl.getRecentFileList();
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if HTTP status is not 200', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 500,
        data: {}, // Data doesn't matter here
      });
      // NetworkUtils.isOk won't even be called if status is not 200

      const result = await filesControl.getRecentFileList();
      expect(result).toHaveLength(0);
    });

    it('should return an empty array on axios POST error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const result = await filesControl.getRecentFileList();
      expect(result).toHaveLength(0);
    });
  });
});
