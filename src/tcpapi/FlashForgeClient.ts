/**
 * @fileoverview High-level TCP client for FlashForge 3D printers, providing printer control
 * workflows (LED, job management, homing, temperature, filament) via G-code commands.
 */
// src/tcpapi/FlashForgeClient.ts
import { FlashForgeTcpClient } from './FlashForgeTcpClient';
import { GCodes } from './client/GCodes';
import { GCodeController } from './client/GCodeController';
import { PrinterInfo } from './replays/PrinterInfo';
import { TempInfo } from './replays/TempInfo';
import { EndstopStatus } from './replays/EndstopStatus';
import { PrintStatus } from './replays/PrintStatus';
import { LocationInfo } from './replays/LocationInfo';
import { ThumbnailInfo } from './replays/ThumbnailInfo';
import { Filament } from '../api/filament/Filament';
import path from "node:path";
export class FlashForgeClient extends FlashForgeTcpClient {
    /** Controller for sending specific G-code commands. */
    private control: GCodeController;
    /** Flag indicating if the connected printer is a 5M Pro model, which may have specific features. */
    private is5mPro: boolean = false;

    /**
     * Creates an instance of FlashForgeClient.
     * @param hostname The IP address or hostname of the FlashForge printer.
     */
    constructor(hostname: string) {
        super(hostname);
        this.control = new GCodeController(this);
    }

    /**
     * Gets the IP address or hostname of the connected printer.
     * @returns The printer's hostname or IP address.
     */
    public getIp(): string {
        return this.hostname;
    }

    /**
     * Gets the GCodeController instance associated with this client,
     * providing access to specific G-code command methods.
     * @returns The `GCodeController` instance.
     */
    public gCode(): GCodeController {
        return this.control;
    }

    /**
     * Initializes the control connection with the printer.
     * This typically involves sending a login command, retrieving printer info,
     * and starting a keep-alive mechanism. Retries on failure.
     * @returns A Promise that resolves to true if control is successfully initialized, false otherwise.
     */
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

    /**
     * Turns the printer's LED lights on.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async ledOn(): Promise<boolean> { return await this.control.ledOn(); }

    /**
     * Turns the printer's LED lights off.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async ledOff(): Promise<boolean> { return await this.control.ledOff(); }

    /**
     * Pauses the current print job.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async pauseJob(): Promise<boolean> { return await this.control.pauseJob(); }

    /**
     * Resumes a paused print job.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async resumeJob(): Promise<boolean> { return await this.control.resumeJob(); }

    /**
     * Stops the current print job.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async stopJob(): Promise<boolean> { return await this.control.stopJob(); }

    /**
     * Starts a print job from a file stored on the printer.
     * @param name The name of the file to print (typically without path).
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async startJob(name: string): Promise<boolean> { return await this.control.startJob(name); }

    /**
     * Homes all axes (X, Y, Z) of the printer.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async homeAxes(): Promise<boolean> { return await this.control.home(); }

    /**
     * Performs a rapid homing of all axes.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async rapidHome(): Promise<boolean> { return await this.control.rapidHome(); }

    /**
     * Turns on the filament runout sensor.
     * This functionality is only available on specific printer models (e.g., 5M Pro).
     * @returns A Promise that resolves to true if the command is successful and applicable, false otherwise.
     */
    public async turnRunoutSensorOn(): Promise<boolean> {
        if (this.is5mPro) {
            return await this.sendCmdOk(GCodes.CmdRunoutSensorOn);
        }
        console.log("Filament runout sensor not equipped on this printer.");
        return false;
    }

    /**
     * Turns off the filament runout sensor.
     * This functionality is only available on specific printer models (e.g., 5M Pro).
     * @returns A Promise that resolves to true if the command is successful and applicable, false otherwise.
     */
    public async turnRunoutSensorOff(): Promise<boolean> {
        if (this.is5mPro) {
            return await this.sendCmdOk(GCodes.CmdRunoutSensorOff);
        }
        console.log("Filament runout sensor not equipped on this printer.");
        return false;
    }

