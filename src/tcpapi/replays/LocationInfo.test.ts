import { LocationInfo } from './LocationInfo';

describe('LocationInfo', () => {
  describe('fromReplay', () => {
    const validM114Response = `ok M114
X:10.00 Y:20.50 Z:5.25 E:0.00`;

    it('should parse a valid M114 response correctly', () => {
      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(validM114Response);

      expect(result).not.toBeNull();
      expect(result?.X).toBe('10.00');
      expect(result?.Y).toBe('20.50');
      expect(result?.Z).toBe('5.25');
    });

    it('should handle different coordinate values', () => {
      const response = `ok M114
X:0.00 Y:0.00 Z:0.00 E:0.00`;

      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.X).toBe('0.00');
      expect(result?.Y).toBe('0.00');
      expect(result?.Z).toBe('0.00');
    });

    it('should handle negative coordinates', () => {
      const response = `ok M114
X:-5.00 Y:-10.00 Z:15.00 E:0.00`;

      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.X).toBe('-5.00');
      expect(result?.Y).toBe('-10.00');
      expect(result?.Z).toBe('15.00');
    });

    it('should handle large coordinate values', () => {
      const response = `ok M114
X:220.00 Y:220.00 Z:220.00 E:100.00`;

      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.X).toBe('220.00');
      expect(result?.Y).toBe('220.00');
      expect(result?.Z).toBe('220.00');
    });

    it('should handle standard spacing', () => {
      const response = `ok M114
X:10.00 Y:20.50 Z:5.25 E:0.00`;

      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.X).toBe('10.00');
      expect(result?.Y).toBe('20.50');
      expect(result?.Z).toBe('5.25');
    });

    it('should return null for invalid response', () => {
      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay('invalid');

      expect(result).toBeNull();
    });

    it('should return null for empty response', () => {
      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay('');

      expect(result).toBeNull();
    });

    it('should return null for response with missing data', () => {
      const response = `ok M114`;

      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(response);

      expect(result).toBeNull();
    });

    it('should handle high precision coordinates', () => {
      const response = `ok M114
X:10.12345 Y:20.98765 Z:5.55555 E:0.00`;

      const locationInfo = new LocationInfo();
      const result = locationInfo.fromReplay(response);

      expect(result).not.toBeNull();
      expect(result?.X).toBe('10.12345');
      expect(result?.Y).toBe('20.98765');
      expect(result?.Z).toBe('5.55555');
    });
  });

  describe('toString', () => {
    it('should format location info correctly', () => {
      const locationInfo = new LocationInfo();
      locationInfo.X = '10.00';
      locationInfo.Y = '20.50';
      locationInfo.Z = '5.25';

      const result = locationInfo.toString();

      expect(result).toBe('X: 10.00 Y: 20.50 Z: 5.25');
    });

    it('should handle zero coordinates', () => {
      const locationInfo = new LocationInfo();
      locationInfo.X = '0.00';
      locationInfo.Y = '0.00';
      locationInfo.Z = '0.00';

      const result = locationInfo.toString();

      expect(result).toBe('X: 0.00 Y: 0.00 Z: 0.00');
    });

    it('should handle negative coordinates', () => {
      const locationInfo = new LocationInfo();
      locationInfo.X = '-5.00';
      locationInfo.Y = '-10.00';
      locationInfo.Z = '15.00';

      const result = locationInfo.toString();

      expect(result).toBe('X: -5.00 Y: -10.00 Z: 15.00');
    });
  });
});
