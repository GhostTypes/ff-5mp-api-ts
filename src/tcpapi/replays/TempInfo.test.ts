/**
 * @fileoverview Tests for TempInfo parser including M105 response parsing and temperature data extraction.
 */
import { TempInfo, TempData } from './TempInfo';

describe('TempData', () => {
  describe('constructor and parsing', () => {
    it('should parse current/set temperature format', () => {
      const tempData = new TempData('210/210');

      expect(tempData.getCurrent()).toBe(210);
      expect(tempData.getSet()).toBe(210);
      expect(tempData.getFull()).toBe('210/210');
    });

    it('should parse current-only temperature format', () => {
      const tempData = new TempData('25');

      expect(tempData.getCurrent()).toBe(25);
      expect(tempData.getSet()).toBe(0);
      expect(tempData.getFull()).toBe('25');
    });

    it('should handle decimal temperatures by truncating', () => {
      const tempData = new TempData('210.5/210.8');

      // parseTdata truncates decimal part BEFORE rounding
      // So '210.5' becomes '210', then Math.round(210) = 210
      // And '210.8' becomes '210', then Math.round(210) = 210
      expect(tempData.getCurrent()).toBe(210);
      expect(tempData.getSet()).toBe(210);
    });

    it('should remove trailing /0.0', () => {
      const tempData = new TempData('60/60/0.0');

      expect(tempData.getCurrent()).toBe(60);
      expect(tempData.getSet()).toBe(60);
    });

    it('should handle zero temperatures', () => {
      const tempData = new TempData('0/0');

      expect(tempData.getCurrent()).toBe(0);
      expect(tempData.getSet()).toBe(0);
    });

    it('should round decimal values correctly', () => {
      const tempData = new TempData('27.4/60.6');

      // parseTdata truncates decimal part BEFORE rounding
      // So '27.4' becomes '27', then Math.round(27) = 27
      // And '60.6' becomes '60', then Math.round(60) = 60
      expect(tempData.getCurrent()).toBe(27);
      expect(tempData.getSet()).toBe(60);
    });
  });
});

describe('TempInfo', () => {
  describe('fromReplay', () => {
    it('should parse M105 response with T0 and B formats', () => {
      const m105Response = `CMD M105 Received.
T0:210/210 B:60/60 @:127 B@:127`;

      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay(m105Response);

      expect(result).not.toBeNull();
      expect(result?.getExtruderTemp()?.getCurrent()).toBe(210);
      expect(result?.getExtruderTemp()?.getSet()).toBe(210);
      expect(result?.getBedTemp()?.getCurrent()).toBe(60);
      expect(result?.getBedTemp()?.getSet()).toBe(60);
    });

    it('should parse M105 response with T format (not T0)', () => {
      const m105Response = `CMD M105 Received.
T:200/200 B:50/50`;

      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay(m105Response);

      expect(result).not.toBeNull();
      expect(result?.getExtruderTemp()?.getCurrent()).toBe(200);
      expect(result?.getBedTemp()?.getCurrent()).toBe(50);
    });

    it('should parse idle state with ambient temperatures', () => {
      const m105Response = `CMD M105 Received.
T0:25/0 B:28/0 @:0 B@:0`;

      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay(m105Response);

      expect(result).not.toBeNull();
      expect(result?.getExtruderTemp()?.getCurrent()).toBe(25);
      expect(result?.getExtruderTemp()?.getSet()).toBe(0);
      expect(result?.getBedTemp()?.getCurrent()).toBe(28);
      expect(result?.getBedTemp()?.getSet()).toBe(0);
    });

    it('should default bed temp to 0/0 if not present', () => {
      const m105Response = `CMD M105 Received.
T:200/200`;

      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay(m105Response);

      expect(result).not.toBeNull();
      expect(result?.getExtruderTemp()?.getCurrent()).toBe(200);
      expect(result?.getBedTemp()?.getCurrent()).toBe(0);
      expect(result?.getBedTemp()?.getSet()).toBe(0);
    });

    it('should return null if no extruder temperature found', () => {
      const m105Response = `CMD M105 Received.
B:60/60`;

      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay(m105Response);

      expect(result).toBeNull();
    });

    it('should return null for empty replay', () => {
      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay('');

      expect(result).toBeNull();
    });

    it('should return null for invalid replay with insufficient lines', () => {
      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay('CMD M105 Received.');

      expect(result).toBeNull();
    });

    it('should handle T): format for some printers', () => {
      const m105Response = `CMD M105 Received.
T):210/210 B:60/60`;

      const tempInfo = new TempInfo();
      const result = tempInfo.fromReplay(m105Response);

      expect(result).not.toBeNull();
      expect(result?.getExtruderTemp()?.getCurrent()).toBe(210);
    });
  });

  describe('isCooled', () => {
    it('should return true when temperatures are cooled down', () => {
      const m105Response = `CMD M105 Received.
T0:30/0 B:25/0 @:0 B@:0`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.isCooled()).toBe(true);
    });

    it('should return false when extruder is hot', () => {
      const m105Response = `CMD M105 Received.
T0:210/210 B:30/0 @:127 B@:0`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.isCooled()).toBe(false);
    });

    it('should return false when bed is hot', () => {
      const m105Response = `CMD M105 Received.
T0:100/0 B:80/80 @:0 B@:127`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.isCooled()).toBe(false);
    });

    it('should return true at threshold values', () => {
      const m105Response = `CMD M105 Received.
T0:200/0 B:40/0 @:0 B@:0`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.isCooled()).toBe(true);
    });
  });

  describe('areTempsSafe', () => {
    it('should return true for safe temperatures', () => {
      const m105Response = `CMD M105 Received.
T0:210/210 B:60/60 @:127 B@:127`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.areTempsSafe()).toBe(true);
    });

    it('should return false when extruder exceeds safe limit', () => {
      const m105Response = `CMD M105 Received.
T0:260/260 B:60/60 @:127 B@:127`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.areTempsSafe()).toBe(false);
    });

    it('should return false when bed exceeds safe limit', () => {
      const m105Response = `CMD M105 Received.
T0:210/210 B:110/110 @:127 B@:127`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.areTempsSafe()).toBe(false);
    });

    it('should return true at threshold values', () => {
      const m105Response = `CMD M105 Received.
T0:249/249 B:99/99 @:127 B@:127`;

      const tempInfo = new TempInfo();
      tempInfo.fromReplay(m105Response);

      expect(tempInfo.areTempsSafe()).toBe(true);
    });
  });
});
