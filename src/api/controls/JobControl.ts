// src/api/controls/JobControl.ts
import { FiveMClient } from '../../FiveMClient';
import {Control, GenericResponse} from './Control';
import { Endpoints } from '../server/Endpoints';
import { AD5XLocalJobParams, AD5XMaterialMapping, AD5XSingleColorJobParams } from '../../models/ff-models';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { NetworkUtils } from '../network/NetworkUtils';
import FormData from 'form-data';

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
        return await this.control.sendJobControlCmd("pause");
    }

    /**
     * Resumes a paused print job.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async resumePrintJob(): Promise<boolean> {
        return await this.control.sendJobControlCmd("continue");
    }

    /**
     * Cancels the current print job.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async cancelPrintJob(): Promise<boolean> {
        return await this.control.sendJobControlCmd("cancel");
    }

    /**
     * Checks if the printer's firmware version is 3.1.3 or newer.
     * This is used to determine which API payload format to use for certain commands.
     * @returns True if the firmware is new (>= 3.1.3), false otherwise or if version cannot be determined.
     * @private
     */
    private isNewFirmwareVersion(): boolean {
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
            action: "setClearPlatform"
        };

        return await this.control.sendControlCommand("stateCtrl_cmd", args);
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
    public async uploadFile(filePath: string, startPrint: boolean, levelBeforePrint: boolean): Promise<boolean> {
        if (!fs.existsSync(filePath)) {
            console.error(`UploadFile error: File not found at ${filePath}`);
            return false;
        }

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const fileName = path.basename(filePath);

        console.log(`Starting upload for ${fileName}, Size: ${fileSize}, Start: ${startPrint}, Level: ${levelBeforePrint}`);

        try {
            // Create FormData with the file content
            const form = new FormData();
            form.append('gcodeFile', fs.createReadStream(filePath), {
                filename: fileName,
                contentType: 'application/octet-stream' // Ensure correct MIME type
            });

            // Prepare the custom HTTP headers with metadata
            const customHeaders: Record<string, string> = {
                'serialNumber': this.client.serialNumber,
                'checkCode': this.client.checkCode,
                'fileSize': fileSize.toString(),
                'printNow': startPrint.toString().toLowerCase(),
                'levelingBeforePrint': levelBeforePrint.toString().toLowerCase(),
                'Expect': '100-continue'
            };

            // Add additional headers for new firmware
            if (this.isNewFirmwareVersion()) {
                console.log("Using new firmware headers for upload.");
                customHeaders['flowCalibration'] = 'false';
                customHeaders['useMatlStation'] = 'false';
                customHeaders['gcodeToolCnt'] = '0';
                // Base64 encode "[]" which is "W10="
                customHeaders['materialMappings'] = 'W10=';
            } else {
                console.log("Using old firmware headers for upload.");
            }

            // Get necessary headers from FormData
            const formHeaders = form.getHeaders();

            // Combine custom headers and FormData headers
            const requestHeaders = {
                ...customHeaders,
                'Content-Type': formHeaders['content-type'],
            };

            console.log("Upload Request Headers:", requestHeaders);

            // Configure Axios request
            // @ts-ignore
            const config: AxiosRequestConfig = {
                headers: requestHeaders,
            };

            // Make the POST request
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.UploadFile),
                form,
                config
            );

            console.log(`Upload Response Status: ${response.status}`);
            console.log("Upload Response Data:", response.data); // Log the response body

            if (response.status !== 200) {
                console.error(`Upload failed: Printer responded with status ${response.status}`);
                return false;
            }

            // Assuming response.data is already parsed JSON by axios
            const result = response.data as any;
            if (NetworkUtils.isOk(result)) {
                console.log("Upload successful according to printer response.");
                return true;
            } else {
                console.error(`Upload failed: Printer response code=${result.code}, message=${result.message}`);
                return false;
            }

        } catch (e: any) {
            console.error(`UploadFile error: ${e.message}`);
            if (e.response) {
                console.error(`Error Status: ${e.response.status}`);
                console.error("Error Response Data:", e.response.data);
            } else if (e.request) {
                console.error("Error Request:", e.request);
            } else {
                console.error('Error', e.message);
            }
            console.error(e.stack);
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
        let payload: any;

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
                materialMappings: [] // Empty array for materialMappings
            };
        } else {
            // Old format for firmware < 3.1.3
            payload = {
                serialNumber: this.client.serialNumber,
                checkCode: this.client.checkCode,
                fileName,
                levelingBeforePrint
            };
        }

        try {
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.GCodePrint),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

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
        if (!this.validateAD5XPrinter()) {
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
            materialMappings: params.materialMappings
        };

        try {
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.GCodePrint),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

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
        if (!this.validateAD5XPrinter()) {
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
            materialMappings: [] // Empty array for single-color jobs
        };

        try {
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.GCodePrint),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status !== 200) return false;

            const result = response.data as GenericResponse;
            return NetworkUtils.isOk(result);
        } catch (error) {
            console.error(`AD5X Single-Color Job error: ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Validates that the current printer is an AD5X model.
     * @returns True if the printer is AD5X, false otherwise
     * @private
     */
    private validateAD5XPrinter(): boolean {
        if (!this.client.isAD5X) {
            console.error('AD5X Job error: This method can only be used with AD5X printers');
            return false;
        }
        return true;
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
            console.error('Material mappings validation error: materialMappings array cannot be empty for multi-color jobs');
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
                console.error(`Material mappings validation error: toolId must be between 0-3, got ${mapping.toolId} at index ${i}`);
                return false;
            }

            // Validate slotId (1-4)
            if (mapping.slotId < 1 || mapping.slotId > 4) {
                console.error(`Material mappings validation error: slotId must be between 1-4, got ${mapping.slotId} at index ${i}`);
                return false;
            }

            // Validate materialName is not empty
            if (!mapping.materialName || mapping.materialName.trim() === '') {
                console.error(`Material mappings validation error: materialName cannot be empty at index ${i}`);
                return false;
            }

            // Validate toolMaterialColor format
            if (!hexColorRegex.test(mapping.toolMaterialColor)) {
                console.error(`Material mappings validation error: toolMaterialColor must be in #RRGGBB format, got ${mapping.toolMaterialColor} at index ${i}`);
                return false;
            }

            // Validate slotMaterialColor format
            if (!hexColorRegex.test(mapping.slotMaterialColor)) {
                console.error(`Material mappings validation error: slotMaterialColor must be in #RRGGBB format, got ${mapping.slotMaterialColor} at index ${i}`);
                return false;
            }
        }

        return true;
    }
}