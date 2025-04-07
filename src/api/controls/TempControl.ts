// src/api/controls/TempControl.ts
import { FiveMClient } from '../../FiveMClient';
import { FlashForgeClient } from '../../tcpapi/FlashForgeClient';

export class TempControl {
    private printerClient: FiveMClient;
    private tcpClient: FlashForgeClient;

    constructor(printerClient: FiveMClient) {
        this.printerClient = printerClient;
        this.tcpClient = printerClient.tcpClient;
    }

    public async setExtruderTemp(temp: number): Promise<boolean> {
        return await this.tcpClient.setExtruderTemp(temp);
    }

    public async setBedTemp(temp: number): Promise<boolean> {
        return await this.tcpClient.setBedTemp(temp);
    }

    public async cancelExtruderTemp(): Promise<boolean> {
        return await this.tcpClient.cancelExtruderTemp();
    }

    public async cancelBedTemp(): Promise<boolean> {
        return await this.tcpClient.cancelBedTemp();
    }

    public async waitForPartCool(temp: number): Promise<void> {
        await this.tcpClient.gCode().waitForBedTemp(temp);
    }

    /* TODO: This should work as is but needs verification
    private async sendTempControlCommand(
        bedTemp: number,
        rightExtruder: number,
        leftExtruder: number,
        chamberTemp: number
    ): Promise<boolean> {
        const payload = {
            platformTemp: bedTemp,
            rightTemp: rightExtruder,
            leftTemp: leftExtruder,
            chamberTemp: chamberTemp
        };

        return await this.printerClient.control.sendControlCommand(Commands.TempControlCmd, payload);
    }
    */
}