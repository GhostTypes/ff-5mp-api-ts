// src/api/controls/Control.ts
import { FiveMClient } from '../../FiveMClient';
import { Commands } from '../server/Commands';
import { FlashForgeClient } from '../../tcpapi/FlashForgeClient';
import { Endpoints } from '../server/Endpoints';
import { NetworkUtils } from '../network/NetworkUtils';
import axios from 'axios';

export class Control {
    private client: FiveMClient;
    private tcpClient: FlashForgeClient;

    constructor(client: FiveMClient) {
        this.client = client;
        this.tcpClient = client.tcpClient;
    }

    public async homeAxes(): Promise<boolean> {
        return await this.tcpClient.homeAxes();
    }

    public async homeAxesRapid(): Promise<boolean> {
        return await this.tcpClient.rapidHome();
    }

    public async setExternalFiltrationOn(): Promise<boolean> {
        if (this.client.filtrationControl) {
            return await this.sendFiltrationCommand(new FiltrationArgs(false, true));
        }
        console.log("SetExternalFiltrationOn() error, filtration not equipped.");
        return false;
    }

    public async setInternalFiltrationOn(): Promise<boolean> {
        if (this.client.filtrationControl) {
            return await this.sendFiltrationCommand(new FiltrationArgs(true, false));
        }
        console.log("SetInternalFiltrationOn() error, filtration not equipped.");
        return false;
    }

    public async setFiltrationOff(): Promise<boolean> {
        if (this.client.filtrationControl) {
            return await this.sendFiltrationCommand(new FiltrationArgs(false, false));
        }
        console.log("SetFiltrationOff() error, filtration not equipped.");
        return false;
    }

    public async turnCameraOn(): Promise<boolean> {
        if (!this.client.isPro) return false;
        return await this.sendCameraCommand(true);
    }

    public async turnCameraOff(): Promise<boolean> {
        if (!this.client.isPro) return false;
        return await this.sendCameraCommand(false);
    }

    public async setSpeedOverride(speed: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ printSpeed: speed });
    }

    public async setZAxisOverride(offset: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ zOffset: offset });
    }

    public async setChamberFanSpeed(speed: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ chamberFanSpeed: speed });
    }

    public async setCoolingFanSpeed(speed: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ coolingFanSpeed: speed });
    }

    public async setLedOn(): Promise<boolean> {
        if (this.client.ledControl) {
            return await this.sendControlCommand(Commands.LightControlCmd, { status: "open" });
        }
        console.log("SetLedOn() error, LEDs not equipped.");
        return false;
    }

    public async setLedOff(): Promise<boolean> {
        if (this.client.ledControl) {
            return await this.sendControlCommand(Commands.LightControlCmd, { status: "close" });
        }
        console.log("SetLedOff() error, LEDs not equipped.");
        return false;
    }

    public async turnRunoutSensorOn(): Promise<boolean> {
        return await this.tcpClient.turnRunoutSensorOn();
    }

    public async turnRunoutSensorOff(): Promise<boolean> {
        return await this.tcpClient.turnRunoutSensorOff();
    }

    // Filament load/unload/change

    public async prepareFilamentLoad(filament: any): Promise<boolean> {
        return await this.tcpClient.prepareFilamentLoad(filament);
    }

    public async loadFilament(): Promise<boolean> {
        return await this.tcpClient.loadFilament();
    }

    public async finishFilamentLoad(): Promise<boolean> {
        return await this.tcpClient.finishFilamentLoad();
    }

    // Internal methods for sending commands

    public async sendControlCommand(command: string, args: any): Promise<boolean> {
        const payload = {
            serialNumber: this.client.serialNumber,
            checkCode: this.client.checkCode,
            payload: {
                cmd: command,
                args: args
            }
        };

        console.log("SendControlCommand:\n" + JSON.stringify(payload));

        try {
            await this.client.isHttpClientBusy();
            const response = await axios.post(
                this.client.getEndpoint(Endpoints.Control),
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = response.data;
            console.log(`Command reply: ${JSON.stringify(data)}`);

            const result = data as GenericResponse;
            return this.isResponseOk(result);
        } catch (e) {
            return false;
        } finally {
            this.client.releaseHttpClient();
        }
    }

    private async sendPrinterControlCmd({
                                            zOffset = 0,
                                            printSpeed = 100,
                                            chamberFanSpeed = 100,
                                            coolingFanSpeed = 100
                                        }: {
        zOffset?: number;
        printSpeed?: number;
        chamberFanSpeed?: number;
        coolingFanSpeed?: number;
    }): Promise<boolean> {
        const info = await this.client.info.get();

        // @ts-ignore
        if (info.CurrentPrintLayer < 2) {
            // Don't accidentally turn on the fans in the initial layers
            chamberFanSpeed = 0;
            coolingFanSpeed = 0;
        }

        if (!this.isPrinting(info)) {
            throw new Error("Attempted to send printerCtl_cmd with no active job");
        }

        const payload = {
            zAxisCompensation: zOffset,
            speed: printSpeed,
            chamberFan: chamberFanSpeed,
            coolingFan: coolingFanSpeed,
            coolingLeftFan: 0 // This is unused
        };

        return await this.sendControlCommand(Commands.PrinterControlCmd, payload);
    }

    public async sendJobControlCmd(command: string): Promise<boolean> {
        const payload = {
            jobID: "",
            action: command
        };

        return await this.sendControlCommand(Commands.JobControlCmd, payload);
    }

    private async sendFiltrationCommand(args: FiltrationArgs): Promise<boolean> {
        return await this.sendControlCommand(Commands.CirculationControlCmd, args);
    }

    private async sendCameraCommand(enabled: boolean): Promise<boolean> {
        const payload = { action: enabled ? "open" : "close" };
        return await this.sendControlCommand(Commands.CameraControlCmd, payload);
    }

    private isPrinting(info: any): boolean {
        return info.Status === "printing";
    }

    private isResponseOk(response: GenericResponse): boolean {
        return NetworkUtils.isOk(response);
    }
}

export class FiltrationArgs {
    internal: string;
    external: string;

    constructor(i: boolean, e: boolean) {
        this.internal = i ? "open" : "close";
        this.external = e ? "open" : "close";
    }
}

export interface GenericResponse {
    code: number;
    message: string;
}