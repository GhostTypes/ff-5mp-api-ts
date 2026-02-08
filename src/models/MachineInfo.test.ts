/**
 * @fileoverview Unit tests for MachineInfo transformation logic.
 */
import { describe, it, expect } from 'vitest';
import { MachineInfo } from './MachineInfo';
import { FFPrinterDetail, MachineState, SlotInfo, MatlStationInfo, IndepMatlInfo } from './ff-models';

const AD5X_PRINTER_DETAIL_JSON: FFPrinterDetail = {
  "autoShutdown": "close",
  "autoShutdownTime": 30,
  "cameraStreamUrl": "",
  "chamberFanSpeed": 0,
  "chamberTargetTemp": 0,
  "chamberTemp": 0,
  "clearFanStatus": "open", // This field was in the example but not in FFPrinterDetail, assuming it's not standard or a typo. Will omit.
  "coolingFanLeftSpeed": 0,
  "coolingFanSpeed": 0,
  "cumulativeFilament": 0.0,
  "cumulativePrintTime": 0,
  "currentPrintSpeed": 0,
  "doorStatus": "close",
  "errorCode": "",
  "estimatedLeftLen": 0, // For AD5X with material station, these might behave differently or be less relevant
  "estimatedLeftWeight": 0.0,
  "estimatedRightLen": 0, // For AD5X, this might represent the active extruder from station
  "estimatedRightWeight": 0.0,
  "estimatedTime": 0.0,
  "externalFanStatus": "close",
  "fillAmount": 0,
  "firmwareVersion": "1.1.3-1.0.8",
  "flashRegisterCode": "",
  "hasLeftFilament": false, // Could be true if direct extruder also used
  "hasMatlStation": true,
  "hasRightFilament": false, // Could be true if direct extruder also used
  "indepMatlInfo": {
    "materialColor": "",
    "materialName": "?",
    "stateAction": 0,
    "stateStep": 0
  },
  "internalFanStatus": "close",
  "ipAddr": "192.168.0.204",
  "leftFilamentType": "", // Might be populated by indepMatlInfo or active station slot
  "leftTargetTemp": 0,
  "leftTemp": 0,
  "lightStatus": "open",
  "location": "Group A",
  "macAddr": "88:A9:A7:9D:2A:70",
  "matlStationInfo": {
    "currentLoadSlot": 0,
    "currentSlot": 0,
    "slotCnt": 4,
    "slotInfos": [
      {
        "hasFilament": true,
        "materialColor": "#FFFFFF",
        "materialName": "PLA",
        "slotId": 1
      },
      {
        "hasFilament": true,
        "materialColor": "#2750E0",
        "materialName": "PLA",
        "slotId": 2
      },
      {
        "hasFilament": true,
        "materialColor": "#FEF043",
        "materialName": "PLA",
        "slotId": 3
      },
      {
        "hasFilament": true,
        "materialColor": "#F95D73",
        "materialName": "PLA",
        "slotId": 4
      }
    ],
    "stateAction": 0,
    "stateStep": 0
  },
  "measure": "220X220X220",
  "name": "AD5X",
  "nozzleCnt": 1,
  "nozzleModel": "0.4mm",
  "nozzleStyle": 0,
  "pid": 38,
  "platTargetTemp": 0.0,
  "platTemp": 27.75,
  "polarRegisterCode": ""
  // "status", "printDuration", "printFileName" etc. are missing but MachineInfo.fromDetail handles defaults
};

// Basic mock for a non-AD5X printer (e.g., 5M)
const GENERIC_PRINTER_DETAIL_JSON: FFPrinterDetail = {
    "name": "FlashForge 5M",
    "firmwareVersion": "1.0.0",
    "ipAddr": "192.168.1.100",
    "macAddr": "AA:BB:CC:DD:EE:FF",
    "coolingFanSpeed": 100,
    "platTemp": 60.5,
    "platTargetTemp": 60.0,
    "rightTemp": 210.3,
    "rightTargetTemp": 210.0,
    "status": "ready",
    "cumulativePrintTime": 1200, // 20 hours in minutes
    "cumulativeFilament": 500.75, // meters
    // No AD5X specific fields
};


