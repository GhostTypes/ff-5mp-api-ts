// src/api/controls/Files.ts
import { FiveMClient } from '../../FiveMClient';
import { Endpoints } from '../server/Endpoints';
import axios from 'axios';

export class Files {
    private client: FiveMClient;

    constructor(printerClient: FiveMClient) {
        this.client = printerClient;
    }

    public async getLocalFileList(): Promise<string[]> {
        return await this.client.tcpClient.getFileListAsync();
    }

    /**
     * Get a list of the 10 most recently printed files (quick)
     */
    public async getRecentFileList(): Promise<string[]> {
        const payload = {
            serialNumber: this.client.serialNumber,
            checkCode: this.client.checkCode
        };

        try {
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.GCodeList),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status !== 200) return [];

            const result = response.data as GCodeListResponse;
            if (result.code === 0 && result.message.toLowerCase() === "success") {
                return result.gcodeList;
            }

            console.log(`Error retrieving file list: ${result.message}`);
            return [];
        } catch (error: unknown) {
            const err = error as Error;
            console.log(`GetRecentFileList error: ${err.message}\n${err.stack}`);
            return [];
        }
    }

    public async getGCodeThumbnail(fileName: string): Promise<Buffer | null> {
        const payload = {
            serialNumber: this.client.serialNumber,
            checkCode: this.client.checkCode,
            fileName
        };

        try {
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.GCodeThumb),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status !== 200) return null;

            const result = response.data as ThumbnailResponse;
            if (result.code === 0) {
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

interface GCodeListResponse {
    code: number;
    gcodeList: string[];
    message: string;
}

interface ThumbnailResponse {
    code: number;
    imageData: string;
    message: string;
}