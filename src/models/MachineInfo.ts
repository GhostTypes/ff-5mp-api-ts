// src/api/models/MachineInfo.ts
import { FFPrinterDetail, FFMachineInfo, MachineState, Temperature } from './ff-models';

export class MachineInfo {
    // Converts printer details from API response format to our internal model
    public fromDetail(detail: FFPrinterDetail | null): FFMachineInfo | null {
        if (!detail) return null;

        try {
            // Read camelCase from 'detail', assign to PascalCase in the result object
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
            const filamentUsedSoFarMeters = totalJobFilamentMeters * (detail.printProgress || 0);
            const estLength = filamentUsedSoFarMeters;
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
                IsPro: (detail.name || '').includes("Pro"),
                NozzleSize: detail.nozzleModel || '',

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

    // Remaining code is unchanged
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