/**
 * @fileoverview Tests for NetworkUtils class
 *
 * Verifies response validation logic for successful and failed API responses.
 */
import { describe, it, expect } from 'vitest';
import { NetworkUtils } from './NetworkUtils';
import { FNetCode } from './FNetCode';
import { GenericResponse } from '../controls/Control';

describe('NetworkUtils', () => {
  describe('isOk', () => {
    it('should return true for a successful response', () => {
      const response: GenericResponse = {
        code: FNetCode.Ok,
        message: 'Success'
      };

      expect(NetworkUtils.isOk(response)).toBe(true);
    });

    it('should return false if code is not Ok', () => {
      const response: GenericResponse = {
        code: 1,
        message: 'Success'
      };

      expect(NetworkUtils.isOk(response)).toBe(false);
    });

    it('should return false if message is not "Success"', () => {
      const response: GenericResponse = {
        code: FNetCode.Ok,
        message: 'Failed'
      };

      expect(NetworkUtils.isOk(response)).toBe(false);
    });

    it('should return false if both code and message are incorrect', () => {
      const response: GenericResponse = {
        code: 1,
        message: 'Error'
      };

      expect(NetworkUtils.isOk(response)).toBe(false);
    });

    it('should return false for error responses', () => {
      const response: GenericResponse = {
        code: -1,
        message: 'Network error'
      };

      expect(NetworkUtils.isOk(response)).toBe(false);
    });
  });
});
