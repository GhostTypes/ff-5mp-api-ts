/**
 * @fileoverview Unit tests for MachineInfo transformation logic.
 */
import { describe, expect, it } from 'vitest';
import {
  type FFPrinterDetail,
  type IndepMatlInfo,
  MachineState,
  type MatlStationInfo,
} from './ff-models';
import { MachineInfo } from './MachineInfo';

const AD5X_PRINTER_DETAIL_JSON: FFPrinterDetail = {
  autoShutdown: 'close',
  autoShutdownTime: 30,
  cameraStreamUrl: '',
  chamberFanSpeed: 0,
  chamberTargetTemp: 0,
  chamberTemp: 0,
  clearFanStatus: 'open', // This field was in the example but not in FFPrinterDetail, assuming it's not standard or a typo. Will omit.
  coolingFanLeftSpeed: 0,
  coolingFanSpeed: 0,
  cumulativeFilament: 0.0,
  cumulativePrintTime: 0,
  currentPrintSpeed: 0,
  doorStatus: 'close',
  errorCode: '',
  estimatedLeftLen: 0, // For AD5X with material station, these might behave differently or be less relevant
  estimatedLeftWeight: 0.0,
  estimatedRightLen: 0, // For AD5X, this might represent the active extruder from station
  estimatedRightWeight: 0.0,
  estimatedTime: 0.0,
  externalFanStatus: 'close',
  fillAmount: 0,
  firmwareVersion: '1.1.3-1.0.8',
  flashRegisterCode: '',
  hasLeftFilament: false, // Could be true if direct extruder also used
  hasMatlStation: true,
  hasRightFilament: false, // Could be true if direct extruder also used
  indepMatlInfo: {
    materialColor: '',
    materialName: '?',
    stateAction: 0,
    stateStep: 0,
  },
  internalFanStatus: 'close',
  ipAddr: '192.168.0.204',
  leftFilamentType: '', // Might be populated by indepMatlInfo or active station slot
  leftTargetTemp: 0,
  leftTemp: 0,
  lightStatus: 'open',
  location: 'Group A',
  macAddr: '88:A9:A7:9D:2A:70',
  matlStationInfo: {
    currentLoadSlot: 0,
    currentSlot: 0,
    slotCnt: 4,
    slotInfos: [
      {
        hasFilament: true,
        materialColor: '#FFFFFF',
        materialName: 'PLA',
        slotId: 1,
      },
      {
        hasFilament: true,
        materialColor: '#2750E0',
        materialName: 'PLA',
        slotId: 2,
      },
      {
        hasFilament: true,
        materialColor: '#FEF043',
        materialName: 'PLA',
        slotId: 3,
      },
      {
        hasFilament: true,
        materialColor: '#F95D73',
        materialName: 'PLA',
        slotId: 4,
      },
    ],
    stateAction: 0,
    stateStep: 0,
  },
  measure: '220X220X220',
  name: 'AD5X',
  nozzleCnt: 1,
  nozzleModel: '0.4mm',
  nozzleStyle: 0,
  pid: 38,
  platTargetTemp: 0.0,
  platTemp: 27.75,
  polarRegisterCode: '',
  // "status", "printDuration", "printFileName" etc. are missing but MachineInfo.fromDetail handles defaults
};

// Basic mock for a non-AD5X printer (e.g., 5M)
const GENERIC_PRINTER_DETAIL_JSON: FFPrinterDetail = {
  name: 'FlashForge 5M',
  firmwareVersion: '1.0.0',
  ipAddr: '192.168.1.100',
  macAddr: 'AA:BB:CC:DD:EE:FF',
  coolingFanSpeed: 100,
  platTemp: 60.5,
  platTargetTemp: 60.0,
  rightTemp: 210.3,
  rightTargetTemp: 210.0,
  status: 'ready',
  cumulativePrintTime: 1200, // 20 hours in minutes
  cumulativeFilament: 500.75, // meters
  // No AD5X specific fields
};

