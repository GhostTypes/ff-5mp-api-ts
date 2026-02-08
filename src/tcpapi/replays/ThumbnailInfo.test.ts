/**
 * @fileoverview Tests for ThumbnailInfo parser including M662 response parsing and PNG image extraction.
 */

import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThumbnailInfo } from './ThumbnailInfo';

// Mock fs
vi.mock('fs');
const mockedFs = fs as typeof fs & {
  writeFileSync: ReturnType<typeof vi.fn>;
};

describe('ThumbnailInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fromReplay', () => {
    it('should parse valid PNG data from response', () => {
      // Create a minimal PNG signature
      const pngSignature = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // Chunk length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk type
      ]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      const result = thumbnailInfo.fromReplay(response, 'test.gcode');

      expect(result).not.toBeNull();
      expect(result?.getFileName()).toBe('test.gcode');
      expect(result?.getImageData()).not.toBeNull();
    });

    it('should return null when no "ok" is found', () => {
      const thumbnailInfo = new ThumbnailInfo();
      const result = thumbnailInfo.fromReplay('invalid response', 'test.gcode');

      expect(result).toBeNull();
    });

    it('should return null when no PNG signature is found', () => {
      const thumbnailInfo = new ThumbnailInfo();
      const result = thumbnailInfo.fromReplay('ok some random data', 'test.gcode');

      expect(result).toBeNull();
    });

    it('should return null for empty response', () => {
      const thumbnailInfo = new ThumbnailInfo();
      const result = thumbnailInfo.fromReplay('', 'test.gcode');

      expect(result).toBeNull();
    });

    it('should handle PNG data with preceding bytes', () => {
      // Simulate response with some bytes before PNG signature
      const precedingBytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52,
      ]);

      const combinedData = Buffer.concat([precedingBytes, pngSignature]);
      const response = `ok${combinedData.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      const result = thumbnailInfo.fromReplay(response, 'test.gcode');

      expect(result).not.toBeNull();
      const imageData = result?.getImageData();
      expect(imageData).not.toBeNull();
    });
  });

  describe('getImageData', () => {
    it('should return base64 encoded image data', () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      thumbnailInfo.fromReplay(response, 'test.gcode');

      const imageData = thumbnailInfo.getImageData();
      expect(imageData).not.toBeNull();
      expect(typeof imageData).toBe('string');

      // Verify it's valid base64
      if (imageData !== null) {
        expect(() => Buffer.from(imageData, 'base64')).not.toThrow();
      }
    });

    it('should return null when no image data is available', () => {
      const thumbnailInfo = new ThumbnailInfo();
      const imageData = thumbnailInfo.getImageData();

      expect(imageData).toBeNull();
    });
  });

  describe('toBase64DataUrl', () => {
    it('should return data URL with correct format', () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      thumbnailInfo.fromReplay(response, 'test.gcode');

      const dataUrl = thumbnailInfo.toBase64DataUrl();
      expect(dataUrl).not.toBeNull();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should return null when no image data is available', () => {
      const thumbnailInfo = new ThumbnailInfo();
      const dataUrl = thumbnailInfo.toBase64DataUrl();

      expect(dataUrl).toBeNull();
    });
  });

  describe('saveToFile', () => {
    it('should save image data to specified file path', async () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      thumbnailInfo.fromReplay(response, 'test.gcode');

      mockedFs.writeFileSync.mockImplementation(vi.fn());

      const result = await thumbnailInfo.saveToFile('/path/to/output.png');

      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/output.png',
        expect.any(Buffer)
      );
    });

    it('should generate filename from original filename when path not provided', async () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      thumbnailInfo.fromReplay(response, 'test.gcode');

      mockedFs.writeFileSync.mockImplementation(vi.fn());

      const result = await thumbnailInfo.saveToFile();

      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith('test.png', expect.any(Buffer));
    });

    it('should return false when no image data is available', async () => {
      const thumbnailInfo = new ThumbnailInfo();
      const result = await thumbnailInfo.saveToFile('/path/to/output.png');

      expect(result).toBe(false);
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should return false when writeFileSync throws error', async () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      thumbnailInfo.fromReplay(response, 'test.gcode');

      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const result = await thumbnailInfo.saveToFile('/path/to/output.png');

      expect(result).toBe(false);
    });

    it('should return false when no filename and no path provided', async () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      // Don't provide filename in fromReplay
      thumbnailInfo.fromReplay(response, '');

      const result = await thumbnailInfo.saveToFile();

      expect(result).toBe(false);
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('getFileName', () => {
    it('should return the stored filename', () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const response = `ok${pngSignature.toString('binary')}`;

      const thumbnailInfo = new ThumbnailInfo();
      thumbnailInfo.fromReplay(response, 'myfile.3mf');

      expect(thumbnailInfo.getFileName()).toBe('myfile.3mf');
    });

    it('should return null when no filename was set', () => {
      const thumbnailInfo = new ThumbnailInfo();
      expect(thumbnailInfo.getFileName()).toBeNull();
    });
  });
});
