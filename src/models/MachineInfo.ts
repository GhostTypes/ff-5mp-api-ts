// src/api/models/MachineInfo.ts
import { FFPrinterDetail, FFMachineInfo, MachineState, Temperature } from './ff-models';

export class MachineInfo {
    // Input 'detail' will now correctly be typed with camelCase keys
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
                // Target object (FFMachineInfo) uses PascalCase
                AutoShutdown: autoShutdown,
                AutoShutdownTime: detail.autoShutdownTime || 0, // Read camelCase source

                CameraStreamUrl: detail.cameraStreamUrl || '', // Read camelCase source

                ChamberFanSpeed: detail.chamberFanSpeed || 0, // Read camelCase source
                CoolingFanSpeed: detail.coolingFanSpeed || 0, // Read camelCase source

                CumulativeFilament: detail.cumulativeFilament || 0, // Read camelCase source
                CumulativePrintTime: detail.cumulativePrintTime || 0, // Read camelCase source

                CurrentPrintSpeed: detail.currentPrintSpeed || 0, // Read camelCase source

                FreeDiskSpace: (detail.remainingDiskSpace || 0).toFixed(2), // Read camelCase source

                DoorOpen: doorOpen,
                ErrorCode: detail.errorCode || '', // Read camelCase source

                EstLength: estLength,
                EstWeight: estWeight,
                EstimatedTime: detail.estimatedTime || 0, // Read camelCase source

                ExternalFanOn: externalFanOn,
                InternalFanOn: internalFanOn,
                LightsOn: lightsOn,

                IpAddress: detail.ipAddr || '', // Read camelCase source
                MacAddress: detail.macAddr || '', // Read camelCase source

                FillAmount: detail.fillAmount || 0, // Read camelCase source
                FirmwareVersion: detail.firmwareVersion || '', // Read camelCase source
                Name: detail.name || '', // Read camelCase source
                IsPro: (detail.name || '').includes("Pro"), // Read camelCase source
                NozzleSize: detail.nozzleModel || '', // Read camelCase source

                PrintBed: {
                    current: detail.platTemp || 0,
                    set: detail.platTargetTemp || 0
                },
                Extruder: {
                    current: detail.rightTemp || 0,
                    set: detail.rightTargetTemp || 0
                },

                PrintDuration: detail.printDuration || 0, // Read camelCase source
                PrintFileName: detail.printFileName || '', // Read camelCase source
                PrintFileThumbUrl: detail.printFileThumbUrl || '', // Read camelCase source
                CurrentPrintLayer: detail.printLayer || 0, // Read camelCase source
                PrintProgress: detail.printProgress || 0, // Read camelCase source
                PrintProgressInt: Math.floor((detail.printProgress || 0) * 100), // Read camelCase source
                PrintSpeedAdjust: detail.printSpeedAdjust || 0, // Read camelCase source
                FilamentType: detail.rightFilamentType || '', // Read camelCase source

                MachineState: this.getMachineState(detail.status || ''), // Read camelCase source
                Status: detail.status || '', // Read camelCase source
                TotalPrintLayers: detail.targetPrintLayer || 0, // Read camelCase source
                Tvoc: detail.tvoc || 0, // Read camelCase source
                ZAxisCompensation: detail.zAxisCompensation || 0, // Read camelCase source

                FlashCloudRegisterCode: detail.flashRegisterCode || '', // Read camelCase source
                PolarCloudRegisterCode: detail.polarRegisterCode || '', // Read camelCase source

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

    // formatTimeFromSeconds and getMachineState remain the same as in the previous correct suggestion
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