describe('MachineInfo', () => {
  describe('fromDetail', () => {
    const machineInfoConverter = new MachineInfo();

    it('should correctly parse AD5X printer details', () => {
      const result = machineInfoConverter.fromDetail(AD5X_PRINTER_DETAIL_JSON);

      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.Name).toBe('AD5X');
      expect(result.IsAD5X).toBe(true);
      expect(result.IsPro).toBe(false); // As per our logic Name=AD5X implies IsPro=false
      expect(result.FirmwareVersion).toBe('1.1.3-1.0.8');
      expect(result.CameraStreamUrl).toBe('');

      expect(result.HasMatlStation).toBe(true);
      expect(result.CoolingFanLeftSpeed).toBe(0);
      expect(result.CoolingFanSpeed).toBe(0);

      // Check MatlStationInfo
      expect(result.MatlStationInfo).toBeDefined();
      const matlStation = result.MatlStationInfo as MatlStationInfo; // Type assertion for easier access
      expect(matlStation.currentLoadSlot).toBe(0);
      expect(matlStation.currentSlot).toBe(0);
      expect(matlStation.slotCnt).toBe(4);
      expect(matlStation.slotInfos).toHaveLength(4);
      expect(matlStation.slotInfos[0].materialName).toBe('PLA');
      expect(matlStation.slotInfos[0].slotId).toBe(1);
      expect(matlStation.slotInfos[1].materialColor).toBe('#2750E0');
      expect(matlStation.slotInfos[1].slotId).toBe(2);

      // Check IndepMatlInfo
      expect(result.IndepMatlInfo).toBeDefined();
      const indepMatl = result.IndepMatlInfo as IndepMatlInfo; // Type assertion
      expect(indepMatl.materialName).toBe('?');
      expect(indepMatl.stateAction).toBe(0);

      // Check some standard fields too
      expect(result.IpAddress).toBe('192.168.0.204');
      expect(result.MacAddress).toBe('88:A9:A7:9D:2A:70');
      expect(result.PrintBed.current).toBe(27.75);
      expect(result.Extruder.current).toBe(0); // Assuming rightTemp is for the active extruder
      expect(result.MachineState).toBe(MachineState.Unknown); // status was not in AD5X JSON, so defaults to Unknown
    });

    it('should detect AD5X from material station presence even with a custom printer name', () => {
      const customNamedAd5xDetail: FFPrinterDetail = {
        ...AD5X_PRINTER_DETAIL_JSON,
        name: 'E2E-AD5X',
      };

      const result = machineInfoConverter.fromDetail(customNamedAd5xDetail);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.Name).toBe('E2E-AD5X');
      expect(result.IsAD5X).toBe(true);
      expect(result.IsPro).toBe(false);
      expect(result.HasMatlStation).toBe(true);
    });

    it('should correctly parse generic (non-AD5X) printer details', () => {
      const result = machineInfoConverter.fromDetail(GENERIC_PRINTER_DETAIL_JSON);

      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.Name).toBe('FlashForge 5M');
      expect(result.IsAD5X).toBe(false);
      expect(result.IsPro).toBe(false); // "FlashForge 5M" does not contain "Pro"
      expect(result.FirmwareVersion).toBe('1.0.0');
      expect(result.CameraStreamUrl).toBe('');

      expect(result.HasMatlStation).toBeUndefined();
      expect(result.MatlStationInfo).toBeUndefined();
      expect(result.IndepMatlInfo).toBeUndefined();
      expect(result.CoolingFanLeftSpeed).toBeUndefined();

      expect(result.CoolingFanSpeed).toBe(100);
      expect(result.IpAddress).toBe('192.168.1.100');
      expect(result.PrintBed.current).toBe(60.5);
      expect(result.Extruder.current).toBe(210.3);
      expect(result.MachineState).toBe(MachineState.Ready);
      expect(result.FormattedTotalRunTime).toBe('20h:0m'); // 1200 minutes
    });

    it('should correctly identify a non-AD5X Pro model', () => {
      const proPrinterDetail: FFPrinterDetail = {
        ...GENERIC_PRINTER_DETAIL_JSON,
        name: 'FlashForge 5M Pro',
      };
      const result = machineInfoConverter.fromDetail(proPrinterDetail);
      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.Name).toBe('FlashForge 5M Pro');
      expect(result.IsAD5X).toBe(false);
      expect(result.IsPro).toBe(true);
    });

    it('should detect AD5X from pid when renamed without matl_station fields', () => {
      // Regression test for ff-5mp-hass#13: a user renamed their printer and
      // the name+capability fallback could no longer recognize the model.
      // The firmware-set integer pid is stable across renames.
      const renamedAd5x: FFPrinterDetail = {
        name: 'LegoTech82',
        pid: 38,
        firmwareVersion: '1.1.7-1.0.2',
        ipAddr: '192.168.1.120',
        status: 'ready',
      };

      const result = machineInfoConverter.fromDetail(renamedAd5x);

      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.Name).toBe('LegoTech82');
      expect(result.Pid).toBe(38);
      expect(result.IsAD5X).toBe(true);
      expect(result.IsPro).toBe(false);
    });

    it('should detect 5M Pro from pid even when renamed', () => {
      const renamedPro: FFPrinterDetail = {
        ...GENERIC_PRINTER_DETAIL_JSON,
        name: 'MyPrinter',
        pid: 36,
      };

      const result = machineInfoConverter.fromDetail(renamedPro);

      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.Name).toBe('MyPrinter');
      expect(result.Pid).toBe(36);
      expect(result.IsPro).toBe(true);
      expect(result.IsAD5X).toBe(false);
    });

    it('should treat pid 35 as a plain 5M even if name suggests Pro', () => {
      const plain5M: FFPrinterDetail = {
        ...GENERIC_PRINTER_DETAIL_JSON,
        name: 'FlashForge 5M Pro',
        pid: 35,
      };

      const result = machineInfoConverter.fromDetail(plain5M);

      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.Pid).toBe(35);
      expect(result.IsPro).toBe(false);
      expect(result.IsAD5X).toBe(false);
    });

    it('should fall back to name+capability when pid is absent', () => {
      const noPidAd5x: FFPrinterDetail = {
        ...AD5X_PRINTER_DETAIL_JSON,
        pid: undefined,
      };

      const result = machineInfoConverter.fromDetail(noPidAd5x);

      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.Pid).toBeUndefined();
      expect(result.IsAD5X).toBe(true); // detected via hasMatlStation fallback
      expect(result.IsPro).toBe(false);
    });

    it('should return null if detail is null', () => {
      const result = machineInfoConverter.fromDetail(null);
      expect(result).toBeNull();
    });

    // Test for default values if some fields are missing in FFPrinterDetail
    it('should handle missing optional fields gracefully with defaults', () => {
      const minimalDetail: FFPrinterDetail = { name: 'Minimal' };
      const result = machineInfoConverter.fromDetail(minimalDetail);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.Name).toBe('Minimal');
      expect(result.IsAD5X).toBe(false);
      expect(result.IsPro).toBe(false);
      expect(result.FirmwareVersion).toBe(''); // Defaults to empty string
      expect(result.CameraStreamUrl).toBe('');
      expect(result.CoolingFanSpeed).toBe(0); // Defaults to 0
      expect(result.PrintBed.current).toBe(0);
      expect(result.Extruder.set).toBe(0);
      expect(result.MachineState).toBe(MachineState.Unknown); // status is empty
    });

    it('preserves a populated camera stream URL from detail data', () => {
      const result = machineInfoConverter.fromDetail({
        ...GENERIC_PRINTER_DETAIL_JSON,
        cameraStreamUrl: 'http://192.168.1.100:8080/?action=stream',
      });

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.CameraStreamUrl).toBe('http://192.168.1.100:8080/?action=stream');
    });

    // --- Creator 5 series ---

    // Trimmed from a live Creator 5 Pro capture (firmware 1.9.2).
    const CREATOR5_PRO_DETAIL_JSON: FFPrinterDetail = {
      camera: 1,
      cameraStreamUrl: 'http://10.0.0.14:8080/?action=stream',
      doorStatus: 'close',
      firmwareVersion: '1.9.2',
      lidar: 1,
      measure: '256X256X256',
      model: 'Creator 5 Pro',
      name: 'Creator 5 Pro',
      nozzleCnt: 4,
      nozzleModel: '0.4mm',
      nozzleTargetTemps: [0, 0, 0, 0],
      nozzleTemps: [25, 26, 27, 28],
      pid: 41,
      platTemp: 25,
      platTargetTemp: 0,
      status: 'ready',
      matlStationInfo: {
        currentLoadSlot: 0,
        currentSlot: 0,
        slotCnt: 4,
        slotInfos: [
          { hasFilament: true, materialColor: '#4CAAF8', materialName: 'PLA', slotId: 1 },
          { hasFilament: true, materialColor: '#F435F6', materialName: 'PLA', slotId: 2 },
          { hasFilament: true, materialColor: '#FFF245', materialName: 'PLA', slotId: 3 },
          { hasFilament: true, materialColor: '#FFFFFF', materialName: 'PLA', slotId: 4 },
        ],
        stateAction: 0,
        stateStep: 0,
      },
    };

    it('parses Creator 5 Pro per-tool temps and Pro-only capabilities', () => {
      const result = machineInfoConverter.fromDetail(CREATOR5_PRO_DETAIL_JSON);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.IsCreator5).toBe(true);
      expect(result.IsCreator5Pro).toBe(true);
      expect(result.IsAD5X).toBe(false);
      expect(result.Model).toBe('Creator 5 Pro');

      // Four tool temps, in order, paired with their targets.
      expect(result.ToolTemps).toHaveLength(4);
      expect(result.ToolTemps[0]).toEqual({ current: 25, set: 0 });
      expect(result.ToolTemps[3]).toEqual({ current: 28, set: 0 });
      // Extruder mirrors the first tool's source field (rightTemp absent -> 0).
      expect(result.Extruder.current).toBe(0);

      // Pro-only: real door sensor, camera + lidar present.
      expect(result.HasDoorSensor).toBe(true);
      expect(result.HasCamera).toBe(true);
      expect(result.HasLidar).toBe(true);

      // Material station passes through.
      expect(result.MatlStationInfo?.slotCnt).toBe(4);
    });

    it('treats a plain Creator 5 as having no door sensor and derives its model name', () => {
      const plainC5: FFPrinterDetail = {
        ...CREATOR5_PRO_DETAIL_JSON,
        pid: 40,
        model: undefined, // older/plain firmware may omit `model`
        name: 'Shop C5',
        doorStatus: 'close',
      };

      const result = machineInfoConverter.fromDetail(plainC5);

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.IsCreator5).toBe(true);
      expect(result.IsCreator5Pro).toBe(false);
      // No real sensor on the plain C5: door must not be surfaced as meaningful.
      expect(result.HasDoorSensor).toBe(false);
      // Model falls back to the PID-derived immutable name, not the user name.
      expect(result.Model).toBe('Creator 5');
      expect(result.Name).toBe('Shop C5');
    });

    it('produces a single-element ToolTemps for single-nozzle models', () => {
      const result = machineInfoConverter.fromDetail({
        ...GENERIC_PRINTER_DETAIL_JSON,
        rightTemp: 210.3,
        rightTargetTemp: 210,
      });

      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.ToolTemps).toHaveLength(1);
      expect(result.ToolTemps[0]).toEqual({ current: 210.3, set: 210 });
      expect(result.HasDoorSensor).toBe(false);
    });
  });
});
