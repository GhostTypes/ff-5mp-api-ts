/**
 * @fileoverview Abstraction layer for sending specific G-code commands to FlashForge printers,
 * wrapping operations like LED control, job management, homing, and temperature control.
 */
// src/tcpapi/client/GCodeController.ts
import { FlashForgeClient } from '../FlashForgeClient';
import { GCodes } from './GCodes';
export class GCodeController {
    private tcpClient: FlashForgeClient;

    /**
     * Creates an instance of GCodeController.
     * @param tcpClient The `FlashForgeClient` instance used to send commands to the printer.
     */
    constructor(tcpClient: FlashForgeClient) {
        this.tcpClient = tcpClient;
    }

    /**
     * Turns the printer's LED lights on using the `CmdLedOn` G-code.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async ledOn(): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(GCodes.CmdLedOn);
    }

    /**
     * Turns the printer's LED lights off using the `CmdLedOff` G-code.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async ledOff(): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(GCodes.CmdLedOff);
    }

    /**
     * Pauses the current print job using the `CmdPausePrint` G-code.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async pauseJob() {
        return await this.tcpClient.sendCmdOk(GCodes.CmdPausePrint);
    }

    /**
     * Resumes a paused print job using the `CmdResumePrint` G-code.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async resumeJob() {
        return await this.tcpClient.sendCmdOk(GCodes.CmdResumePrint);
    }

    /**
     * Stops the current print job using the `CmdStopPrint` G-code.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async stopJob() {
        return await this.tcpClient.sendCmdOk(GCodes.CmdStopPrint);
    }

    /**
     * Starts printing a specified file using the `CmdStartPrint` G-code.
     * The filename is embedded into the G-code command string.
     * @param filename The name of the file to start printing.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async startJob(filename: string) {
        return await this.tcpClient.sendCmdOk(GCodes.CmdStartPrint.replace("%%filename%%", filename));
    }

    /**
     * Homes all printer axes (X, Y, Z) using the `CmdHomeAxes` G-code (typically G28).
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async home(): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(GCodes.CmdHomeAxes);
    }

    /**
     * Performs a "rapid home" sequence.
     * This involves setting absolute positioning (G90), moving to a predefined safe position,
     * and then performing a standard home operation.
     * @returns A Promise that resolves to true if all steps in the sequence are successful, false otherwise.
     */
    public async rapidHome(): Promise<boolean> {
        if (!await this.tcpClient.sendCmdOk("~G90")) return false; // Set to absolute positioning
        if (!await this.move(105, 105, 220, 9000)) return false; // Move to a predefined position
        return await this.home(); // Perform standard homing
    }

