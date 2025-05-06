// src/api/controls/JobControl.ts
import { FiveMClient } from '../../FiveMClient';
import { Control } from './Control';
import { Endpoints } from '../server/Endpoints';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { NetworkUtils } from '../network/NetworkUtils';
import FormData from 'form-data';

export class JobControl {
    private client: FiveMClient;
    private control: Control;

    constructor(printerClient: FiveMClient) {
        this.client = printerClient;
        this.control = printerClient.control;
    }

    // Basic controls
    public async pausePrintJob(): Promise<boolean> {
        return await this.control.sendJobControlCmd("pause");
    }

    public async resumePrintJob(): Promise<boolean> {
        return await this.control.sendJobControlCmd("continue");
    }

    public async cancelPrintJob(): Promise<boolean> {
        return await this.control.sendJobControlCmd("cancel");
    }

    // Check for firmware 3.1.3+
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

    public async clearPlatform(): Promise<boolean> {
        const args = {
            action: "setClearPlatform"
        };

        return await this.control.sendControlCommand("stateCtrl_cmd", args);
    }

    /**
     * Upload a GCode/3MF file to the printer
     * @param filePath Path to the file to upload
     * @param startPrint Start the printer after uploading
     * @param levelBeforePrint Level the bed before printing
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
}