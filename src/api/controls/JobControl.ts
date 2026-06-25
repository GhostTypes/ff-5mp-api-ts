/**
 * @fileoverview HTTP API job management module for FlashForge 5M printers.
 * Manages print job operations including pause/resume/cancel, file uploads with firmware-specific handling, and AD5X multi-color printing with material station support.
 */
// src/api/controls/JobControl.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import axios from 'axios';
import FormData from 'form-data';
import type { FiveMClient } from '../../FiveMClient';
import type {
  AD5XLocalJobParams,
  AD5XMaterialMapping,
  AD5XSingleColorJobParams,
  AD5XUploadParams,
  Creator5JobParams,
  Creator5MaterialMapping,
} from '../../models/ff-models';
import { NetworkUtils } from '../network/NetworkUtils';
import { Endpoints } from '../server/Endpoints';
import type { Control, GenericResponse } from './Control';

/**
 * Provides methods for managing print jobs on the FlashForge 3D printer.
 * This includes pausing, resuming, canceling prints, uploading files for printing,
 * and starting prints from local files.
 */
export class JobControl {
  private client: FiveMClient;
  private control: Control;

  /**
   * Creates an instance of the JobControl class.
   * @param printerClient The FiveMClient instance used for communication with the printer.
   */
  constructor(printerClient: FiveMClient) {
    this.client = printerClient;
    this.control = printerClient.control;
  }

  // Basic controls
  /**
   * Pauses the current print job.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async pausePrintJob(): Promise<boolean> {
    return await this.control.sendJobControlCmd('pause');
  }

  /**
   * Resumes a paused print job.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async resumePrintJob(): Promise<boolean> {
    return await this.control.sendJobControlCmd('continue');
  }

  /**
   * Cancels the current print job.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async cancelPrintJob(): Promise<boolean> {
    return await this.control.sendJobControlCmd('cancel');
  }

  /**
   * Checks if the printer's firmware version is 3.1.3 or newer.
   * This is used to determine which API payload format to use for certain commands.
   * @returns True if the firmware is new (>= 3.1.3), false otherwise or if version cannot be determined.
   * @private
   */
  private isNewFirmwareVersion(): boolean {
    // The 3.1.3 threshold only applies to the 5M family. The AD5X and Creator 5
    // series always use the new payload/header format, and their firmware
    // versioning isn't comparable to the 5M's 3.x line (e.g. the C5 reports
    // 1.9.2, which the numeric check below would wrongly read as "old"), so
    // short-circuit to the new format for them.
    if (this.client.isAD5X || this.client.isCreator5 || this.client.isCreator5Pro) {
      return true;
    }
    try {
      const currentVersion = this.client.firmVer.split('.');
      const minVersion = [3, 1, 3];

      for (let i = 0; i < 3; i++) {
        const current = parseInt(currentVersion[i] || '0', 10);
        if (current > minVersion[i]) return true;
        if (current < minVersion[i]) return false;
      }

      return true; // Equal versions
    } catch {
      return false;
    }
  }

  /**
   * Sends a command to clear the printer's build platform.
   * (Note: The exact behavior of "setClearPlatform" might need further clarification from printer documentation,
   * it's assumed here it's a command to potentially move the print head out of the way or a similar action.)
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async clearPlatform(): Promise<boolean> {
    const args = {
      action: 'setClearPlatform',
    };

    return await this.control.sendControlCommand('stateCtrl_cmd', args);
  }

  /**
   * Uploads a G-code or 3MF file to the printer and optionally starts printing.
   * It handles different API requirements based on the printer's firmware version.
   *
   * @param filePath The local path to the G-code or 3MF file to upload.
   * @param startPrint If true, the printer will start printing the file immediately after upload.
   * @param levelBeforePrint If true, the printer will perform bed leveling before starting the print.
   * @returns A Promise that resolves to true if the file upload (and optional print start) is successful, false otherwise.
   */
  public async uploadFile(
    filePath: string,
    startPrint: boolean,
    levelBeforePrint: boolean
  ): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      console.error(`UploadFile error: File not found at ${filePath}`);
      return false;
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const fileName = path.basename(filePath);

    console.log(
      `Starting upload for ${fileName}, Size: ${fileSize}, Start: ${startPrint}, Level: ${levelBeforePrint}`
    );

    try {
      // Create FormData with the file content
      const form = new FormData();
      form.append('gcodeFile', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: 'application/octet-stream', // Ensure correct MIME type
      });

