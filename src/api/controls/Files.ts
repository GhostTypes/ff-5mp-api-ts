/**
 * @fileoverview HTTP API file management module for FlashForge 5M printers.
 * Handles file operations including listing local and recent print files, and retrieving G-code thumbnails via HTTP endpoints.
 */
// src/api/controls/Files.ts

import axios from 'axios';
import type { FiveMClient } from '../../FiveMClient';
import type { FFGcodeFileEntry } from '../../models/ff-models'; // Import the new model
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
   * Retrieves a list of all G-code files stored locally on the printer via TCP.
   * @returns A Promise that resolves to an array of file names (strings).
   */
  public async getLocalFileList(): Promise<string[]> {
    return await this.client.tcpClient.getFileListAsync();
  }

  /**
   * Retrieves a list of the 10 most recently printed files from the printer's API.
   * For AD5X and newer printers, returns detailed file entries with material info.
   * For older printers, returns basic file entries with normalized data.
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

      // AD5X and newer printers provide detailed info in gcodeListDetail
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

// Updated GCodeListResponse to reflect that gcodeList can be string[] or FFGcodeFileEntry[]
interface GCodeListResponse extends GenericResponse {
  gcodeList: string[] | FFGcodeFileEntry[];
  gcodeListDetail?: FFGcodeFileEntry[]; // AD5X and newer printers provide detailed info here
}

/**
 * Represents the response structure for a G-code file list request.
 * @interface GCodeListResponse
 * @extends GenericResponse
 */

/**
 * Represents the response structure for a G-code thumbnail request.
 * @interface ThumbnailResponse
 * @extends GenericResponse
 */
interface ThumbnailResponse extends GenericResponse {
  /** The thumbnail image data encoded as a base64 string. */
  imageData: string;
}
