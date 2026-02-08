/**
 * @fileoverview Unit tests for JobControl module.
 * Tests print job operations, file uploads with firmware-specific handling, and AD5X multi-color job validation using mocked HTTP clients.
 */
import axios from 'axios';
import type { FiveMClient } from '../../FiveMClient';
import type { AD5XMaterialMapping } from '../../models/ff-models';
import { Endpoints } from '../server/Endpoints';
import type { Control } from './Control';
import { JobControl } from './JobControl';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('./Control');

describe('JobControl', () => {
  let mockFiveMClient: FiveMClient;
  let mockControl: jest.Mocked<Control>;
  let jobControl: JobControl;

  beforeEach(() => {
    mockedAxios.post.mockReset();

    mockControl = {
      sendJobControlCmd: jest.fn().mockResolvedValue(true),
      sendControlCommand: jest.fn().mockResolvedValue(true),
    } as any;

    mockFiveMClient = {
      control: mockControl,
      serialNumber: 'SN123456',
      checkCode: 'CC123456',
      firmVer: '3.1.3',
      isAD5X: false,
      getEndpoint: (endpoint: string) => `http://printer:8898${endpoint}`,
    } as FiveMClient;

    jobControl = new JobControl(mockFiveMClient);
  });

  describe('pausePrintJob', () => {
    it('should pause print job successfully', async () => {
      const result = await jobControl.pausePrintJob();

      expect(result).toBe(true);
      expect(mockControl.sendJobControlCmd).toHaveBeenCalledWith('pause');
    });

    it('should return false when control command fails', async () => {
      mockControl.sendJobControlCmd.mockResolvedValue(false);

      const result = await jobControl.pausePrintJob();

      expect(result).toBe(false);
    });
  });

  describe('resumePrintJob', () => {
    it('should resume print job successfully', async () => {
      const result = await jobControl.resumePrintJob();

      expect(result).toBe(true);
      expect(mockControl.sendJobControlCmd).toHaveBeenCalledWith('continue');
    });

    it('should return false when control command fails', async () => {
      mockControl.sendJobControlCmd.mockResolvedValue(false);

      const result = await jobControl.resumePrintJob();

      expect(result).toBe(false);
    });
  });

  describe('cancelPrintJob', () => {
    it('should cancel print job successfully', async () => {
      const result = await jobControl.cancelPrintJob();

      expect(result).toBe(true);
      expect(mockControl.sendJobControlCmd).toHaveBeenCalledWith('cancel');
    });

    it('should return false when control command fails', async () => {
      mockControl.sendJobControlCmd.mockResolvedValue(false);

      const result = await jobControl.cancelPrintJob();

      expect(result).toBe(false);
    });
  });

  describe('clearPlatform', () => {
    it('should clear platform successfully', async () => {
      const result = await jobControl.clearPlatform();

      expect(result).toBe(true);
      expect(mockControl.sendControlCommand).toHaveBeenCalledWith('stateCtrl_cmd', {
        action: 'setClearPlatform',
      });
    });

    it('should return false when control command fails', async () => {
      mockControl.sendControlCommand.mockResolvedValue(false);

      const result = await jobControl.clearPlatform();

      expect(result).toBe(false);
    });
  });

  describe('printLocalFile', () => {
    it('should print local file with new firmware version', async () => {
      mockFiveMClient.firmVer = '3.1.3';

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });

      const result = await jobControl.printLocalFile('test.gcode', true);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.GCodePrint}`,
        {
          serialNumber: 'SN123456',
          checkCode: 'CC123456',
          fileName: 'test.gcode',
          levelingBeforePrint: true,
          flowCalibration: false,
          useMatlStation: false,
          gcodeToolCnt: 0,
          materialMappings: [],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should print local file with old firmware version', async () => {
      mockFiveMClient.firmVer = '2.0.0';

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });

      const result = await jobControl.printLocalFile('test.gcode', false);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.GCodePrint}`,
        {
          serialNumber: 'SN123456',
          checkCode: 'CC123456',
          fileName: 'test.gcode',
          levelingBeforePrint: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should return false for non-200 status', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 500,
        data: {},
      });

      const result = await jobControl.printLocalFile('test.gcode', true);

      expect(result).toBe(false);
    });

    it('should return false for non-OK response', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 1, message: 'Error' },
      });

      const result = await jobControl.printLocalFile('test.gcode', true);

      expect(result).toBe(false);
    });

    it('should throw error on network failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(jobControl.printLocalFile('test.gcode', true)).rejects.toThrow('Network error');
    });
  });

  describe('startAD5XSingleColorJob', () => {
    beforeEach(() => {
      mockFiveMClient.isAD5X = true;
    });

    it('should start single color job on AD5X printer', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });

      const result = await jobControl.startAD5XSingleColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
      });

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.GCodePrint}`,
        {
          serialNumber: 'SN123456',
          checkCode: 'CC123456',
          fileName: 'test.3mf',
          levelingBeforePrint: true,
          firstLayerInspection: false,
          flowCalibration: false,
          timeLapseVideo: false,
          useMatlStation: false,
          gcodeToolCnt: 0,
          materialMappings: [],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should return false for non-AD5X printer', async () => {
      mockFiveMClient.isAD5X = false;

      const result = await jobControl.startAD5XSingleColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
      });

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return false for empty file name', async () => {
      const result = await jobControl.startAD5XSingleColorJob({
        fileName: '',
        levelingBeforePrint: true,
      });

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('startAD5XMultiColorJob', () => {
    beforeEach(() => {
      mockFiveMClient.isAD5X = true;
    });

    const validMaterialMappings: AD5XMaterialMapping[] = [
      {
        toolId: 0,
        slotId: 1,
        materialName: 'PLA',
        toolMaterialColor: '#FF0000',
        slotMaterialColor: '#FF0000',
      },
      {
        toolId: 1,
        slotId: 2,
        materialName: 'PLA',
        toolMaterialColor: '#00FF00',
        slotMaterialColor: '#00FF00',
      },
    ];

    it('should start multi-color job on AD5X printer', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'multicolor.3mf',
        levelingBeforePrint: true,
        materialMappings: validMaterialMappings,
      });

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.GCodePrint}`,
        {
          serialNumber: 'SN123456',
          checkCode: 'CC123456',
          fileName: 'multicolor.3mf',
          levelingBeforePrint: true,
          firstLayerInspection: false,
          flowCalibration: false,
          timeLapseVideo: false,
          useMatlStation: true,
          gcodeToolCnt: 2,
          materialMappings: validMaterialMappings,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should return false for non-AD5X printer', async () => {
      mockFiveMClient.isAD5X = false;

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: validMaterialMappings,
      });

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return false for empty material mappings', async () => {
      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: [],
      });

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return false for invalid toolId', async () => {
      const invalidMappings: AD5XMaterialMapping[] = [
        {
          toolId: 5, // Invalid: must be 0-3
          slotId: 1,
          materialName: 'PLA',
          toolMaterialColor: '#FF0000',
          slotMaterialColor: '#FF0000',
        },
      ];

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: invalidMappings,
      });

      expect(result).toBe(false);
    });

    it('should return false for invalid slotId', async () => {
      const invalidMappings: AD5XMaterialMapping[] = [
        {
          toolId: 0,
          slotId: 5, // Invalid: must be 1-4
          materialName: 'PLA',
          toolMaterialColor: '#FF0000',
          slotMaterialColor: '#FF0000',
        },
      ];

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: invalidMappings,
      });

      expect(result).toBe(false);
    });

    it('should return false for invalid color format', async () => {
      const invalidMappings: AD5XMaterialMapping[] = [
        {
          toolId: 0,
          slotId: 1,
          materialName: 'PLA',
          toolMaterialColor: 'red', // Invalid: must be #RRGGBB
          slotMaterialColor: '#FF0000',
        },
      ];

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: invalidMappings,
      });

      expect(result).toBe(false);
    });

    it('should return false for too many material mappings', async () => {
      const tooManyMappings: AD5XMaterialMapping[] = [
        {
          toolId: 0,
          slotId: 1,
          materialName: 'PLA',
          toolMaterialColor: '#FF0000',
          slotMaterialColor: '#FF0000',
        },
        {
          toolId: 1,
          slotId: 2,
          materialName: 'PLA',
          toolMaterialColor: '#00FF00',
          slotMaterialColor: '#00FF00',
        },
        {
          toolId: 2,
          slotId: 3,
          materialName: 'PLA',
          toolMaterialColor: '#0000FF',
          slotMaterialColor: '#0000FF',
        },
        {
          toolId: 3,
          slotId: 4,
          materialName: 'PLA',
          toolMaterialColor: '#FFFF00',
          slotMaterialColor: '#FFFF00',
        },
        {
          toolId: 4,
          slotId: 1,
          materialName: 'PLA',
          toolMaterialColor: '#FF00FF',
          slotMaterialColor: '#FF00FF',
        }, // 5th mapping - too many
      ];

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: tooManyMappings,
      });

      expect(result).toBe(false);
    });

    it('should return false for empty material name', async () => {
      const invalidMappings: AD5XMaterialMapping[] = [
        {
          toolId: 0,
          slotId: 1,
          materialName: '', // Empty
          toolMaterialColor: '#FF0000',
          slotMaterialColor: '#FF0000',
        },
      ];

      const result = await jobControl.startAD5XMultiColorJob({
        fileName: 'test.3mf',
        levelingBeforePrint: true,
        materialMappings: invalidMappings,
      });

      expect(result).toBe(false);
    });
  });
});