      // Prepare the custom HTTP headers with metadata
      const customHeaders: Record<string, string> = {
        serialNumber: this.client.serialNumber,
        checkCode: this.client.checkCode,
        fileSize: fileSize.toString(),
        printNow: startPrint.toString().toLowerCase(),
        levelingBeforePrint: levelBeforePrint.toString().toLowerCase(),
        Expect: '100-continue',
      };

      // Add additional headers for new firmware
      if (this.isNewFirmwareVersion()) {
        console.log('Using new firmware headers for upload.');
        customHeaders['flowCalibration'] = 'false';
        customHeaders['useMatlStation'] = 'false';
        customHeaders['gcodeToolCnt'] = '0';
        // Base64 encode "[]" which is "W10="
        customHeaders['materialMappings'] = 'W10=';
      } else {
        console.log('Using old firmware headers for upload.');
      }

      // Get necessary headers from FormData
      const formHeaders = form.getHeaders();

      // Combine custom headers and FormData headers
      const requestHeaders = {
        ...customHeaders,
        'Content-Type': formHeaders['content-type'],
      };

      console.log('Upload Request Headers:', requestHeaders);

      // Configure Axios request
      const config = {
        headers: requestHeaders,
      };

      // Make the POST request
      const response = await axios.post(
        this.client.getEndpoint(Endpoints.UploadFile),
        form,
        config
      );

      console.log(`Upload Response Status: ${response.status}`);
      console.log('Upload Response Data:', response.data); // Log the response body

      if (response.status !== 200) {
        console.error(`Upload failed: Printer responded with status ${response.status}`);
        return false;
      }

