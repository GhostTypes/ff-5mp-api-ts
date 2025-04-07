// src/tcpapi/client/GCodeController.ts
import { FlashForgeClient } from '../FlashForgeClient';
import { GCodes } from './GCodes';

export class GCodeController {
    private tcpClient: FlashForgeClient;

    constructor(tcpClient: FlashForgeClient) {
        this.tcpClient = tcpClient;
    }

    // Movement
    public async home(): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(GCodes.CmdHomeAxes);
    }

    public async rapidHome(): Promise<boolean> {
        if (!await this.tcpClient.sendCmdOk("~G90")) return false;
        if (!await this.move(105, 105, 220, 9000)) return false;
        return await this.home();
    }

    public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(`~G1 X${x} Y${y} Z${z} F${feedrate}`);
    }

    public async moveExtruder(x: number, y: number, feedrate: number): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(`~G1 X${x} Y${y} F${feedrate}`);
    }

    public async extrude(length: number, feedrate: number = 450): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(`~G1 E${length} F${feedrate}`);
    }

    // Temps
    public async setExtruderTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        const ok = await this.tcpClient.sendCmdOk(`~M104 S${temp}`);
        if (!waitFor) return ok;
        return await this.waitForExtruderTemp(temp);
    }

    public async setBedTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        const ok = await this.tcpClient.sendCmdOk(`~M140 S${temp}`);
        if (!waitFor) return ok;
        return await this.waitForBedTemp(temp);
    }

    public async cancelExtruderTemp(): Promise<boolean> {
        return await this.tcpClient.sendCmdOk("~M104 S0");
    }

    public async cancelBedTemp(waitForCool: boolean = false): Promise<boolean> {
        const ok = await this.tcpClient.sendCmdOk("~M140 S0");
        if (!waitForCool) return ok;
        return await this.waitForBedTemp(37); // *can* remove parts @ 40 but safer side
    }

    public async waitForBedTemp(temp: number): Promise<boolean> {
        const startTime = Date.now();
        const timeout = 30000; // 30s timeout

        while (Date.now() - startTime < timeout) {
            const tempInfo = await this.tcpClient.getTempInfo();
            if (tempInfo && tempInfo.getBedTemp().getCurrent() === temp) return true;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`WaitForBedTemp (target ${temp}) timed out after 30s.`);
        return false;
    }

    public async waitForExtruderTemp(temp: number): Promise<boolean> {
        const startTime = Date.now();
        const timeout = 30000; // 30s timeout

        while (Date.now() - startTime < timeout) {
            const tempInfo = await this.tcpClient.getTempInfo();
            if (tempInfo && tempInfo.getExtruderTemp().getCurrent() === temp) return true;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`WaitForExtruderTemp (target ${temp}) timed out after 30s.`);
        return false;
    }
}