/**
 * @fileoverview Tests for EndstopStatus parser including M119 response parsing and status checking methods.
 */
import { EndstopStatus, Endstop, Status, MachineStatus, MoveMode } from './EndstopStatus';

describe('Endstop', () => {
  it('should parse endstop values correctly', () => {
    const endstop = new Endstop('Endstop X-max:0 Y-max:0 Z-min:1');

    expect(endstop.Xmax).toBe(0);
    expect(endstop.Ymax).toBe(0);
    expect(endstop.Zmin).toBe(1);
  });

  it('should parse all triggered endstops', () => {
    const endstop = new Endstop('Endstop X-max:1 Y-max:1 Z-min:1');

    expect(endstop.Xmax).toBe(1);
    expect(endstop.Ymax).toBe(1);
    expect(endstop.Zmin).toBe(1);
  });

  it('should return -1 for missing values', () => {
    const endstop = new Endstop('Endstop invalid');

    expect(endstop.Xmax).toBe(-1);
    expect(endstop.Ymax).toBe(-1);
    expect(endstop.Zmin).toBe(-1);
  });
});

describe('Status', () => {
  it('should parse status flags correctly', () => {
    const status = new Status('Status S:0 L:0 J:0 F:0');

    expect(status.S).toBe(0);
    expect(status.L).toBe(0);
    expect(status.J).toBe(0);
    expect(status.F).toBe(0);
  });

  it('should parse non-zero status flags', () => {
    const status = new Status('Status S:1 L:2 J:3 F:4');

    expect(status.S).toBe(1);
    expect(status.L).toBe(2);
    expect(status.J).toBe(3);
    expect(status.F).toBe(4);
  });

  it('should return -1 for missing flags', () => {
    const status = new Status('Status invalid');

    expect(status.S).toBe(-1);
    expect(status.L).toBe(-1);
    expect(status.J).toBe(-1);
    expect(status.F).toBe(-1);
  });
});

describe('EndstopStatus', () => {
  describe('fromReplay', () => {
    const validReplay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:1
MachineStatus: READY
MoveMode: READY
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: test.gcode`;

    it('should parse a valid M119 response correctly', () => {
      const status = new EndstopStatus();
      const result = status.fromReplay(validReplay);

      expect(result).not.toBeNull();
      expect(result?._Endstop?.Xmax).toBe(0);
      expect(result?._Endstop?.Ymax).toBe(0);
      expect(result?._Endstop?.Zmin).toBe(1);
      expect(result?._MachineStatus).toBe(MachineStatus.READY);
      expect(result?._MoveMode).toBe(MoveMode.READY);
      expect(result?._LedEnabled).toBe(true);
      expect(result?._CurrentFile).toBe('test.gcode');
    });

    it('should parse BUILDING_FROM_SD status', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: BUILDING_FROM_SD
MoveMode: MOVING
Status S:1 L:0 J:0 F:0
LED: 1
CurrentFile: print.3mf`;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MachineStatus).toBe(MachineStatus.BUILDING_FROM_SD);
      expect(result?._MoveMode).toBe(MoveMode.MOVING);
      expect(result?.isPrinting()).toBe(true);
    });

    it('should parse BUILDING_COMPLETED status', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: BUILDING_COMPLETED
MoveMode: READY
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: finished.3mf`;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MachineStatus).toBe(MachineStatus.BUILDING_COMPLETED);
      expect(result?.isPrintComplete()).toBe(true);
    });

    it('should parse PAUSED status', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: PAUSED
MoveMode: PAUSED
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: paused.3mf`;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MachineStatus).toBe(MachineStatus.PAUSED);
      expect(result?._MoveMode).toBe(MoveMode.PAUSED);
      expect(result?.isPaused()).toBe(true);
    });

    it('should parse HOMING move mode', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: BUSY
MoveMode: HOMING
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: `;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MoveMode).toBe(MoveMode.HOMING);
      expect(result?._MachineStatus).toBe(MachineStatus.BUSY);
    });

    it('should parse WAIT_ON_TOOL move mode', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: BUSY
MoveMode: WAIT_ON_TOOL
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: `;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MoveMode).toBe(MoveMode.WAIT_ON_TOOL);
    });

    it('should handle LED disabled', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: READY
MoveMode: READY
Status S:0 L:0 J:0 F:0
LED: 0
CurrentFile: `;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._LedEnabled).toBe(false);
    });

    it('should handle empty current file', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: READY
MoveMode: READY
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: `;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._CurrentFile).toBeNull();
    });

    it('should return null for empty replay', () => {
      const status = new EndstopStatus();
      const result = status.fromReplay('');

      expect(result).toBeNull();
    });

    it('should handle unknown machine status', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: UNKNOWN_STATUS
MoveMode: READY
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: `;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MachineStatus).toBe(MachineStatus.DEFAULT);
    });

    it('should handle unknown move mode', () => {
      const replay = `CMD M119 Received.
Endstop X-max:0 Y-max:0 Z-min:0
MachineStatus: READY
MoveMode: UNKNOWN_MODE
Status S:0 L:0 J:0 F:0
LED: 1
CurrentFile: `;

      const status = new EndstopStatus();
      const result = status.fromReplay(replay);

      expect(result).not.toBeNull();
      expect(result?._MoveMode).toBe(MoveMode.DEFAULT);
    });
  });

  describe('status checking methods', () => {
    it('isReady should return true when both mode and status are READY', () => {
      const status = new EndstopStatus();
      status._MachineStatus = MachineStatus.READY;
      status._MoveMode = MoveMode.READY;

      expect(status.isReady()).toBe(true);
    });

    it('isReady should return false when only status is READY', () => {
      const status = new EndstopStatus();
      status._MachineStatus = MachineStatus.READY;
      status._MoveMode = MoveMode.MOVING;

      expect(status.isReady()).toBe(false);
    });

    it('isPaused should return true when MachineStatus is PAUSED', () => {
      const status = new EndstopStatus();
      status._MachineStatus = MachineStatus.PAUSED;
      status._MoveMode = MoveMode.READY;

      expect(status.isPaused()).toBe(true);
    });

    it('isPaused should return true when MoveMode is PAUSED', () => {
      const status = new EndstopStatus();
      status._MachineStatus = MachineStatus.READY;
      status._MoveMode = MoveMode.PAUSED;

      expect(status.isPaused()).toBe(true);
    });
  });
});
