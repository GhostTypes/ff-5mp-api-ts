/**
 * @fileoverview Unit tests for Control module.
 * Tests HTTP API control operations including homing, filtration, camera, fans, LEDs, and filament operations using mocked clients.
 */

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FiveMClient } from '../../FiveMClient';
import { SlotAction } from '../../models/ff-models';
import type { FlashForgeClient } from '../../tcpapi/FlashForgeClient';
import { Commands } from '../server/Commands';
import { Endpoints } from '../server/Endpoints';
import { Control } from './Control';
import type { Info } from './Info';

vi.mock('axios');
const mockedAxios = axios as typeof axios & {
  post: ReturnType<typeof vi.fn>;
};

vi.mock('../../tcpapi/FlashForgeClient');

describe('Control', () => {
  let mockFiveMClient: FiveMClient;
  let mockTcpClient: FlashForgeClient & {
    homeAxes: ReturnType<typeof vi.fn>;
    rapidHome: ReturnType<typeof vi.fn>;
    turnRunoutSensorOn: ReturnType<typeof vi.fn>;
    turnRunoutSensorOff: ReturnType<typeof vi.fn>;
    prepareFilamentLoad: ReturnType<typeof vi.fn>;
    loadFilament: ReturnType<typeof vi.fn>;
    finishFilamentLoad: ReturnType<typeof vi.fn>;
  };
  let mockInfo: Info & {
    get: ReturnType<typeof vi.fn>;
  };
  let control: Control;

  beforeEach(() => {
    mockedAxios.post.mockReset();

    mockTcpClient = {
      homeAxes: vi.fn().mockResolvedValue(true),
      rapidHome: vi.fn().mockResolvedValue(true),
      turnRunoutSensorOn: vi.fn().mockResolvedValue(true),
      turnRunoutSensorOff: vi.fn().mockResolvedValue(true),
      prepareFilamentLoad: vi.fn().mockResolvedValue(true),
      loadFilament: vi.fn().mockResolvedValue(true),
      finishFilamentLoad: vi.fn().mockResolvedValue(true),
    } as any;

    mockInfo = {
      get: vi.fn().mockResolvedValue({
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
      isHttpClientBusy: vi.fn().mockResolvedValue(undefined),
      releaseHttpClient: vi.fn(),
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

  describe('AD5X material station (IFS) slot operations', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: { code: 0, message: 'Success' },
      });
      mockFiveMClient.isAD5X = true;
    });

    it('should configure a slot and strip the leading # from the color', async () => {
      const result = await control.configureSlot(1, 'PLA', '#FF0000');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.MaterialStationConfigCmd,
            args: { slot: 1, mt: 'PLA', rgb: 'FF0000' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should accept a color that already lacks a # prefix', async () => {
      await control.configureSlot(2, 'PETG', '46328E');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.MaterialStationConfigCmd,
            args: { slot: 2, mt: 'PETG', rgb: '46328E' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should send a load slot action', async () => {
      const result = await control.slotAction(1, SlotAction.Load);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.MaterialStationCmd,
            args: { slot: 1, action: 0 },
          },
        }),
        expect.any(Object)
      );
    });

    it('should send unload and cancel slot actions with the correct codes', async () => {
      await control.slotAction(3, SlotAction.Unload);
      expect(mockedAxios.post).toHaveBeenLastCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.MaterialStationCmd,
            args: { slot: 3, action: 1 },
          },
        }),
        expect.any(Object)
      );

      await control.slotAction(0, SlotAction.Cancel);
      expect(mockedAxios.post).toHaveBeenLastCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.MaterialStationCmd,
            args: { slot: 0, action: 2 },
          },
        }),
        expect.any(Object)
      );
    });

    it('should refuse slot operations on non-AD5X / non-Creator 5 printers', async () => {
      mockFiveMClient.isAD5X = false;
      mockFiveMClient.isCreator5 = false;

      const configResult = await control.configureSlot(1, 'PLA', '#FF0000');
      const actionResult = await control.slotAction(1, SlotAction.Load);

      expect(configResult).toBe(false);
      expect(actionResult).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should allow configureSlot on a Creator 5 (msConfig_cmd is shared firmware)', async () => {
      mockFiveMClient.isAD5X = false;
      mockFiveMClient.isCreator5 = true;

      const result = await control.configureSlot(2, 'PETG', '#46328E');

      // Creator 5: color must be an exact firmware palette match — uppercase
      // "#RRGGBB" WITH the leading "#". #46328E is off-palette and snaps to the
      // nearest C5 entry, Purple (#48358C). NOT the stripped AD5X value.
      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://printer:8898${Endpoints.Control}`,
        expect.objectContaining({
          payload: {
            cmd: Commands.MaterialStationConfigCmd,
            args: { slot: 2, mt: 'PETG', rgb: '#48358C' },
          },
        }),
        expect.any(Object)
      );
    });

    it('should still refuse slotAction (load/unload) on a Creator 5 — no ms_cmd in firmware', async () => {
      mockFiveMClient.isAD5X = false;
      mockFiveMClient.isCreator5 = true;

      const result = await control.slotAction(1, SlotAction.Load);

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  // Creator 5 / Creator 5 Pro slot color: the firmware renders an icon ONLY on a
  // byte-for-byte, case-sensitive match against its 24-entry palette (WITH the
  // "#"). configureSlot must snap the caller's color to the nearest palette entry
  // and emit uppercase "#RRGGBB" — never an off-list or stripped value.
  describe('Creator 5 material-station slot color (palette snapping)', () => {
    const paletteHexes = [
      '#FFFFFF', '#FFF245', '#DEF578', '#21CC3D', '#167A4B', '#156682', '#24E4A0',
      '#7BD9F0', '#4CAAF8', '#2E54DD', '#48358C', '#A341F7', '#F435F6', '#D5B4DE',
      '#FA6173', '#F82D29', '#805003', '#F9903B', '#FCEBD7', '#D5C5A1', '#B17C38',
      '#8C8C89', '#BEBEBE', '#1B1B1B',
    ];

    const captureRgb = async (hexRgb: string): Promise<string> => {
      mockedAxios.post.mockClear();
      await control.configureSlot(1, 'PLA', hexRgb);
      const call = mockedAxios.post.mock.calls[0];
      const payload = call[1] as { payload: { args: { rgb: string } } };
      return payload.payload.args.rgb;
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({ status: 200, data: { code: 0, message: 'Success' } });
      mockFiveMClient.isAD5X = false;
      mockFiveMClient.isCreator5 = true;
    });

    it('always snaps to a value from the 24-entry C5 palette (never off-list)', async () => {
      const inputs = ['#FF0000', '#123456', '#00FF00', '#ABCDEF', '#A341F7', '#112233', '#FEDCBA'];
      for (const input of inputs) {
        const rgb = await captureRgb(input);
        expect(paletteHexes).toContain(rgb);
      }
    });

    it('always emits uppercase hex with a leading "#"', async () => {
      const rgb = await captureRgb('#ff0000');
      expect(rgb.startsWith('#')).toBe(true);
      expect(rgb).toBe(rgb.toUpperCase());
      expect(rgb).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('snaps #FF0000 (pure red) to #F82D29 (nearest palette red)', async () => {
      expect(await captureRgb('#FF0000')).toBe('#F82D29');
    });

    it('snaps an exact palette entry to itself (case-normalized)', async () => {
      expect(await captureRgb('#4CAAF8')).toBe('#4CAAF8');
      expect(await captureRgb('#4caaf8')).toBe('#4CAAF8');
      expect(await captureRgb('4caaF8')).toBe('#4CAAF8');
    });

    it('snaps white to #FFFFFF', async () => {
      expect(await captureRgb('#FFFFFF')).toBe('#FFFFFF');
      expect(await captureRgb('#FFF')).toBe('#FFFFFF');
    });

    // REGRESSION GUARD: the AD5X path must remain unchanged — freeform hex with
    // the leading "#" stripped, no palette snapping.
    it('AD5X path is unchanged: strips "#" and keeps freeform hex (no snapping)', async () => {
      mockFiveMClient.isAD5X = true;
      mockFiveMClient.isCreator5 = false;

      expect(await captureRgb('#FF0000')).toBe('FF0000');
      expect(await captureRgb('#46328E')).toBe('46328E');
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

  // HTTP-only printers (Creator 5 / 5 Pro) have no TCP control channel, so the
  // TCP-bound operations must fail cleanly (return false) without touching the
  // dead socket, rather than hang.
  describe('HTTP-only mode (no TCP channel)', () => {
    let httpControl: Control;

    beforeEach(() => {
      const httpClient = { ...mockFiveMClient, httpOnly: true } as any;
      httpControl = new Control(httpClient);
    });

    it('homeAxes returns false without calling the TCP client', async () => {
      const result = await httpControl.homeAxes();
      expect(result).toBe(false);
      expect(mockTcpClient.homeAxes).not.toHaveBeenCalled();
    });

    it('homeAxesRapid returns false without calling the TCP client', async () => {
      const result = await httpControl.homeAxesRapid();
      expect(result).toBe(false);
      expect(mockTcpClient.rapidHome).not.toHaveBeenCalled();
    });

    it('turnRunoutSensorOn/Off return false without calling the TCP client', async () => {
      expect(await httpControl.turnRunoutSensorOn()).toBe(false);
      expect(await httpControl.turnRunoutSensorOff()).toBe(false);
      expect(mockTcpClient.turnRunoutSensorOn).not.toHaveBeenCalled();
      expect(mockTcpClient.turnRunoutSensorOff).not.toHaveBeenCalled();
    });

    it('filament load operations return false without calling the TCP client', async () => {
      expect(await httpControl.loadFilament()).toBe(false);
      expect(await httpControl.finishFilamentLoad()).toBe(false);
      expect(mockTcpClient.loadFilament).not.toHaveBeenCalled();
      expect(mockTcpClient.finishFilamentLoad).not.toHaveBeenCalled();
    });

    it('HTTP-based controls (LED) still dispatch over HTTP', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200, data: { code: 0, message: 'ok' } });
      await httpControl.setLedOn();
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });
});
