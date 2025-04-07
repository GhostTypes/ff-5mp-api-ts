// src/api/controls/Info.ts
import { FiveMClient } from '../../FiveMClient';
import { FFPrinterDetail, FFMachineInfo, MachineState } from '../../models/ff-models';
import { Endpoints } from '../server/Endpoints';
import axios from 'axios';
import { MachineInfo } from '../../models/MachineInfo';

export class Info {
    private client: FiveMClient;

    constructor(printerClient: FiveMClient) {
        this.client = printerClient;
    }

    public async get(): Promise<FFMachineInfo | null> {
        const detail = await this.getDetailResponse();
        return detail ? new MachineInfo().fromDetail(detail.detail) : null;
    }

    public async isPrinting(): Promise<boolean> {
        const info = await this.get();
        return info?.Status === "printing" || false;
    }

    public async getStatus(): Promise<string | null> {
        const info = await this.get();
        return info?.Status ?? null;
    }

    public async getState(): Promise<MachineState | null> {
        const info = await this.get();
        return info?.MachineState ?? null;
    }

// In Info.ts, modify the getDetailResponse method to log the raw response
    public async getDetailResponse(): Promise<DetailResponse | null> {
        const payload = {
            serialNumber: this.client.serialNumber,
            checkCode: this.client.checkCode
        };

        try {
            console.log("Sending detail request to:", this.client.getEndpoint(Endpoints.Detail));
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.Detail),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status !== 200) {
                console.log("Non-200 status from detail endpoint:", response.status);
                return null;
            }

            //console.log("Raw detail response:", JSON.stringify(response.data, null, 2));
            return response.data as DetailResponse;
        } catch (error: unknown) {
            const err = error as Error;
            console.log(`GetDetailResponse Request error: ${err.message}`);
            if ('cause' in err) {
                console.log(`GetDetailResponse Inner exception: ${(err as any).cause}`);
            }
            return null;
        }
    }
}

export interface DetailResponse {
    code: number;
    detail: FFPrinterDetail;
    message: string;
}