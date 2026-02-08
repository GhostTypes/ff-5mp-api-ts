/**
 * @fileoverview HTTP API information retrieval module for FlashForge 5M printers.
 * Fetches printer status, machine state, and detailed information from the detail endpoint, transforming raw responses into structured machine info.
 */
// src/api/controls/Info.ts
import { FiveMClient } from '../../FiveMClient';
import { FFPrinterDetail, FFMachineInfo, MachineState } from '../../models/ff-models';
import { Endpoints } from '../server/Endpoints';
import axios from 'axios';
import { MachineInfo } from '../../models/MachineInfo';
import { GenericResponse } from './Control';

/**
 * Provides methods for retrieving various information and status details from the FlashForge 3D printer.
 * This includes general machine information, printing status, and raw detail responses.
 */
export class Info {
    private client: FiveMClient;

    /**
     * Creates an instance of the Info class.
     * @param printerClient The FiveMClient instance used for communication with the printer.
     */
    constructor(printerClient: FiveMClient) {
        this.client = printerClient;
    }

    /**
     * Retrieves comprehensive machine information, processed into the `FFMachineInfo` model.
     * This method fetches detailed data from the printer and transforms it.
     * @returns A Promise that resolves to an `FFMachineInfo` object, or null if an error occurs or no data is returned.
     */
    public async get(): Promise<FFMachineInfo | null> {
        const detail = await this.getDetailResponse();
        return detail ? new MachineInfo().fromDetail(detail.detail) : null;
    }

    /**
     * Checks if the printer is currently in the "printing" state.
     * @returns A Promise that resolves to true if the printer is printing, false otherwise or if status cannot be determined.
     */
    public async isPrinting(): Promise<boolean> {
        const info = await this.get();
        return info?.Status === "printing" || false;
    }

    /**
     * Retrieves the raw status string of the printer (e.g., "ready", "printing", "error").
     * @returns A Promise that resolves to the status string, or null if it cannot be determined.
     */
    public async getStatus(): Promise<string | null> {
        const info = await this.get();
        return info?.Status ?? null;
    }

    /**
     * Retrieves the machine state as a `MachineState` enum value.
     * @returns A Promise that resolves to a `MachineState` enum value, or null if it cannot be determined.
     */
    public async getMachineState(): Promise<MachineState | null> {
        const info = await this.get();
        return info?.MachineState ?? null;
    }

    /**
     * Retrieves the raw detailed response from the printer's detail endpoint.
     * This contains a wealth of information about the printer's current state.
     *
     * @returns A Promise that resolves to a `DetailResponse` object containing the raw printer details,
     *          or null if the request fails or an error occurs.
     */
    public async getDetailResponse(): Promise<DetailResponse | null> {
        const payload = {
            serialNumber: this.client.serialNumber,
            checkCode: this.client.checkCode
        };

        try {
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

export interface DetailResponse extends GenericResponse {
    detail: FFPrinterDetail;
}

/**
 * Represents the structure of the response from the printer's detail endpoint.
 * @interface DetailResponse
 * @extends GenericResponse
 */
export interface DetailResponse extends GenericResponse {
    /** The detailed printer information object (`FFPrinterDetail`). */
    detail: FFPrinterDetail;
}