    /**
     * Sets the target temperature for the extruder.
     * @param temp The target temperature in Celsius.
     * @param waitFor If true, the method will wait until the target temperature is reached. Defaults to false.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setExtruderTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        return await this.control.setExtruderTemp(temp, waitFor);
    }

    /**
     * Cancels extruder heating and sets its target temperature to 0.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async cancelExtruderTemp(): Promise<boolean> {
        return await this.control.cancelExtruderTemp();
    }

    /**
     * Sets the target temperature for the print bed.
     * @param temp The target temperature in Celsius.
     * @param waitFor If true, the method will wait until the target temperature is reached. Defaults to false.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setBedTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
        return await this.control.setBedTemp(temp, waitFor);
    }

    /**
     * Cancels print bed heating and sets its target temperature to 0.
     * @param waitForCool If true, waits for the bed to cool down after canceling. Defaults to false.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async cancelBedTemp(waitForCool: boolean = false): Promise<boolean> {
        return await this.control.cancelBedTemp(waitForCool);
    }

    /**
     * Commands the extruder to extrude a specific length of filament.
     * Uses G1 E[length] F[feedrate] command.
     * @param length The length of filament to extrude in millimeters.
     * @param feedrate The feedrate for extrusion in mm/min. Defaults to 450.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async extrude(length: number, feedrate: number = 450): Promise<boolean> {
        return await this.sendCmdOk(`~G1 E${length} F${feedrate}`);
    }

    /**
     * Moves the extruder to a specified X, Y position.
     * Uses G1 X[x] Y[y] F[feedrate] command.
     * @param x The target X coordinate.
     * @param y The target Y coordinate.
     * @param feedrate The feedrate for the movement in mm/min.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async moveExtruder(x: number, y: number, feedrate: number): Promise<boolean> {
        return await this.sendCmdOk(`~G1 X${x} Y${y} F${feedrate}`);
    }

    /**
     * Moves the extruder to a specified X, Y, Z position.
     * Uses G1 X[x] Y[y] Z[z] F[feedrate] command.
     * @param x The target X coordinate.
     * @param y The target Y coordinate.
     * @param z The target Z coordinate.
     * @param feedrate The feedrate for the movement in mm/min.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean> {
        return await this.sendCmdOk(`~G1 X${x} Y${y} Z${z} F${feedrate}`);
    }

    /**
     * Prepares the printer for filament loading.
     * This involves canceling current extruder temperature, setting absolute mode, homing axes,
     * moving the extruder to a safe position, heating the extruder to the filament's load temperature,
     * and then purging some filament.
     * @param filament The `Filament` object containing details like load temperature.
     * @returns A Promise that resolves to true if all preparation steps are successful, false otherwise.
     */
    public async prepareFilamentLoad(filament: Filament): Promise<boolean> {
        if (!await this.cancelExtruderTemp()) return false;
        if (!await this.sendCmdOk("~G90")) return false; // absolute mode ok
        if (!await this.homeAxes()) return false;
        // todo should probably adjust this feedrate for older printers..
        if (!await this.moveExtruder(0, 0, 9000)) return false;
        if (!await this.setExtruderTemp(filament.loadTemp, true)) return false; // heat extruder (and wait for it)
        return await this.extrude(300); // purge old filament
    }

    /**
     * Primes the nozzle by extruding a small amount of filament.
     * Checks if the nozzle is hot enough before attempting to extrude.
     * @returns A Promise that resolves to true if priming is successful, false otherwise.
     * @private
     */
    private async primeNozzle(): Promise<boolean> {
        if (await this.canExtrude()) return await this.extrude(125);
        console.log("PrimeNozzle() failed, nozzle is not hot enough.");
        return false;
    }

    /**
     * Loads filament by extruding a specified amount.
     * Checks if the nozzle is hot enough before attempting to extrude.
     * @returns A Promise that resolves to true if loading is successful, false otherwise.
     */
    public async loadFilament(): Promise<boolean> {
        if (await this.canExtrude()) return await this.extrude(250);
        console.log("LoadFilament() failed, nozzle is not hot enough.");
        return false;
    }

    /**
     * Checks if the nozzle is hot enough to allow extrusion.
     * @returns A Promise that resolves to true if the nozzle temperature is at or above 210°C, false otherwise.
     * @private
     */
    private async canExtrude(): Promise<boolean> {
        const nozzleTemp = await this.getNozzleTemp();
        // todo this might need adjustment?
        return nozzleTemp >= 210;
    }

    /**
     * Finishes the filament loading process.
     * This involves canceling extruder heating, waiting for a short period, and then homing the axes.
     * @returns A Promise that resolves to true if finishing steps are successful, false otherwise.
     */
    public async finishFilamentLoad(): Promise<boolean> {
        if (!await this.cancelExtruderTemp()) return false;
        await sleep(5000);
        return await this.homeAxes();
    }

    /**
     * Sends a G-code/M-code command to the printer and checks for an "ok" response.
     * Expects the printer's reply to include "Received." and "ok" to be considered successful.
     * @param cmd The command string to send (e.g., "~M115").
     * @returns A Promise that resolves to true if the command is acknowledged with "ok", false otherwise or on error.
     */
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