    /**
     * Moves the print head to the specified X, Y, and Z coordinates at a given feedrate.
     * Uses the G1 command.
     * @param x The target X coordinate.
     * @param y The target Y coordinate.
     * @param z The target Z coordinate.
     * @param feedrate The speed of movement in mm/min.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(`~G1 X${x} Y${y} Z${z} F${feedrate}`);
    }

    /**
     * Moves the print head in the XY plane to the specified coordinates at a given feedrate.
     * Uses the G1 command.
     * @param x The target X coordinate.
     * @param y The target Y coordinate.
     * @param feedrate The speed of movement in mm/min.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async moveExtruder(x: number, y: number, feedrate: number): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(`~G1 X${x} Y${y} F${feedrate}`);
    }

    /**
     * Extrudes a specified length of filament at a given feedrate.
     * Uses the G1 E[length] F[feedrate] command.
     * @param length The length of filament to extrude in millimeters.
     * @param feedrate The speed of extrusion in mm/min. Defaults to 450.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async extrude(length: number, feedrate: number = 450): Promise<boolean> {
        return await this.tcpClient.sendCmdOk(`~G1 E${length} F${feedrate}`);
    }

    /**
     * Sets the target temperature for the extruder.
     * Uses the M104 S[temp] command.
     * @param temp The target temperature in Celsius.
     * @param waitFor If true, the method will also call `waitForExtruderTemp` to wait until the target temperature is reached. Defaults to false.
     * @returns A Promise that resolves to true if the command(s) were acknowledged successfully, false otherwise.
     */
    public async setExtruderTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        const ok = await this.tcpClient.sendCmdOk(`~M104 S${temp}`);
        if (!waitFor) return ok;
        return await this.waitForExtruderTemp(temp);
    }

    /**
     * Sets the target temperature for the print bed.
     * Uses the M140 S[temp] command.
     * @param temp The target temperature in Celsius.
     * @param waitFor If true, the method will also call `waitForBedTemp` to wait until the target temperature is reached or cooled down. Defaults to false.
     * @returns A Promise that resolves to true if the command(s) were acknowledged successfully, false otherwise.
     */
    public async setBedTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        const ok = await this.tcpClient.sendCmdOk(`~M140 S${temp}`);
        if (!waitFor) return ok;
        return await this.waitForBedTemp(temp, false);
    }

    /**
     * Cancels extruder heating by setting its target temperature to 0.
     * Uses the M104 S0 command.
     * @returns A Promise that resolves to true if the command was acknowledged successfully, false otherwise.
     */
    public async cancelExtruderTemp(): Promise<boolean> {
        return await this.tcpClient.sendCmdOk("~M104 S0");
    }

    /**
     * Cancels print bed heating by setting its target temperature to 0.
     * Uses the M140 S0 command.
     * @param waitForCool If true, waits for the bed to cool down to a safe temperature (37°C) after sending the command. Defaults to false.
     * @returns A Promise that resolves to true if the command(s) were acknowledged successfully, false otherwise.
     */
    public async cancelBedTemp(waitForCool: boolean = false): Promise<boolean> {
        const ok = await this.tcpClient.sendCmdOk("~M140 S0");
        if (!waitForCool) return ok;
        return await this.waitForBedTemp(37, true); // *can* remove parts @ 40 but safer side
    }

    /**
     * Waits for the print bed to reach a specified target temperature.
     * This method polls the printer's temperature and also sends a G-code command (M190 or M191)
     * to make the printer itself wait.
     * @param temp The target bed temperature in Celsius.
     * @param cooling If true, waits for the temperature to cool down to or below `temp` (uses M191 R[temp]).
     *                If false, waits for the temperature to heat up to or above `temp` (uses M190 S[temp]).
     * @returns A Promise that resolves to true if the target temperature is reached within the timeout (30s), false otherwise.
     * @todo Implement customizable timeouts.
     */
    public async waitForBedTemp(temp: number, cooling: boolean): Promise<boolean> {
        // wait machine-side as well
        if (cooling) await this.tcpClient.sendCmdOk(GCodes.WaitForBedTemp + `R${temp}`);
        else await this.tcpClient.sendCmdOk(GCodes.WaitForBedTemp + `S${temp}`); // M190 S[temp]
        const startTime = Date.now();
        const timeout = 30000; // 30s timeout

        while (Date.now() - startTime < timeout) {
            const tempInfo = await this.tcpClient.getTempInfo();
            if (tempInfo && tempInfo.getBedTemp()?.getCurrent() === temp) return true;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second
        }

        console.log(`WaitForBedTemp (target ${temp}) timed out after 30s.`);
        return false;
    }

    /**
     * Waits for the extruder to reach a specified target temperature.
     * This method polls the printer's temperature and also sends a G-code command (M109 S[temp])
     * to make the printer itself wait.
     * @param temp The target extruder temperature in Celsius.
     * @returns A Promise that resolves to true if the target temperature is reached within the timeout (30s), false otherwise.
     * @todo Implement customizable timeouts.
     */
    public async waitForExtruderTemp(temp: number): Promise<boolean> {
        // wait machine-side as well
        await this.tcpClient.sendCmdOk(GCodes.WaitForHotendTemp + `S${temp}`); // M109 S[temp]
        const startTime = Date.now();
        const timeout = 30000; // 30s timeout

        while (Date.now() - startTime < timeout) {
            const tempInfo = await this.tcpClient.getTempInfo();
            if (tempInfo && tempInfo.getExtruderTemp()?.getCurrent() === temp) return true;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second
        }

        console.log(`WaitForExtruderTemp (target ${temp}) timed out after 30s.`);
        return false;
    }
}