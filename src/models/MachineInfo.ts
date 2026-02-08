/**
 * @fileoverview Transforms raw printer detail data from the API into structured machine info.
 */
import {FFMachineInfo, FFPrinterDetail, MachineState, MatlStationInfo, IndepMatlInfo} from './ff-models';

/**
 * Transforms printer detail data from the API response format into a structured `FFMachineInfo` object.
 * This class centralizes the logic for mapping and calculating various properties of the printer's state
 * and capabilities based on the raw data received from the printer.
 */
export class MachineInfo {
    /**
     * Converts printer details from the API response format (`FFPrinterDetail`)
     * to our internal `FFMachineInfo` model.
     *
     * This method performs several transformations:
     * - Calculates print ETA and completion time.
     * - Formats total run time and current print duration.
     * - Converts status strings (like "open", "close") to boolean values for states like auto-shutdown, door status, fan status, and light status.
     * - Calculates estimated filament length and weight used for the current job based on progress.
     * - Maps raw status strings to the `MachineState` enum.
     * - Formats disk space to two decimal places.
     *
     * @param detail The `FFPrinterDetail` object received from the printer's API. If null, the method returns null.
     * @returns An `FFMachineInfo` object containing structured and formatted printer information,
     *          or null if the input `detail` is null or an error occurs during processing.
     */
    public fromDetail(detail: FFPrinterDetail | null): FFMachineInfo | null {
        if (!detail) return null;

        try {
            const printEta = this.formatTimeFromSeconds(detail.estimatedTime || 0);
            const completionTime = new Date(Date.now() + (detail.estimatedTime || 0) * 1000);
            const formattedRunTime = this.formatTimeFromSeconds(detail.printDuration || 0);

            const totalMinutes = detail.cumulativePrintTime || 0;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const formattedTotalRunTime = `${hours}h:${minutes}m`;

            const autoShutdown = (detail.autoShutdown || '') === "open";
            const doorOpen = (detail.doorStatus || '') === "open";
            const externalFanOn = (detail.externalFanStatus || '') === "open";
            const internalFanOn = (detail.internalFanStatus || '') === "open";
            const lightsOn = (detail.lightStatus || '') === "open";

            const totalJobFilamentMeters = (detail.estimatedRightLen || 0) / 1000.0;
            const estLength = totalJobFilamentMeters * (detail.printProgress || 0);
            const estWeight = (detail.estimatedRightWeight || 0) * (detail.printProgress || 0);

            return {
                // Auto-shutdown settings
                AutoShutdown: autoShutdown,
                AutoShutdownTime: detail.autoShutdownTime || 0,

                // Camera
                CameraStreamUrl: detail.cameraStreamUrl || '',

                // Fan speeds
                ChamberFanSpeed: detail.chamberFanSpeed || 0,
                CoolingFanSpeed: detail.coolingFanSpeed || 0,
                CoolingFanLeftSpeed: detail.coolingFanLeftSpeed, // Keep as undefined if not present

                // Cumulative stats
                CumulativeFilament: detail.cumulativeFilament || 0,
                CumulativePrintTime: detail.cumulativePrintTime || 0,

                // Current print speed
                CurrentPrintSpeed: detail.currentPrintSpeed || 0,

                // Disk space
                FreeDiskSpace: (detail.remainingDiskSpace || 0).toFixed(2),

                // Door and error status
                DoorOpen: doorOpen,
                ErrorCode: detail.errorCode || '',

                // Current print estimates
                EstLength: estLength,
                EstWeight: estWeight,
                EstimatedTime: detail.estimatedTime || 0,

                // Fans & LED status
                ExternalFanOn: externalFanOn,
                InternalFanOn: internalFanOn,
                LightsOn: lightsOn,

                // Network
                IpAddress: detail.ipAddr || '',
                MacAddress: detail.macAddr || '',

                // Print settings
                FillAmount: detail.fillAmount || 0,
                FirmwareVersion: detail.firmwareVersion || '',
                Name: detail.name || '',
                IsPro: (detail.name || '').includes("Pro") && detail.name !== "AD5X", // AD5X is special
                IsAD5X: detail.name === "AD5X",
                NozzleSize: detail.nozzleModel || '',

                // Material Station Info
                HasMatlStation: detail.hasMatlStation,
                MatlStationInfo: detail.matlStationInfo, // Assign directly
                IndepMatlInfo: detail.indepMatlInfo, // Assign directly

                // Temperatures
                PrintBed: {
                    current: detail.platTemp || 0,
                    set: detail.platTargetTemp || 0
                },
                Extruder: {
                    current: detail.rightTemp || 0,
                    set: detail.rightTargetTemp || 0
                },

                // Current print stats
                PrintDuration: detail.printDuration || 0,
                PrintFileName: detail.printFileName || '',
                PrintFileThumbUrl: detail.printFileThumbUrl || '',
                CurrentPrintLayer: detail.printLayer || 0,
                PrintProgress: detail.printProgress || 0,
                PrintProgressInt: Math.floor((detail.printProgress || 0) * 100),
                PrintSpeedAdjust: detail.printSpeedAdjust || 0,
                FilamentType: detail.rightFilamentType || '',

                // Machine state
                MachineState: this.getMachineState(detail.status || ''),
                Status: detail.status || '',
                TotalPrintLayers: detail.targetPrintLayer || 0,
                Tvoc: detail.tvoc || 0,
                ZAxisCompensation: detail.zAxisCompensation || 0,

                // Cloud codes
                FlashCloudRegisterCode: detail.flashRegisterCode || '',
                PolarCloudRegisterCode: detail.polarRegisterCode || '',

                // Extras
                PrintEta: printEta,
                CompletionTime: completionTime,
                FormattedRunTime: formattedRunTime,
                FormattedTotalRunTime: formattedTotalRunTime,
            };
        } catch (error: unknown) {
            console.error("Error in MachineInfo.fromDetail:", (error as Error).message);
            console.error("Detail object causing error:", JSON.stringify(detail, null, 2)); // Log detail on error
            return null;
        }
    }

