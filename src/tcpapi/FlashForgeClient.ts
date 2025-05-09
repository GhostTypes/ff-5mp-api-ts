// src/tcpapi/FlashForgeClient.ts
import { FlashForgeTcpClient } from './FlashForgeTcpClient';
import { GCodes } from './client/GCodes';
import { GCodeController } from './client/GCodeController';
import { PrinterInfo } from './replays/PrinterInfo';
import { TempInfo } from './replays/TempInfo';
import { EndstopStatus } from './replays/EndstopStatus';
import { PrintStatus } from './replays/PrintStatus';
import { LocationInfo } from './replays/LocationInfo';
import { Filament } from '../api/filament/Filament';

export class FlashForgeClient extends FlashForgeTcpClient {
    private control: GCodeController;
    private is5mPro: boolean = false;

    constructor(hostname: string) {
        super(hostname);
        this.control = new GCodeController(this);
    }

    public getIp(): string {
        return this.hostname;
    }

    public gCode(): GCodeController {
        return this.control;
    }

    public async initControl(): Promise<boolean> {
        console.log("(Legacy API) InitControl()");
        let tries = 0;
        while (tries <= 3) {
            const result = await this.sendRawCmd(GCodes.CmdLogin);
            if (result && !result.includes("Control failed.") && result.includes("ok")) {
                await sleep(100);
                const info = await this.getPrinterInfo();
                if (!info) {
                    console.log("(Legacy API) Failed to get printer info, aborting.");
                    return false;
                }
                console.log("(Legacy API) connected to: " + info.TypeName);
                console.log("(Legacy API) Firmware version: " + info.FirmwareVersion);
                if (info.TypeName.includes("5M") && info.TypeName.includes("Pro")) {
                    this.is5mPro = true;
                }
                this.startKeepAlive();
                return true;
            }
            tries++;
            // ensures no errors from previous connections that were improperly closed
            await this.sendRawCmd(GCodes.CmdLogout);
            await sleep(500 * tries);
        }
        return false;
    }

    public async ledOn(): Promise<boolean> {
        return await this.control.ledOn();
    }

    public async ledOff(): Promise<boolean> {
        return await this.control.ledOff();
    }

    public async homeAxes(): Promise<boolean> {
        return await this.control.home();
    }

    public async rapidHome(): Promise<boolean> {
        return await this.control.rapidHome();
    }

    public async turnRunoutSensorOn(): Promise<boolean> {
        if (this.is5mPro) {
            return await this.sendCmdOk(GCodes.CmdRunoutSensorOn);
        }
        console.log("Filament runout sensor not equipped on this printer.");
        return false;
    }

    public async turnRunoutSensorOff(): Promise<boolean> {
        if (this.is5mPro) {
            return await this.sendCmdOk(GCodes.CmdRunoutSensorOff);
        }
        console.log("Filament runout sensor not equipped on this printer.");
        return false;
    }

    public async setExtruderTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        return await this.control.setExtruderTemp(temp, waitFor);
    }

    public async cancelExtruderTemp(): Promise<boolean> {
        return await this.control.cancelExtruderTemp();
    }

    public async setBedTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        return await this.control.setBedTemp(temp, waitFor);
    }

    public async cancelBedTemp(waitForCool: boolean = false): Promise<boolean> {
        return await this.control.cancelBedTemp(waitForCool);
    }

    public async extrude(length: number, feedrate: number = 450): Promise<boolean> {
        return await this.sendCmdOk(`~G1 E${length} F${feedrate}`);
    }

    public async moveExtruder(x: number, y: number, feedrate: number): Promise<boolean> {
        return await this.sendCmdOk(`~G1 X${x} Y${y} F${feedrate}`);
    }

    public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean> {
        return await this.sendCmdOk(`~G1 X${x} Y${y} Z${z} F${feedrate}`);
    }

    // Filament load/unload code
    public async prepareFilamentLoad(filament: Filament): Promise<boolean> {
        if (!await this.cancelExtruderTemp()) return false;
        if (!await this.sendCmdOk("~G90")) return false; // absolute mode ok
        if (!await this.homeAxes()) return false;
        // todo should probably adjust this feedrate for older printers..
        if (!await this.moveExtruder(0, 0, 9000)) return false;
        if (!await this.setExtruderTemp(filament.loadTemp, true)) return false; // heat extruder (and wait for it)
        return await this.extrude(300); // purge old filament
    }

    private async primeNozzle(): Promise<boolean> {
        if (await this.canExtrude()) return await this.extrude(125);
        console.log("PrimeNozzle() failed, nozzle is not hot enough.");
        return false;
    }

    public async loadFilament(): Promise<boolean> {
        if (await this.canExtrude()) return await this.extrude(250);
        console.log("LoadFilament() failed, nozzle is not hot enough.");
        return false;
    }

    private async canExtrude(): Promise<boolean> {
        const nozzleTemp = await this.getNozzleTemp();
        // todo this might need adjustment?
        return nozzleTemp >= 210;
    }

    public async finishFilamentLoad(): Promise<boolean> {
        if (!await this.cancelExtruderTemp()) return false;
        await sleep(5000);
        return await this.homeAxes();
    }

    // Base command sending
    public async sendCmdOk(cmd: string): Promise<boolean> {
        try {
            const reply = await this.sendCommandAsync(cmd);
            if (reply && reply.includes("Received.") && reply.includes("ok")) return true;
        } catch (ex) {
            console.log(`SendCmdOk exception sending cmd: ${cmd} : ${ex}`);
            return false;
        }
        return false;
    }

    public async sendRawCmd(cmd: string): Promise<string> {
        if (!cmd.includes("M661")) return await this.sendCommandAsync(cmd) || '';
        const list = await this.getFileListAsync();
        return list.join("\n");
    }

    // Replay getters
    public async getPrinterInfo(): Promise<PrinterInfo | null> {
        const response = await this.sendCommandAsync(GCodes.CmdInfoStatus);
        return response ? new PrinterInfo().fromReplay(response) : null;
    }

    public async getTempInfo(): Promise<TempInfo | null> {
        const response = await this.sendCommandAsync(GCodes.CmdTemp);
        return response ? new TempInfo().fromReplay(response) : null;
    }

    public async getEndstopInfo(): Promise<EndstopStatus | null> {
        const response = await this.sendCommandAsync(GCodes.CmdEndstopInfo);
        return response ? new EndstopStatus().fromReplay(response) : null;
    }

    public async getPrintStatus(): Promise<PrintStatus | null> {
        const response = await this.sendCommandAsync(GCodes.CmdPrintStatus);
        return response ? new PrintStatus().fromReplay(response) : null;
    }

    public async getLocationInfo(): Promise<LocationInfo | null> {
        const response = await this.sendCommandAsync(GCodes.CmdInfoXyzab);
        return response ? new LocationInfo().fromReplay(response) : null;
    }

    private async getNozzleTemp(): Promise<number> {
        const temps = await this.getTempInfo();
        return temps ? temps.getExtruderTemp().getCurrent() : 0;
    }
}

// Helper function for sleep
async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}