    /**
     * Sends a raw command string to the printer and returns the raw response.
     * Handles a special case for "M661" (list files), which is processed differently.
     * @param cmd The raw command string to send.
     * @returns A Promise that resolves to the printer's raw string response, or an empty string on failure.
     *          For "M661", it returns a newline-separated list of files.
     */
    public async sendRawCmd(cmd: string): Promise<string> {
        if (!cmd.includes("M661")) return await this.sendCommandAsync(cmd) || '';
        const list = await this.getFileListAsync();
        return list.join("\n");
    }

    /**
     * Retrieves general printer information (model, firmware, etc.).
     * Sends `GCodes.CmdInfoStatus` and parses the response into a `PrinterInfo` object.
     * @returns A Promise that resolves to a `PrinterInfo` object, or null if retrieval fails.
     */
    public async getPrinterInfo(): Promise<PrinterInfo | null> {
        const response = await this.sendCommandAsync(GCodes.CmdInfoStatus);
        return response ? new PrinterInfo().fromReplay(response) : null;
    }

    /**
     * Retrieves current temperature information (extruder, bed).
     * Sends `GCodes.CmdTemp` and parses the response into a `TempInfo` object.
     * @returns A Promise that resolves to a `TempInfo` object, or null if retrieval fails.
     */
    public async getTempInfo(): Promise<TempInfo | null> {
        const response = await this.sendCommandAsync(GCodes.CmdTemp);
        return response ? new TempInfo().fromReplay(response) : null;
    }

    /**
     * Retrieves the status of the printer's endstops.
     * Sends `GCodes.CmdEndstopInfo` and parses the response into an `EndstopStatus` object.
     * @returns A Promise that resolves to an `EndstopStatus` object, or null if retrieval fails.
     */
    public async getEndstopInfo(): Promise<EndstopStatus | null> {
        const response = await this.sendCommandAsync(GCodes.CmdEndstopInfo);
        return response ? new EndstopStatus().fromReplay(response) : null;
    }

    /**
     * Retrieves the current print job status.
     * Sends `GCodes.CmdPrintStatus` and parses the response into a `PrintStatus` object.
     * @returns A Promise that resolves to a `PrintStatus` object, or null if retrieval fails.
     */
    public async getPrintStatus(): Promise<PrintStatus | null> {
        const response = await this.sendCommandAsync(GCodes.CmdPrintStatus);
        return response ? new PrintStatus().fromReplay(response) : null;
    }

    /**
     * Retrieves the current XYZ coordinates of the print head.
     * Sends `GCodes.CmdInfoXyzab` and parses the response into a `LocationInfo` object.
     * @returns A Promise that resolves to a `LocationInfo` object, or null if retrieval fails.
     */
    public async getLocationInfo(): Promise<LocationInfo | null> {
        const response = await this.sendCommandAsync(GCodes.CmdInfoXyzab);
        return response ? new LocationInfo().fromReplay(response) : null;
    }

    /**
     * Retrieves the current temperature of the nozzle (extruder).
     * @returns A Promise that resolves to the current nozzle temperature in Celsius, or 0 if unavailable.
     * @private
     */
    private async getNozzleTemp(): Promise<number> {
        const temps = await this.getTempInfo();
        return temps?.getExtruderTemp()?.getCurrent() ?? 0;
    }

    /**
     * Retrieves the thumbnail image for a specified G-code file stored on the printer.
     * The command requires the file path to be prefixed with `/data/`.
     * @param fileName The name of the file (e.g., "my_print.gcode") for which to retrieve the thumbnail.
     *                 The `/data/` prefix will be added if not present.
     * @returns A Promise that resolves to a `ThumbnailInfo` object containing thumbnail data,
     *          or null if retrieval fails or the file has no thumbnail.
     */
    public async getThumbnail(fileName: string): Promise<ThumbnailInfo | null> {
        // Ensure the filename has the required /data/ prefix
        const filePath = fileName.startsWith('/data/') ? fileName : `/data/${fileName}`;
        //console.log(`Getting thumbnail for: ${filePath}`);
        
        try {
            const response = await this.sendCommandAsync(`${GCodes.CmdGetThumbnail} ${filePath}`);
            if (!response) {
                console.log(`Failed to get thumbnail for ${fileName} - null response`);
                return null;
            }
            
            return new ThumbnailInfo().fromReplay(response, fileName);
        } catch (error) {
            console.log(`Failed to get thumbnail for ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

}

// Helper function for sleep
/**
 * Pauses execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to sleep.
 * @returns A Promise that resolves after the specified delay.
 */
async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}