    /**
     * Formats a duration given in seconds into a "HH:MM" string format.
     *
     * @param seconds The total number of seconds to format.
     * @returns A string representing the formatted time (e.g., "02:30" for 9000 seconds).
     *          Returns "00:00" if the input is invalid or an error occurs.
     * @private
     */
    private formatTimeFromSeconds(seconds: number): string {
        try {
            const validSeconds = typeof seconds === 'number' ? seconds : 0;
            const hours = Math.floor(validSeconds / 3600);
            const minutes = Math.floor((validSeconds % 3600) / 60);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            console.error("Error formatting time:", error);
            return "00:00";
        }
    }

    /**
     * Maps a raw status string from the printer API to a `MachineState` enum value.
     * Handles various known status strings and defaults to `MachineState.Unknown` for unrecognized statuses,
     * logging a warning in such cases.
     *
     * @param status The raw status string (e.g., "ready", "printing", "error"). Case-insensitive.
     * @returns The corresponding `MachineState` enum value.
     * @private
     */
    private getMachineState(status: string): MachineState {
        const validStatus = typeof status === 'string' ? status.toLowerCase() : '';
        switch (validStatus) {
            case "ready": return MachineState.Ready;
            case "busy": return MachineState.Busy;
            case "calibrate_doing": return MachineState.Calibrating;
            case "error": return MachineState.Error;
            case "heating": return MachineState.Heating;
            case "printing": return MachineState.Printing;
            case "pausing": return MachineState.Pausing;
            case "paused": return MachineState.Paused;
            case "cancel": return MachineState.Cancelled;
            case "completed": return MachineState.Completed;
            default:
                if (validStatus) {
                    console.warn(`Unknown machine status received: '${status}'`);
                }
                return MachineState.Unknown;
        }
    }
}