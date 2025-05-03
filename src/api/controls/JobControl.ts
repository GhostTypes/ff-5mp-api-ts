// src/api/controls/JobControl.ts
import { FiveMClient } from '../../FiveMClient';
import { Control, GenericResponse } from './Control';
import { Endpoints } from '../server/Endpoints';
import { NetworkUtils } from '../network/NetworkUtils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
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
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const fileName = path.basename(filePath);

        try {
            const form = new FormData();

            if (this.isNewFirmwareVersion()) {
                // New format for firmware >= 3.1.3
                form.append('serialNumber', this.client.serialNumber);
                form.append('checkCode', this.client.checkCode);
                form.append('fileSize', fileSize.toString());
                form.append('printNow', startPrint.toString().toLowerCase());
                form.append('levelingBeforePrint', levelBeforePrint.toString().toLowerCase());
                form.append('flowCalibration', 'false');
                form.append('useMatlStation', 'false');
                form.append('gcodeToolCnt', '0');
                form.append('materialMappings', 'W10='); // Base64 encoded empty array "[]"
            } else {
                // Old format for firmware < 3.1.3
                form.append('serialNumber', this.client.serialNumber);
                form.append('checkCode', this.client.checkCode);
                form.append('fileSize', fileSize.toString());
                form.append('printNow', startPrint.toString().toLowerCase());
                form.append('levelingBeforePrint', levelBeforePrint.toString().toLowerCase());
            }

            form.append('gcodeFile', fs.createReadStream(filePath), {
                filename: fileName,
                contentType: 'application/octet-stream'
            });

            const response = await axios.post(
                this.client.getEndpoint(Endpoints.UploadFile),
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        'Expect': '100-continue'
                    },
                }
            );

            if (response.status !== 200) return false;

            const result = response.data as GenericResponse;
            return NetworkUtils.isOk(result);
        } catch (e) {
            //console.log(`UploadFile error: ${e.message}\n${e.stack}`);
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
        } catch (e) {
            //console.log(`PrintLocalFile error: ${e.message}\n${e.stack}`);
            return false;
        }
    }
}