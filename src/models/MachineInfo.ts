/**
 * @fileoverview Transforms raw printer detail data from the API into structured machine info.
 */
import { type FFMachineInfo, type FFPrinterDetail, MachineState } from './ff-models';

// Firmware-reported PIDs from FlashForge's /detail endpoint. These are stable
// identifiers set by firmware, unlike the user-mutable `name` field.
const PID_5M = 35;
const PID_5M_PRO = 36;
const PID_AD5X = 38;
const PID_CREATOR5 = 40;
const PID_CREATOR5_PRO = 41;
const KNOWN_HTTP_PIDS = new Set<number>([
  PID_5M,
  PID_5M_PRO,
  PID_AD5X,
  PID_CREATOR5,
  PID_CREATOR5_PRO,
]);

// Immutable model display names keyed by firmware PID. Used as a fallback for
// `Model` when the printer doesn't report the `model` field (older firmware).
const PID_MODEL_NAMES: Record<number, string> = {
  [PID_5M]: 'Adventurer 5M',
  [PID_5M_PRO]: 'Adventurer 5M Pro',
  [PID_AD5X]: 'AD5X',
  [PID_CREATOR5]: 'Creator 5',
  [PID_CREATOR5_PRO]: 'Creator 5 Pro',
};

// The one state in which the firmware actually counts `estimatedTime` down.
// Outside it the field freezes at its last value while the wall clock keeps
// moving, so `Date.now() + estimatedTime` walks forward one minute per minute
// rather than holding still - a paused print appears to recede forever. The
// duration stays correct throughout; only its conversion to an absolute
// timestamp is invalid, which is why `PrintEta` is ungated and `CompletionTime`
// is not.
//
// Heating is deliberately excluded. The pre-print warmup does not advance the
// job either, so the same drift applies - it just lasts minutes rather than
// hours, which is why it is easy to miss.
const ADVANCING_STATES: ReadonlySet<MachineState> = new Set([MachineState.Printing]);

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
      const hasMaterialStation =
        detail.hasMatlStation === true ||
        (detail.matlStationInfo?.slotCnt ?? 0) > 0 ||
        (detail.matlStationInfo?.slotInfos?.length ?? 0) > 0;
      const pid = detail.pid;
      let isAD5X: boolean;
      let isPro: boolean;
      let isCreator5: boolean;
      let isCreator5Pro: boolean;
      if (pid !== undefined && KNOWN_HTTP_PIDS.has(pid)) {
        isAD5X = pid === PID_AD5X;
        isPro = pid === PID_5M_PRO;
        isCreator5 = pid === PID_CREATOR5 || pid === PID_CREATOR5_PRO;
        isCreator5Pro = pid === PID_CREATOR5_PRO;
      } else {
        // Fallback for firmware that doesn't report pid: legacy
        // name+capability heuristic. Vulnerable to user renames, which
        // is why pid-based detection is preferred when available.
        isAD5X = detail.name === 'AD5X' || hasMaterialStation;
        isPro = (detail.name || '').includes('Pro') && !isAD5X;
        isCreator5 = (detail.name || '').includes('Creator 5');
        // `model` is the immutable factory name; prefer it over the user-mutable
        // `name` when distinguishing the Pro variant without a pid.
        isCreator5Pro = isCreator5 && /Creator 5 Pro/i.test(detail.model || detail.name || '');
      }

      // Per-tool temperatures. Creator 5 series report `nozzleTemps[]` /
      // `nozzleTargetTemps[]`; single-nozzle models don't, so fall back to a
      // 1-element array mirroring the right/main extruder.
      const nozzleTemps = detail.nozzleTemps;
      const nozzleTargetTemps = detail.nozzleTargetTemps;
      let toolTemps: { current: number; set: number }[];
      if (Array.isArray(nozzleTemps) && nozzleTemps.length > 0) {
        toolTemps = nozzleTemps.map((t, i) => ({
          current: t || 0,
          set: nozzleTargetTemps?.[i] || 0,
        }));
      } else {
        toolTemps = [{ current: detail.rightTemp || 0, set: detail.rightTargetTemp || 0 }];
      }

      // Capability flags. Derived from presence/value, never assumed from the
      // model family alone. See creator5-capabilities: only the Creator 5 Pro
      // has a confirmed door sensor; on every other model `doorStatus` is cosmetic.
      const hasCamera = detail.camera === 1 || (detail.cameraStreamUrl || '') !== '';
      const hasLidar = detail.lidar === 1;
      const hasDoorSensor = isCreator5Pro;
      const model =
        detail.model || (pid !== undefined ? PID_MODEL_NAMES[pid] : undefined) || detail.name || '';
      const printEta = this.formatTimeFromSeconds(detail.estimatedTime || 0);
      const machineState = this.getMachineState(detail.status || '');
      const completionTime = ADVANCING_STATES.has(machineState)
        ? new Date(Date.now() + (detail.estimatedTime || 0) * 1000)
        : null;
      const formattedRunTime = this.formatTimeFromSeconds(detail.printDuration || 0);

      const totalMinutes = detail.cumulativePrintTime || 0;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedTotalRunTime = `${hours}h:${minutes}m`;

      const autoShutdown = (detail.autoShutdown || '') === 'open';
      const doorOpen = (detail.doorStatus || '') === 'open';
      const externalFanOn = (detail.externalFanStatus || '') === 'open';
      const internalFanOn = (detail.internalFanStatus || '') === 'open';
      const lightsOn = (detail.lightStatus || '') === 'open';

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
        Pid: pid,
        IsPro: isPro,
        IsAD5X: isAD5X,
        IsCreator5: isCreator5,
        IsCreator5Pro: isCreator5Pro,
        Model: model,
        NozzleSize: detail.nozzleModel || '',
        // Prefer the firmware-reported count; fall back to the parsed per-tool
        // array length so single-nozzle models still report 1.
        NozzleCount: detail.nozzleCnt || toolTemps.length,

        // Capabilities (presence-derived)
        HasCamera: hasCamera,
        HasLidar: hasLidar,
        HasDoorSensor: hasDoorSensor,

        // Material Station Info. The DERIVED value, not detail.hasMatlStation:
        // that field is AD5X-only and the Creator 5 series omits it entirely
        // even with four loaded slots, so the raw value is undefined on exactly
        // the models that have a station.
        HasMatlStation: hasMaterialStation,
        MatlStationInfo: detail.matlStationInfo, // Assign directly
        IndepMatlInfo: detail.indepMatlInfo, // Assign directly

        // Temperatures
        PrintBed: {
          current: detail.platTemp || 0,
          set: detail.platTargetTemp || 0,
        },
        Chamber: {
          current: detail.chamberTemp || 0,
          set: detail.chamberTargetTemp || 0,
        },
        Extruder: {
          current: detail.rightTemp || 0,
          set: detail.rightTargetTemp || 0,
        },
        ToolTemps: toolTemps,

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
        MachineState: machineState,
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
      console.error('Error in MachineInfo.fromDetail:', (error as Error).message);
      console.error('Detail object causing error:', JSON.stringify(detail, null, 2)); // Log detail on error
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
      console.error('Error formatting time:', error);
      return '00:00';
    }
  }

  /**
   * Maps a raw status string from the printer API to a `MachineState` enum value.
   * Handles various known status strings and defaults to `MachineState.Unknown` for unrecognized statuses,
   * logging a warning in such cases.
   *
   * An unmapped value costs the consumer everything the field is for: it becomes
   * `Unknown`, which surfaces as a blank or meaningless state at the moment the
   * user most needs to know what the printer is doing. Both `pause` and
   * `downloading` below were found exactly that way.
   *
   * Consumers may map this enum onto a fixed set of values, so a *new* member is
   * a breaking change for them while mapping onto an existing one is not. Prefer
   * the closest existing state unless a new one is worth coordinating.
   *
   * @param status The raw status string (e.g., "ready", "printing", "error"). Case-insensitive.
   * @returns The corresponding `MachineState` enum value.
   * @private
   */
  private getMachineState(status: string): MachineState {
    const validStatus = typeof status === 'string' ? status.toLowerCase() : '';
    switch (validStatus) {
      case 'ready':
        return MachineState.Ready;
      case 'busy':
        return MachineState.Busy;
      case 'calibrate_doing':
        return MachineState.Calibrating;
      case 'error':
        return MachineState.Error;
      case 'heating':
        return MachineState.Heating;
      case 'printing':
        return MachineState.Printing;
      case 'pausing':
        return MachineState.Pausing;
      // The Creator 5 Pro reports "pause" for a print that is paused, where the
      // documented value is "paused" - both are mapped, because firmware that
      // reports one is not a reason to drop the other. Observed on pid 41,
      // firmware 1.9.4, whenever the printer paused itself on a detected clog.
      case 'pause':
        return MachineState.Paused;
      case 'paused':
        return MachineState.Paused;
      case 'cancel':
        return MachineState.Cancelled;
      case 'completed':
        return MachineState.Completed;
      // Reported while a file is being transferred to the printer. Not a print,
      // but not idle either, so Busy is the honest existing fit; a dedicated
      // state would need consumers to add it to their option lists first.
      case 'downloading':
        return MachineState.Busy;
      default:
        if (validStatus) {
          console.warn(`Unknown machine status received: '${status}'`);
        }
        return MachineState.Unknown;
    }
  }
}
