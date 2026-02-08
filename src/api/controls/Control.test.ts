/**
 * @fileoverview Unit tests for Control module.
 * Tests HTTP API control operations including homing, filtration, camera, fans, LEDs, and filament operations using mocked clients.
 */
import axios from 'axios';
import type { FiveMClient } from '../../FiveMClient';
import type { FlashForgeClient } from '../../tcpapi/FlashForgeClient';
import { Commands } from '../server/Commands';
import { Endpoints } from '../server/Endpoints';
import { Control } from './Control';
import type { Info } from './Info';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../tcpapi/FlashForgeClient');

describe('Control', () => {
  let mockFiveMClient: FiveMClient;
  let mockTcpClient: jest.Mocked<FlashForgeClient>;
  let mockInfo: jest.Mocked<Info>;
  let control: Control;

  beforeEach(() => {
    mockedAxios.post.mockReset();

    mockTcpClient = {
      homeAxes: jest.fn().mockResolvedValue(true),
      rapidHome: jest.fn().mockResolvedValue(true),
      turnRunoutSensorOn: jest.fn().mockResolvedValue(true),
      turnRunoutSensorOff: jest.fn().mockResolvedValue(true),
      prepareFilamentLoad: jest.fn().mockResolvedValue(true),
      loadFilament: jest.fn().mockResolvedValue(true),
      finishFilamentLoad: jest.fn().mockResolvedValue(true),
    } as any;

    mockInfo = {
      get: jest.fn().mockResolvedValue({
        Status: 'ready',
        CurrentPrintLayer: 5,
      }),
    } as any;

    mockFiveMClient = {
      tcpClient: mockTcpClient,
      info: mockInfo,
      serialNumber: 'SN123456',
      checkCode: 'CC123456',
      filtrationControl: true,
      ledControl: true,
      isPro: true,
      isHttpClientBusy: jest.fn().mockResolvedValue(undefined),
      releaseHttpClient: jest.fn(),
      getEndpoint: (endpoint: string) => `http://printer:8898${endpoint}`,
    } as any;

    control = new Control(mockFiveMClient);
  });

  describe('homeAxes', () => {
    it('should home all axes successfully', async () => {
      const result = await control.homeAxes();

      expect(result).toBe(true);
      expect(mockTcpClient.homeAxes).toHaveBeenCalled();
    });

    it('should return false when TCP client fails', async () => {
      mockTcpClient.homeAxes.mockResolvedValue(false);

      const result = await control.homeAxes();

      expect(result).toBe(false);
    });
  });

  describe('homeAxesRapid', () => {
    it('should perform rapid home successfully', async () => {
      const result = await control.homeAxesRapid();

      expect(result).toBe(true);
      expect(mockTcpClient.rapidHome).toHaveBeenCalled();
    });
  });

  describe('filtration controls', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });
    });

    it('should turn on external filtration', async () => {
      const result = await control.setExternalFiltrationOn();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.CirculationControlCmd,
            args: {
              internal: 'close',
              external: 'open',
            },
          },
        }),
        expect.any(Object)
      );
    });

    it('should turn on internal filtration', async () => {
      const result = await control.setInternalFiltrationOn();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.CirculationControlCmd,
            args: {
              internal: 'open',
              external: 'close',
            },
          },
        }),
        expect.any(Object)
      );
    });

    it('should turn off filtration', async () => {
      const result = await control.setFiltrationOff();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.CirculationControlCmd,
            args: {
              internal: 'close',
              external: 'close',
            },
          },
        }),
        expect.any(Object)
      );
    });

    it('should return false if filtration not equipped', async () => {
      mockFiveMClient.filtrationControl = false;

      const result = await control.setExternalFiltrationOn();

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('camera controls', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });
    });

    it('should turn camera on for Pro models', async () => {
      const result = await control.turnCameraOn();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.CameraControlCmd,
            args: { action: 'open' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should turn camera off for Pro models', async () => {
      const result = await control.turnCameraOff();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.CameraControlCmd,
            args: { action: 'close' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should return false for non-Pro models', async () => {
      mockFiveMClient.isPro = false;

      const resultOn = await control.turnCameraOn();
      const resultOff = await control.turnCameraOff();

      expect(resultOn).toBe(false);
      expect(resultOff).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('speed and offset controls', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });
      mockInfo.get.mockResolvedValue({
        Status: 'printing',
        CurrentPrintLayer: 10,
      });
    });

    it('should set speed override', async () => {
      const result = await control.setSpeedOverride(150);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.PrinterControlCmd,
            args: expect.objectContaining({
              speed: 150,
            }),
          },
        }),
        expect.any(Object)
      );
    });

    it('should set Z-axis override', async () => {
      const result = await control.setZAxisOverride(0.2);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.PrinterControlCmd,
            args: expect.objectContaining({
              zAxisCompensation: 0.2,
            }),
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('fan controls', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });
      mockInfo.get.mockResolvedValue({
        Status: 'printing',
        CurrentPrintLayer: 10,
      });
    });

    it('should set chamber fan speed', async () => {
      const result = await control.setChamberFanSpeed(75);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.PrinterControlCmd,
            args: expect.objectContaining({
              chamberFan: 75,
            }),
          },
        }),
        expect.any(Object)
      );
    });

    it('should set cooling fan speed', async () => {
      const result = await control.setCoolingFanSpeed(80);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.PrinterControlCmd,
            args: expect.objectContaining({
              coolingFan: 80,
            }),
          },
        }),
        expect.any(Object)
      );
    });

    it('should set fan speeds to 0 for initial layers', async () => {
      mockInfo.get.mockResolvedValue({
        Status: 'printing',
        CurrentPrintLayer: 1,
      });

      await control.setChamberFanSpeed(100);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.PrinterControlCmd,
            args: expect.objectContaining({
              chamberFan: 0,
              coolingFan: 0,
            }),
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('LED controls', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });
    });

    it('should turn LED on', async () => {
      const result = await control.setLedOn();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.LightControlCmd,
            args: { status: 'open' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should turn LED off', async () => {
      const result = await control.setLedOff();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.LightControlCmd,
            args: { status: 'close' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should return false if LED not equipped', async () => {
      mockFiveMClient.ledControl = false;

      const resultOn = await control.setLedOn();
      const resultOff = await control.setLedOff();

      expect(resultOn).toBe(false);
      expect(resultOff).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('runout sensor controls', () => {
    it('should turn runout sensor on', async () => {
      const result = await control.turnRunoutSensorOn();

      expect(result).toBe(true);
      expect(mockTcpClient.turnRunoutSensorOn).toHaveBeenCalled();
    });

    it('should turn runout sensor off', async () => {
      const result = await control.turnRunoutSensorOff();

      expect(result).toBe(true);
      expect(mockTcpClient.turnRunoutSensorOff).toHaveBeenCalled();
    });
  });

  describe('filament operations', () => {
    it('should prepare filament load', async () => {
      const filament = { name: 'PLA', loadTemp: 200 };
      const result = await control.prepareFilamentLoad(filament);

      expect(result).toBe(true);
      expect(mockTcpClient.prepareFilamentLoad).toHaveBeenCalledWith(filament);
    });

    it('should load filament', async () => {
      const result = await control.loadFilament();

      expect(result).toBe(true);
      expect(mockTcpClient.loadFilament).toHaveBeenCalled();
    });

    it('should finish filament load', async () => {
      const result = await control.finishFilamentLoad();

      expect(result).toBe(true);
      expect(mockTcpClient.finishFilamentLoad).toHaveBeenCalled();
    });
  });

  describe('sendControlCommand', () => {
    it('should send control command successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });

      const result = await control.sendControlCommand('test_cmd', { test: 'value' });

      expect(result).toBe(true);
      expect(mockFiveMClient.isHttpClientBusy).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        {
          serialNumber: 'SN123456',
          checkCode: 'CC123456',
          payload: {
            cmd: 'test_cmd',
            args: { test: 'value' },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(mockFiveMClient.releaseHttpClient).toHaveBeenCalled();
    });

    it('should return false for non-OK response', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 1, message: 'Error' },
      });

      const result = await control.sendControlCommand('test_cmd', {});

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await control.sendControlCommand('test_cmd', {});

      expect(result).toBe(false);
    });

    it('should always release HTTP client even on error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await control.sendControlCommand('test_cmd', {});

      expect(mockFiveMClient.releaseHttpClient).toHaveBeenCalled();
    });
  });

  describe('sendJobControlCmd', () => {
    it('should send job control command', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });

      const result = await control.sendJobControlCmd('pause');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.JobControlCmd,
            args: {
              jobID: '',
              action: 'pause',
            },
          },
        }),
        expect.any(Object)
      );
    });
  });
});
