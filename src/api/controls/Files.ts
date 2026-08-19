/**
 * @fileoverview HTTP API file management module for FlashForge 5M printers.
 * Handles file operations including listing local and recent print files, and retrieving G-code thumbnails via HTTP endpoints.
 */
// src/api/controls/Files.ts

import axios from 'axios';
import type { FiveMClient } from '../../FiveMClient';
import type { FFGcodeFileEntry } from '../../models/ff-models';
import { NetworkUtils } from '../network/NetworkUtils';
import { Endpoints } from '../server/Endpoints';
import type { GenericResponse } from './Control';

/**
 * Provides methods for managing files on the FlashForge 3D printer.
 * This includes listing local and recent files, and retrieving G-code thumbnails.
 */
export class Files {
  private client: FiveMClient;

  /**
   * Creates an instance of the Files class.
   * @param printerClient The FiveMClient instance used for communication with the printer.
   */
  constructor(printerClient: FiveMClient) {
    this.client = printerClient;
  }

  /**
   * Retrieves a list of G-code files stored locally on the printer.
   * Dual-API printers use the TCP file list; HTTP-only printers (Creator 5 /
   * 5 Pro) have no TCP channel, so this falls back to the HTTP `/gcodeList`
   * (the 10 most-recent files) and returns their names.
   * @returns A Promise that resolves to an array of file names (strings).
   */
  public async getLocalFileList(): Promise<string[]> {
    if (this.client.httpOnly) {
      const recent = await this.getRecentFileList();
      return recent.map((entry) => entry.gcodeFileName);
    }
    return await this.client.tcpClient.getFileListAsync();
  }

  /**
   * Retrieves a list of the 10 most recently printed files from the printer's API.
   *
   * Only the **AD5X** answers with `gcodeListDetail`, the per-file block carrying print
   * time, filament weight, and the per-tool material data that material matching is
   * built from. Every other model - the 5M, the 5M Pro, **and the Creator 5 / Creator 5
   * Pro** - returns bare file names, so their entries have no `gcodeToolDatas`.
   *
   * The Creator 5 is the surprise there, and it is firmware, not a parsing gap: it is
   * newer hardware than the AD5X but reports less (confirmed against a live Creator 5
   * Pro, 2026-08-05). Do not describe this method as "AD5X and newer" — only the AD5X
   * sends `gcodeListDetail`. Callers needing per-tool data on a Creator 5 must parse
   * the 3mf at upload time.
   *
   * @returns A Promise that resolves to an array of `FFGcodeFileEntry` objects.
   *          Returns an empty array if the request fails or an error occurs.
   */
  public async getRecentFileList(): Promise<FFGcodeFileEntry[]> {
    const payload = {
      serialNumber: this.client.serialNumber,
      checkCode: this.client.checkCode,
    };

    try {
      const response = await axios.post(this.client.getEndpoint(Endpoints.GCodeList), payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status !== 200) return [];

      const result = response.data as GCodeListResponse;

      if (!NetworkUtils.isOk(result)) {
        console.log(`Error retrieving file list: ${result.message || 'Unknown error'}`);
        return [];
      }

      // Only the AD5X provides detailed info in gcodeListDetail. The Creator 5
      // series does not, despite being the newer hardware.
      if (result.gcodeListDetail && result.gcodeListDetail.length > 0) {
        return result.gcodeListDetail;
      }

      // Fallback for older printers using gcodeList
      if (result.gcodeList?.length > 0) {
        const firstItem = result.gcodeList[0];

        if (typeof firstItem === 'string') {
          // Convert string array to FFGcodeFileEntry objects
          return (result.gcodeList as string[]).map((fileName) => ({
            gcodeFileName: fileName,
            printingTime: 0,
          }));
        } else {
          // Already FFGcodeFileEntry objects
          return result.gcodeList as FFGcodeFileEntry[];
        }
      }

      return [];
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`GetRecentFileList error: ${err.message}\n${err.stack}`);
      return [];
    }
  }

  /**
   * Retrieves the thumbnail image for a specified G-code file.
   * The image data is returned as a Buffer.
   *
   * @param fileName The name of the G-code file (e.g., "my_print.gcode") for which to retrieve the thumbnail.
   * @returns A Promise that resolves to a Buffer containing the thumbnail image data (in base64 format, then converted to Buffer),
   *          or null if the request fails, the file has no thumbnail, or an error occurs.
   */
  public async getGCodeThumbnail(fileName: string): Promise<Buffer | null> {
    const payload = {
      serialNumber: this.client.serialNumber,
      checkCode: this.client.checkCode,
      fileName,
    };

    try {
      const response = await axios.post(this.client.getEndpoint(Endpoints.GCodeThumb), payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) return null;

      const result = response.data as ThumbnailResponse;
      if (NetworkUtils.isOk(result)) {
        return Buffer.from(result.imageData, 'base64');
      }

      console.log(`Error retrieving thumbnail: ${result.message}`);
      return null;
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`GetGcodeThumbnail error: ${err.message}\n${err.stack}`);
      return null;
    }
  }
}

/**
 * Represents the response structure for a G-code file list request.
 * @interface GCodeListResponse
 * @extends GenericResponse
 */
interface GCodeListResponse extends GenericResponse {
  gcodeList: string[] | FFGcodeFileEntry[];
  gcodeListDetail?: FFGcodeFileEntry[]; // AD5X only; absent on the 5M / 5M Pro and the Creator 5 series
}

/**
 * Represents the response structure for a G-code thumbnail request.
 * @interface ThumbnailResponse
 * @extends GenericResponse
 */
interface ThumbnailResponse extends GenericResponse {
  /** The thumbnail image data encoded as a base64 string. */
  imageData: string;
}