describe('MachineInfo', () => {
  describe('fromDetail', () => {
    const machineInfoConverter = new MachineInfo();

    it('should correctly parse AD5X printer details', () => {
      const result = machineInfoConverter.fromDetail(AD5X_PRINTER_DETAIL_JSON);

      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.Name).toBe("AD5X");
      expect(result.IsAD5X).toBe(true);
      expect(result.IsPro).toBe(false); // As per our logic Name=AD5X implies IsPro=false
      expect(result.FirmwareVersion).toBe("1.1.3-1.0.8");

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
      expect(matlStation.slotInfos[0].materialName).toBe("PLA");
      expect(matlStation.slotInfos[0].slotId).toBe(1);
      expect(matlStation.slotInfos[1].materialColor).toBe("#2750E0");
      expect(matlStation.slotInfos[1].slotId).toBe(2);

      // Check IndepMatlInfo
      expect(result.IndepMatlInfo).toBeDefined();
      const indepMatl = result.IndepMatlInfo as IndepMatlInfo; // Type assertion
      expect(indepMatl.materialName).toBe("?");
      expect(indepMatl.stateAction).toBe(0);

      // Check some standard fields too
      expect(result.IpAddress).toBe("192.168.0.204");
      expect(result.MacAddress).toBe("88:A9:A7:9D:2A:70");
      expect(result.PrintBed.current).toBe(27.75);
      expect(result.Extruder.current).toBe(0); // Assuming rightTemp is for the active extruder
      expect(result.MachineState).toBe(MachineState.Unknown); // status was not in AD5X JSON, so defaults to Unknown
    });

    it('should correctly parse generic (non-AD5X) printer details', () => {
      const result = machineInfoConverter.fromDetail(GENERIC_PRINTER_DETAIL_JSON);

      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.Name).toBe("FlashForge 5M");
      expect(result.IsAD5X).toBe(false);
      expect(result.IsPro).toBe(false); // "FlashForge 5M" does not contain "Pro"
      expect(result.FirmwareVersion).toBe("1.0.0");

      expect(result.HasMatlStation).toBeUndefined();
      expect(result.MatlStationInfo).toBeUndefined();
      expect(result.IndepMatlInfo).toBeUndefined();
      expect(result.CoolingFanLeftSpeed).toBeUndefined();

      expect(result.CoolingFanSpeed).toBe(100);
      expect(result.IpAddress).toBe("192.168.1.100");
      expect(result.PrintBed.current).toBe(60.5);
      expect(result.Extruder.current).toBe(210.3);
      expect(result.MachineState).toBe(MachineState.Ready);
      expect(result.FormattedTotalRunTime).toBe("20h:0m"); // 1200 minutes
    });

    it('should correctly identify a non-AD5X Pro model', () => {
        const proPrinterDetail: FFPrinterDetail = {
            ...GENERIC_PRINTER_DETAIL_JSON,
            name: "FlashForge 5M Pro",
        };
        const result = machineInfoConverter.fromDetail(proPrinterDetail);
        expect(result).not.toBeNull();
        if (!result) return;

        expect(result.Name).toBe("FlashForge 5M Pro");
        expect(result.IsAD5X).toBe(false);
        expect(result.IsPro).toBe(true);
    });

    it('should return null if detail is null', () => {
      const result = machineInfoConverter.fromDetail(null);
      expect(result).toBeNull();
    });

    // Test for default values if some fields are missing in FFPrinterDetail
    it('should handle missing optional fields gracefully with defaults', () => {
        const minimalDetail: FFPrinterDetail = { name: "Minimal" };
        const result = machineInfoConverter.fromDetail(minimalDetail);

        expect(result).not.toBeNull();
        if (!result) return;

        expect(result.Name).toBe("Minimal");
        expect(result.IsAD5X).toBe(false);
        expect(result.IsPro).toBe(false);
        expect(result.FirmwareVersion).toBe(""); // Defaults to empty string
        expect(result.CoolingFanSpeed).toBe(0); // Defaults to 0
        expect(result.PrintBed.current).toBe(0);
        expect(result.Extruder.set).toBe(0);
        expect(result.MachineState).toBe(MachineState.Unknown); // status is empty
    });
  });
});