      // Assuming response.data is already parsed JSON by axios
      const result = response.data as GenericResponse;
      if (NetworkUtils.isOk(result)) {
        console.log('Upload successful according to printer response.');
        return true;
      } else {
        console.error(
          `Upload failed: Printer response code=${result.code}, message=${result.message}`
        );
        return false;
      }
    } catch (error) {
      const err = error as Error & {
        response?: { status: number; data: GenericResponse };
        request?: unknown;
      };
      console.error(`UploadFile error: ${err.message}`);
      if (err.response) {
        console.error(`Error Status: ${err.response.status}`);
        console.error('Error Response Data:', err.response.data);
      } else if (err.request) {
        console.error('Error Request:', err.request);
      } else {
        console.error('Error', err.message);
      }
      console.error(err.stack);
      return false;
    }
  }

  /**
   * Uploads a G-code or 3MF file to AD5X printer with material station support.
   * Handles material mappings, flow calibration, and other AD5X-specific features.
   * Material mappings are base64-encoded in HTTP headers according to AD5X API requirements.
   *
   * @param params AD5X upload parameters including file path, print options, and material mappings
   * @returns A Promise that resolves to true if the file upload is successful, false otherwise
   */
  public async uploadFileAD5X(params: AD5XUploadParams): Promise<boolean> {
    // Validate that this is an AD5X printer
    if (!this.validateMaterialStationPrinter()) {
      return false;
    }

    // Validate material mappings
    if (!this.validateMaterialMappings(params.materialMappings)) {
      return false;
    }

    // Validate file exists
    if (!fs.existsSync(params.filePath)) {
      console.error(`UploadFileAD5X error: File not found at ${params.filePath}`);
      return false;
    }

    const stats = fs.statSync(params.filePath);
    const fileSize = stats.size;
    const fileName = path.basename(params.filePath);

    console.log(
      `Starting AD5X upload for ${fileName}, Size: ${fileSize}, Start: ${params.startPrint}, Level: ${params.levelingBeforePrint}, Tools: ${params.materialMappings.length}`
    );

    try {
      // Create FormData with the file content
      const form = new FormData();
      form.append('gcodeFile', fs.createReadStream(params.filePath), {
        filename: fileName,
        contentType: 'application/octet-stream',
      });

      // Encode material mappings to base64
      const materialMappingsBase64 = this.encodeMaterialMappingsToBase64(params.materialMappings);

      // Prepare AD5X-specific HTTP headers
      const customHeaders: Record<string, string> = {
        serialNumber: this.client.serialNumber,
        checkCode: this.client.checkCode,
        fileSize: fileSize.toString(),
        printNow: params.startPrint.toString().toLowerCase(),
        levelingBeforePrint: params.levelingBeforePrint.toString().toLowerCase(),
        flowCalibration: params.flowCalibration.toString().toLowerCase(),
        firstLayerInspection: params.firstLayerInspection.toString().toLowerCase(),
        timeLapseVideo: params.timeLapseVideo.toString().toLowerCase(),
        useMatlStation: 'true', // Always true for AD5X uploads with material mappings
        gcodeToolCnt: params.materialMappings.length.toString(),
        materialMappings: materialMappingsBase64,
        Expect: '100-continue',
      };

      // Get necessary headers from FormData
      const formHeaders = form.getHeaders();

      // Combine custom headers and FormData headers
      const requestHeaders = {
        ...customHeaders,
        'Content-Type': formHeaders['content-type'],
      };

      console.log('AD5X Upload Request Headers:', requestHeaders);

      // Configure Axios request
      const config = {
        headers: requestHeaders,
      };

      // Make the POST request
      const response = await axios.post(
        this.client.getEndpoint(Endpoints.UploadFile),
        form,
        config
      );

      console.log(`AD5X Upload Response Status: ${response.status}`);
      console.log('AD5X Upload Response Data:', response.data);

      if (response.status !== 200) {
        console.error(`AD5X Upload failed: Printer responded with status ${response.status}`);
        return false;
      }

      // Assuming response.data is already parsed JSON by axios
      const result = response.data as GenericResponse;
      if (NetworkUtils.isOk(result)) {
        console.log('AD5X Upload successful according to printer response.');
        return true;
      } else {
        console.error(
          `AD5X Upload failed: Printer response code=${result.code}, message=${result.message}`
        );
        return false;
      }
    } catch (error) {
      const err = error as Error & {
        response?: { status: number; data: GenericResponse };
        request?: unknown;
      };
      console.error(`UploadFileAD5X error: ${err.message}`);
      if (err.response) {
        console.error(`Error Status: ${err.response.status}`);
        console.error('Error Response Data:', err.response.data);
      } else if (err.request) {
        console.error('Error Request:', err.request);
      } else {
        console.error('Error', err.message);
      }
      console.error(err.stack);
      return false;
    }
  }

  /**
   * Starts printing a file that is already stored locally on the printer.
   * It handles different API payload formats based on the printer's firmware version.
   *
   * @param fileName The name of the file on the printer (e.g., "my_model.gcode") to print.
   * @param levelingBeforePrint If true, the printer will perform bed leveling before starting the print.
   * @returns A Promise that resolves to true if the print command is successfully sent and acknowledged, false otherwise.
   * @throws Error if there's an issue sending the command (e.g., network error).
   */
  public async printLocalFile(fileName: string, levelingBeforePrint: boolean): Promise<boolean> {
    let payload: Record<string, unknown>;

    if (this.isNewFirmwareVersion()) {
      // New format for firmware >= 3.1.3
      payload = {
        serialNumber: this.client.serialNumber,
        checkCode: this.client.checkCode,
        fileName,
        levelingBeforePrint,
        flowCalibration: false,
        useMatlStation: false,
        gcodeToolCnt: 0,
        materialMappings: [], // Empty array for materialMappings
      };
    } else {
      // Old format for firmware < 3.1.3
      payload = {
        serialNumber: this.client.serialNumber,
        checkCode: this.client.checkCode,
        fileName,
        levelingBeforePrint,
      };
    }

    try {
      const response = await axios.post(this.client.getEndpoint(Endpoints.GCodePrint), payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) return false;

      const result = response.data as GenericResponse;
      return NetworkUtils.isOk(result);
    } catch (error) {
      console.error(`PrintLocalFile error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Starts a multi-color local print job on AD5X printers with material mappings.
   * This method automatically configures the material station settings and validates
   * all parameters before sending the print command.
   *
   * @param params Job parameters including file name, leveling option, and material mappings
   * @returns Promise resolving to true if successful, false if validation fails or printer rejects
   * @throws Error if there's a network issue sending the command
   */
  public async startAD5XMultiColorJob(params: AD5XLocalJobParams): Promise<boolean> {
    // Validate that this is an AD5X printer
    if (!this.validateMaterialStationPrinter()) {
      return false;
    }

    // Validate material mappings
    if (!this.validateMaterialMappings(params.materialMappings)) {
      return false;
    }

    // Validate file name
    if (!params.fileName || params.fileName.trim() === '') {
      console.error('AD5X Multi-Color Job error: fileName cannot be empty');
      return false;
    }

    // Create payload with AD5X-specific parameters
    const payload = {
      serialNumber: this.client.serialNumber,
      checkCode: this.client.checkCode,
      fileName: params.fileName,
      levelingBeforePrint: params.levelingBeforePrint,
      firstLayerInspection: false,
      flowCalibration: false,
      timeLapseVideo: false,
      useMatlStation: true, // Automatically set to true for multi-color jobs
      gcodeToolCnt: params.materialMappings.length, // Set based on material mappings count
      materialMappings: params.materialMappings,
    };

    try {
      const response = await axios.post(this.client.getEndpoint(Endpoints.GCodePrint), payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) return false;

      const result = response.data as GenericResponse;
      return NetworkUtils.isOk(result);
    } catch (error) {
      console.error(`AD5X Multi-Color Job error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Starts a single-color local print job on AD5X printers.
   * This method automatically configures the printer for single-color printing
   * without using the material station.
   *
   * @param params Job parameters including file name and leveling option
   * @returns Promise resolving to true if successful, false if validation fails or printer rejects
   * @throws Error if there's a network issue sending the command
   */
  public async startAD5XSingleColorJob(params: AD5XSingleColorJobParams): Promise<boolean> {
    // Validate that this is an AD5X printer
    if (!this.validateMaterialStationPrinter()) {
      return false;
    }

    // Validate file name
    if (!params.fileName || params.fileName.trim() === '') {
      console.error('AD5X Single-Color Job error: fileName cannot be empty');
      return false;
    }

    // Create payload with AD5X-specific parameters for single-color printing
    const payload = {
      serialNumber: this.client.serialNumber,
      checkCode: this.client.checkCode,
      fileName: params.fileName,
      levelingBeforePrint: params.levelingBeforePrint,
      firstLayerInspection: false,
      flowCalibration: false,
      timeLapseVideo: false,
      useMatlStation: false, // Set to false for single-color jobs
      gcodeToolCnt: 0, // Set to 0 for single-color jobs
      materialMappings: [], // Empty array for single-color jobs
    };

    try {
      const response = await axios.post(this.client.getEndpoint(Endpoints.GCodePrint), payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) return false;

      const result = response.data as GenericResponse;
      return NetworkUtils.isOk(result);
    } catch (error) {
      console.error(`AD5X Single-Color Job error: ${(error as Error).message}`);
      throw error;
    }
  }

  // --- Creator 5 / Creator 5 Pro ---
  // The Creator 5 uploads files the same way as the AD5X (the extra IFS headers
  // are simply ignored by its firmware), but it performs material matching at
  // print-start via POST /printGcode rather than at upload time. So upload reuses
  // the AD5X path, while starting a job uses the Creator 5-native body below.

  /**
   * Uploads a file to a Creator 5 / Creator 5 Pro. Reuses the AD5X upload path;
   * the Creator 5 firmware ignores the IFS-specific headers. To run a multi-tool
   * print, upload with `startPrint = false`, then call {@link startCreator5Job}
   * with material mappings.
   * @param params Upload parameters (material mappings are ignored by the C5 firmware).
   * @returns Promise resolving to true on success.
   */
  public async uploadFileWithMaterialMappings(params: AD5XUploadParams): Promise<boolean> {
    return this.uploadFileAD5X(params);
  }

  /**
   * Starts a local print on a Creator 5 / Creator 5 Pro via `POST /printGcode`.
   *
   * This is the Creator 5's print-start material-matching command (distinct from
   * the AD5X, which maps materials at upload time). The file must already be on the
   * printer. Provide `materialMappings` for a multi-tool print, or omit them for a
   * single-tool print. Sends only the fields the Creator 5 firmware reads.
   *
   * @param params File name, leveling flag, and optional flags / material mappings.
   * @returns Promise resolving to true if the printer accepts the print command.
   * @throws Error if there's a network issue sending the command.
   */
  public async startCreator5Job(params: Creator5JobParams): Promise<boolean> {
    if (!this.validateMaterialStationPrinter()) {
      return false;
    }

    if (!params.fileName || params.fileName.trim() === '') {
      console.error('Creator 5 Job error: fileName cannot be empty');
      return false;
    }

    const hasMappings = !!params.materialMappings && params.materialMappings.length > 0;
    if (hasMappings && !this.validateCreator5MaterialMappings(params.materialMappings ?? [])) {
      return false;
    }

    // Only the fields the /printGcode handler actually reads. fileName and
    // levelingBeforePrint are required; the rest are optional.
    const payload: Record<string, unknown> = {
      serialNumber: this.client.serialNumber,
      checkCode: this.client.checkCode,
      fileName: params.fileName,
      levelingBeforePrint: params.levelingBeforePrint,
    };
    if (params.flowCalibration !== undefined) payload.flowCalibration = params.flowCalibration;
    if (params.timeLapseVideo !== undefined) payload.timeLapseVideo = params.timeLapseVideo;
    if (hasMappings) payload.materialMappings = params.materialMappings;

    try {
      const response = await axios.post(this.client.getEndpoint(Endpoints.GCodePrint), payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) return false;

      const result = response.data as GenericResponse;
      return NetworkUtils.isOk(result);
    } catch (error) {
      console.error(`Creator 5 Job error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Validates Creator 5 material mappings: toolId 0-3, slotId 1-4, non-empty
   * materialName. (No color fields, unlike AD5X.)
   * @param materialMappings Array of Creator 5 mappings to validate.
   * @returns True if all mappings are valid, false otherwise.
   * @private
   */
  private validateCreator5MaterialMappings(materialMappings: Creator5MaterialMapping[]): boolean {
    if (materialMappings.length > 4) {
      console.error('Creator 5 material mappings error: Maximum 4 material mappings allowed');
      return false;
    }

    for (let i = 0; i < materialMappings.length; i++) {
      const mapping = materialMappings[i];

      if (mapping.toolId < 0 || mapping.toolId > 3) {
        console.error(
          `Creator 5 material mappings error: toolId must be between 0-3, got ${mapping.toolId} at index ${i}`
        );
        return false;
      }

      if (mapping.slotId < 1 || mapping.slotId > 4) {
        console.error(
          `Creator 5 material mappings error: slotId must be between 1-4, got ${mapping.slotId} at index ${i}`
        );
        return false;
      }

      if (!mapping.materialName || mapping.materialName.trim() === '') {
        console.error(
          `Creator 5 material mappings error: materialName cannot be empty at index ${i}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Validates that the current printer has a material station and therefore
   * supports material-mapping uploads/jobs. Covers AD5X and the Creator 5 series,
   * which share the same material-mapping print flow (Creator 5 = "AD5X + more").
   * @returns True if the printer supports material mappings, false otherwise
   * @private
   */
  private validateMaterialStationPrinter(): boolean {
    if (!this.client.isAD5X && !this.client.isCreator5) {
      console.error(
        'Material-station job error: this method requires an AD5X or Creator 5 series printer'
      );
      return false;
    }
    return true;
  }

  /**
   * Encodes material mappings array to base64 string for HTTP headers.
   * Converts AD5XMaterialMapping array to JSON and then to base64 encoding.
   * @param materialMappings Array of material mappings to encode
   * @returns Base64-encoded JSON string
   * @throws Error if encoding fails
   * @private
   */
  private encodeMaterialMappingsToBase64(materialMappings: AD5XMaterialMapping[]): string {
    try {
      const jsonString = JSON.stringify(materialMappings);
      return Buffer.from(jsonString, 'utf8').toString('base64');
    } catch (error) {
      console.error('Failed to encode material mappings to base64:', error);
      throw new Error('Failed to encode material mappings for upload');
    }
  }

  /**
   * Validates material mappings for AD5X multi-color jobs.
   * Checks toolId range (0-3), slotId range (1-4), and color format (#RRGGBB).
   * @param materialMappings Array of material mappings to validate
   * @returns True if all mappings are valid, false otherwise
   * @private
   */
  private validateMaterialMappings(materialMappings: AD5XMaterialMapping[]): boolean {
    if (!materialMappings || materialMappings.length === 0) {
      console.error(
        'Material mappings validation error: materialMappings array cannot be empty for multi-color jobs'
      );
      return false;
    }

    if (materialMappings.length > 4) {
      console.error('Material mappings validation error: Maximum 4 material mappings allowed');
      return false;
    }

    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

    for (let i = 0; i < materialMappings.length; i++) {
      const mapping = materialMappings[i];

      // Validate toolId (0-3)
      if (mapping.toolId < 0 || mapping.toolId > 3) {
        console.error(
          `Material mappings validation error: toolId must be between 0-3, got ${mapping.toolId} at index ${i}`
        );
        return false;
      }

      // Validate slotId (1-4)
      if (mapping.slotId < 1 || mapping.slotId > 4) {
        console.error(
          `Material mappings validation error: slotId must be between 1-4, got ${mapping.slotId} at index ${i}`
        );
        return false;
      }

      // Validate materialName is not empty
      if (!mapping.materialName || mapping.materialName.trim() === '') {
        console.error(
          `Material mappings validation error: materialName cannot be empty at index ${i}`
        );
        return false;
      }

      // Validate toolMaterialColor format
      if (!hexColorRegex.test(mapping.toolMaterialColor)) {
        console.error(
          `Material mappings validation error: toolMaterialColor must be in #RRGGBB format, got ${mapping.toolMaterialColor} at index ${i}`
        );
        return false;
      }

      // Validate slotMaterialColor format
      if (!hexColorRegex.test(mapping.slotMaterialColor)) {
        console.error(
          `Material mappings validation error: slotMaterialColor must be in #RRGGBB format, got ${mapping.slotMaterialColor} at index ${i}`
        );
        return false;
      }
    }

    return true;
  }
}
