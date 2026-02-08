/**
 * @fileoverview HTTP API control module for FlashForge 5M printers.
 * Provides methods for controlling printer hardware including axes, filtration, camera, fans, LEDs, and filament operations via the HTTP control endpoint.
 */
// src/api/controls/Control.ts
import { FiveMClient } from '../../FiveMClient';
import { Commands } from '../server/Commands';
import { FlashForgeClient } from '../../tcpapi/FlashForgeClient';
import { Endpoints } from '../server/Endpoints';
import { NetworkUtils } from '../network/NetworkUtils';
import axios from 'axios';

/**
 * Provides methods for controlling various aspects of the FlashForge 3D printer.
 * This includes homing axes, controlling filtration, camera, speed, Z-axis offset,
 * fans, LEDs, and filament operations.
 */
export class Control {
    private client: FiveMClient;
    private tcpClient: FlashForgeClient;

    /**
     * Creates an instance of the Control class.
     * @param client The FiveMClient instance used for communication with the printer.
     */
    constructor(client: FiveMClient) {
        this.client = client;
        this.tcpClient = client.tcpClient;
    }

    /**
     * Homes the X, Y, and Z axes of the printer.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async homeAxes(): Promise<boolean> {
        return await this.tcpClient.homeAxes();
    }

    /**
     * Performs a rapid homing of the X, Y, and Z axes.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async homeAxesRapid(): Promise<boolean> {
        return await this.tcpClient.rapidHome();
    }

    /**
     * Turns on the external filtration system.
     * Requires the printer to have filtration control.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setExternalFiltrationOn(): Promise<boolean> {
        if (this.client.filtrationControl) {
            return await this.sendFiltrationCommand(new FiltrationArgs(false, true));
        }
        console.log("SetExternalFiltrationOn() error, filtration not equipped.");
        return false;
    }

    /**
     * Turns on the internal filtration system.
     * Requires the printer to have filtration control.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setInternalFiltrationOn(): Promise<boolean> {
        if (this.client.filtrationControl) {
            return await this.sendFiltrationCommand(new FiltrationArgs(true, false));
        }
        console.log("SetInternalFiltrationOn() error, filtration not equipped.");
        return false;
    }

    /**
     * Turns off both internal and external filtration systems.
     * Requires the printer to have filtration control.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setFiltrationOff(): Promise<boolean> {
        if (this.client.filtrationControl) {
            return await this.sendFiltrationCommand(new FiltrationArgs(false, false));
        }
        console.log("SetFiltrationOff() error, filtration not equipped.");
        return false;
    }

    /**
     * Turns on the printer's camera.
     * Only applicable for Pro models.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async turnCameraOn(): Promise<boolean> {
        if (!this.client.isPro) return false;
        return await this.sendCameraCommand(true);
    }

    /**
     * Turns off the printer's camera.
     * Only applicable for Pro models.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async turnCameraOff(): Promise<boolean> {
        if (!this.client.isPro) return false;
        return await this.sendCameraCommand(false);
    }

    /**
     * Sets the print speed override.
     * @param speed The desired print speed percentage (e.g., 100 for normal speed).
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setSpeedOverride(speed: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ printSpeed: speed });
    }

    /**
     * Sets the Z-axis offset override.
     * @param offset The Z-axis offset value.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setZAxisOverride(offset: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ zOffset: offset });
    }

    /**
     * Sets the chamber fan speed.
     * @param speed The desired chamber fan speed percentage.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setChamberFanSpeed(speed: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ chamberFanSpeed: speed });
    }

    /**
     * Sets the cooling fan speed.
     * @param speed The desired cooling fan speed percentage.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setCoolingFanSpeed(speed: number): Promise<boolean> {
        return await this.sendPrinterControlCmd({ coolingFanSpeed: speed });
    }

    /**
     * Turns on the printer's LED lights.
     * Requires the printer to have LED control.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setLedOn(): Promise<boolean> {
        if (this.client.ledControl) {
            return await this.sendControlCommand(Commands.LightControlCmd, { status: "open" });
        }
        console.log("SetLedOn() error, LEDs not equipped.");
        return false;
    }

    /**
     * Turns off the printer's LED lights.
     * Requires the printer to have LED control.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async setLedOff(): Promise<boolean> {
        if (this.client.ledControl) {
            return await this.sendControlCommand(Commands.LightControlCmd, { status: "close" });
        }
        console.log("SetLedOff() error, LEDs not equipped.");
        return false;
    }

    /**
     * Turns on the filament runout sensor.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async turnRunoutSensorOn(): Promise<boolean> {
        return await this.tcpClient.turnRunoutSensorOn();
    }

    /**
     * Turns off the filament runout sensor.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async turnRunoutSensorOff(): Promise<boolean> {
        return await this.tcpClient.turnRunoutSensorOff();
    }

    // Filament load/unload/change

    /**
     * Prepares the printer for filament loading.
     * @param filament Information about the filament being loaded (type, temperature, etc.).
     *                 The exact structure of this parameter depends on the `FlashForgeClient` implementation.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async prepareFilamentLoad(filament: any): Promise<boolean> {
        return await this.tcpClient.prepareFilamentLoad(filament);
    }

    /**
     * Initiates the filament loading process.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async loadFilament(): Promise<boolean> {
        return await this.tcpClient.loadFilament();
    }

    /**
     * Finalizes the filament loading process.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     */
    public async finishFilamentLoad(): Promise<boolean> {
        return await this.tcpClient.finishFilamentLoad();
    }

