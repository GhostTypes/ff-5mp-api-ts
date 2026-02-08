/**
 * @fileoverview Unit tests for Info module.
 * Tests printer information retrieval, status checking, and machine state transformation using mocked HTTP responses.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { Info } from './Info';
import { FiveMClient } from '../../FiveMClient';
import { MachineState, FFPrinterDetail } from '../../models/ff-models';
import { Endpoints } from '../server/Endpoints';

vi.mock('axios');
const mockedAxios = axios as typeof axios & {
  post: ReturnType<typeof vi.fn>;
};

describe('Info', () => {
  let mockClient: FiveMClient;
  let info: Info;

  beforeEach(() => {
    mockedAxios.post.mockReset();

    mockClient = {
      getEndpoint: (endpoint: string) => `http://printer:8898${endpoint}`,
      serialNumber: 'SN123456',
      checkCode: 'CC123456'
    } as FiveMClient;

    info = new Info(mockClient);
  });

  describe('getDetailResponse', () => {
    it('should return detail response for successful request', async () => {
      const mockDetailResponse = {
        code: 0,
        message: 'Success',
        detail: {
          name: 'FlashForge 5M Pro',
          firmwareVersion: '1.0.0',
          status: 'ready'
        } as FFPrinterDetail
      };

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockDetailResponse
      });

      const result = await info.getDetailResponse();

      expect(result).not.toBeNull();
      expect(result?.code).toBe(0);
      expect(result?.detail.name).toBe('FlashForge 5M Pro');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Detail}`,
        {
          serialNumber: 'SN123456',
          checkCode: 'CC123456'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should return null for non-200 status', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 500,
        data: {}
      });

      const result = await info.getDetailResponse();

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await info.getDetailResponse();

      expect(result).toBeNull();
    });
  });

  describe('get', () => {
    it('should return machine info from detail response', async () => {
      const mockDetailResponse = {
        code: 0,
        message: 'Success',
        detail: {
          name: 'FlashForge 5M Pro',
          firmwareVersion: '1.0.0',
          status: 'ready',
          platTemp: 60,
          rightTemp: 210
        } as FFPrinterDetail
      };

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockDetailResponse
      });

      const result = await info.get();

      expect(result).not.toBeNull();
      expect(result?.Name).toBe('FlashForge 5M Pro');
      expect(result?.FirmwareVersion).toBe('1.0.0');
    });

    it('should return null when detail response fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await info.get();

      expect(result).toBeNull();
    });
  });

  describe('isPrinting', () => {
    it('should return true when printer is printing', async () => {
      const mockDetailResponse = {
        code: 0,
        message: 'Success',
        detail: {
          name: 'FlashForge 5M Pro',
          status: 'printing'
        } as FFPrinterDetail
      };

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockDetailResponse
      });

      const result = await info.isPrinting();

      expect(result).toBe(true);
    });

    it('should return false when printer is ready', async () => {
      const mockDetailResponse = {
        code: 0,
        message: 'Success',
        detail: {
          name: 'FlashForge 5M Pro',
          status: 'ready'
        } as FFPrinterDetail
      };

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockDetailResponse
      });

      const result = await info.isPrinting();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await info.isPrinting();

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status string', async () => {
      const mockDetailResponse = {
        code: 0,
        message: 'Success',
        detail: {
          name: 'FlashForge 5M Pro',
          status: 'ready'
        } as FFPrinterDetail
      };

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockDetailResponse
      });

      const result = await info.getStatus();

      expect(result).toBe('ready');
    });

    it('should return null on error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await info.getStatus();

      expect(result).toBeNull();
    });
  });

  describe('getMachineState', () => {
    it('should return machine state', async () => {
      const mockDetailResponse = {
        code: 0,
        message: 'Success',
        detail: {
          name: 'FlashForge 5M Pro',
          status: 'ready'
        } as FFPrinterDetail
      };

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockDetailResponse
      });

      const result = await info.getMachineState();

      expect(result).toBe(MachineState.Ready);
    });

    it('should return null on error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await info.getMachineState();

      expect(result).toBeNull();
    });
  });
});
