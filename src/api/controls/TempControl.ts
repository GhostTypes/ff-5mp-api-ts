// src/api/controls/TempControl.ts
import { FiveMClient } from '../../FiveMClient';
import { FlashForgeClient } from '../../tcpapi/FlashForgeClient';

/**
 * Provides methods for controlling the temperatures of various components of the FlashForge 3D printer,
 * such as the extruder and the print bed. It relies on the TCP client for direct G-code/M-code commands.
 */
export class TempControl {
    private printerClient: FiveMClient;
    private tcpClient: FlashForgeClient;

    /**
     * Creates an instance of the TempControl class.
     * @param printerClient The FiveMClient instance used for communication with the printer.
     */
    constructor(printerClient: FiveMClient) {
        this.printerClient = printerClient;
        this.tcpClient = printerClient.tcpClient;
    }

    /**
     * Sets the target temperature for the printer's extruder.
     * @param temp The target temperature in Celsius.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setExtruderTemp(temp: number): Promise<boolean> {
        return await this.tcpClient.setExtruderTemp(temp);
    }

    /**
     * Sets the target temperature for the printer's print bed.
     * @param temp The target temperature in Celsius.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setBedTemp(temp: number): Promise<boolean> {
        return await this.tcpClient.setBedTemp(temp);
    }

    /**
     * Cancels any ongoing extruder heating and sets its target temperature to 0.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async cancelExtruderTemp(): Promise<boolean> {
        return await this.tcpClient.cancelExtruderTemp();
    }

    /**
     * Cancels any ongoing print bed heating and sets its target temperature to 0.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async cancelBedTemp(): Promise<boolean> {
        return await this.tcpClient.cancelBedTemp();
    }

    /**
     * Waits for the print bed (platform) to cool down to or below a specified temperature.
     * This is typically used after a print finishes to ensure the part can be safely removed.
     * @param temp The target temperature in Celsius to wait for the bed to reach.
     * @returns A Promise that resolves when the bed temperature is at or below the specified temperature.
     */
    public async waitForPartCool(temp: number): Promise<void> {
        await this.tcpClient.gCode().waitForBedTemp(temp, true);
    }

    /*
     * TODO: This method is commented out as it needs verification.
     * It's intended to send a temperature control command via the HTTP API,
     * which might be an alternative or a supplement to the TCP-based commands.
     *
     * private async sendTempControlCommand(
     *     bedTemp: number,
     *     rightExtruder: number,
     *     leftExtruder: number,
     *     chamberTemp: number
     * ): Promise<boolean> {
     *     const payload = {
     *         platformTemp: bedTemp,
     *         rightTemp: rightExtruder,
     *         leftTemp: leftExtruder,
     *         chamberTemp: chamberTemp
     *     };
     *
     *     return await this.printerClient.control.sendControlCommand(Commands.TempControlCmd, payload);
     * }
     */
}
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