    // Internal methods for sending commands

    /**
     * Sends a generic control command to the printer via HTTP POST.
     * This method is used internally by other specific control methods.
     * It ensures that the HTTP client is not busy before sending the command and releases it afterward.
     *
     * @param command The specific command string (from `Commands` enum) to send.
     * @param args The arguments or payload specific to the command.
     * @returns A Promise that resolves to true if the command is acknowledged with a success code, false otherwise or if an error occurs.
     */
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

    /**
     * Sends a command to control various printer settings during a print.
     * This includes Z-axis offset, print speed, chamber fan speed, and cooling fan speed.
     * It prevents fan activation during the initial layers of a print.
     * Throws an error if no print job is active.
     *
     * @param options An object containing the control parameters.
     * @param options.zOffset The Z-axis compensation offset. Defaults to 0.
     * @param options.printSpeed The print speed percentage. Defaults to 100.
     * @param options.chamberFanSpeed The chamber fan speed percentage. Defaults to 100.
     * @param options.coolingFanSpeed The cooling fan speed percentage. Defaults to 100.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     * @throws Error if called when the printer is not actively printing.
     * @private
     */
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
            jobID: "", // jobID seems to be optional or not strictly enforced by the printer for these actions.
            action: command
        };

        return await this.sendControlCommand(Commands.JobControlCmd, payload);
    }

    /**
     * Sends a command to control the printer's filtration system.
     * @param args The filtration arguments specifying internal and external fan states.
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     * @private
     */
    private async sendFiltrationCommand(args: FiltrationArgs): Promise<boolean> {
        return await this.sendControlCommand(Commands.CirculationControlCmd, args);
    }

    /**
     * Sends a command to control the printer's camera.
     * @param enabled True to turn the camera on ("open"), false to turn it off ("close").
     * @returns A Promise that resolves to true if the command is successful, false otherwise.
     * @private
     */
    private async sendCameraCommand(enabled: boolean): Promise<boolean> {
        const payload = { action: enabled ? "open" : "close" };
        return await this.sendControlCommand(Commands.CameraControlCmd, payload);
    }

    /**
     * Checks if the printer is currently printing based on its status information.
     * @param info The printer information object.
     * @returns True if the printer status is "printing", false otherwise.
     * @private
     */
    private isPrinting(info: any): boolean {
        return info.Status === "printing";
    }

    /**
     * Checks if a generic API response indicates success.
     * @param response The generic response object.
     * @returns True if the response code indicates success, false otherwise.
     * @private
     */
    private isResponseOk(response: GenericResponse): boolean {
        return NetworkUtils.isOk(response);
    }
}

/**
 * Represents the arguments for controlling the printer's filtration system.
 * Specifies the desired state (on/off) for internal and external fans.
 */
export class FiltrationArgs {
    /** State of the internal fan ("open" or "close"). */
    internal: string;
    /** State of the external fan ("open" or "close"). */
    external: string;

    /**
     * Creates an instance of FiltrationArgs.
     * @param i True to set the internal fan to "open", false for "close".
     * @param e True to set the external fan to "open", false for "close".
     */
    constructor(i: boolean, e: boolean) {
        this.internal = i ? "open" : "close";
        this.external = e ? "open" : "close";
    }
}

/**
 * Represents a generic response from the printer's API.
 * Typically used to indicate the success or failure of a command.
 */
export interface GenericResponse {
    /** The response code. A code of 0 or 200 usually indicates success. */
    code: number;
    /** A message accompanying the response code, often empty or "ok" for success. */
    message: string;
}