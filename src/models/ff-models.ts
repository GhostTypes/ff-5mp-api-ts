// src/models/ff-models.ts
/**
 * Represents the raw detailed information about a FlashForge 3D printer as obtained from its API.
 * Properties are often in the printer's native naming format (e.g., camelCase or with underscores)
 * and may include string representations of boolean states (e.g., "open", "close").
 * This interface is typically transformed into the more user-friendly `FFMachineInfo` model.
 * All properties are optional as their presence can vary based on printer model, firmware, or current state.
 */
export interface FFPrinterDetail {
    /** Status of the auto-shutdown feature (e.g., "open" for enabled, "close" for disabled). */
    autoShutdown?: string;
    /** Configured time for auto-shutdown, often in minutes. */
    autoShutdownTime?: number;
    /** URL for accessing the printer's camera stream, if available. */
    cameraStreamUrl?: string;
    /** Current speed of the chamber fan, if applicable. */
    chamberFanSpeed?: number;
    /** Target temperature for the chamber, if applicable. */
    chamberTargetTemp?: number;
    /** Current temperature of the chamber, if applicable. */
    chamberTemp?: number;
    /** Current speed of the part cooling fan. */
    coolingFanSpeed?: number;
    /** Total filament extruded by the printer over its lifetime, typically in millimeters or meters. */
    cumulativeFilament?: number;
    /** Total print time accumulated by the printer over its lifetime, often in minutes. */
    cumulativePrintTime?: number;
    /** Current printing speed, possibly as a percentage of the base speed. */
    currentPrintSpeed?: number;
    /** Status of the printer's door (e.g., "open", "close"), if equipped with a sensor. */
    doorStatus?: string;
    /** Current error code reported by the printer, if any. */
    errorCode?: string;
    /** Estimated length of filament remaining for the left extruder for the current print job. */
    estimatedLeftLen?: number;
    /** Estimated weight of filament remaining for the left extruder for the current print job. */
    estimatedLeftWeight?: number;
    /** Estimated length of filament remaining for the right extruder (or single extruder) for the current print job. */
    estimatedRightLen?: number;
    /** Estimated weight of filament remaining for the right extruder (or single extruder) for the current print job. */
    estimatedRightWeight?: number;
    /** Estimated time remaining for the current print job, often in seconds. */
    estimatedTime?: number;
    /** Status of the external fan (e.g., "open" for on, "close" for off). */
    externalFanStatus?: string;
    /** Fill amount or density for the current print job. */
    fillAmount?: number;
    /** Firmware version of the printer. */
    firmwareVersion?: string;
    /** Registration code for FlashCloud services. */
    flashRegisterCode?: string;
    /** Status of the internal fan (e.g., "open" for on, "close" for off). */
    internalFanStatus?: string;
    /** IP address of the printer on the local network. */
    ipAddr?: string;
    /** Type of filament loaded in the left extruder (e.g., "PLA", "ABS"). */
    leftFilamentType?: string;
    /** Target temperature for the left extruder. */
    leftTargetTemp?: number;
    /** Current temperature of the left extruder. */
    leftTemp?: number;
    /** Status of the printer's LED lights (e.g., "open" for on, "close" for off). */
    lightStatus?: string;
    /** Physical location of the printer, if set. */
    location?: string;
    /** MAC address of the printer's network interface. */
    macAddr?: string;
    /** Measurement unit system (e.g., "metric"). */
    measure?: string;
    /** Name of the printer, as configured by the user. */
    name?: string;
    /** Number of nozzles the printer has. */
    nozzleCnt?: number;
    /** Model or size of the nozzle (e.g., "0.4mm"). */
    nozzleModel?: string;
    /** Style or type of the nozzle. */
    nozzleStyle?: number;
    /** Process ID, possibly related to the current print job. */
    pid?: number;
    /** Target temperature for the print bed (platform). */
    platTargetTemp?: number;
    /** Current temperature of the print bed (platform). */
    platTemp?: number;
    /** Registration code for Polar Cloud services. */
    polarRegisterCode?: string;
    /** Duration of the current print job so far, often in seconds. */
    printDuration?: number;
    /** Name of the file currently being printed. */
    printFileName?: string;
    /** URL for the thumbnail image of the currently printing file. */
    printFileThumbUrl?: string;
    /** Current layer number being printed. */
    printLayer?: number;
    /** Progress of the current print job, typically as a decimal (0.0 to 1.0) or percentage. */
    printProgress?: number;
    /** Adjustment factor for the print speed, often as a percentage. */
    printSpeedAdjust?: number;
    /** Remaining disk space on the printer's internal storage, if applicable. */
    remainingDiskSpace?: number;
    /** Type of filament loaded in the right extruder (or single extruder). */
    rightFilamentType?: string;
    /** Target temperature for the right extruder (or single extruder). */
    rightTargetTemp?: number;
    /** Current temperature of the right extruder (or single extruder). */
    rightTemp?: number;
    /** Current operational status of the printer (e.g., "ready", "printing", "error"). */
    status?: string;
    /** Total number of layers for the current print job. */
    targetPrintLayer?: number;
    /** Total Volatile Organic Compounds (TVOC) level, if measured by the printer. */
    tvoc?: number;
    /** Current Z-axis compensation value. */
    zAxisCompensation?: number;
}

/**
 * Represents a structured and user-friendly model of the printer's information and state.
 * This interface is typically populated by transforming data from `FFPrinterDetail`.
 * It uses clearer property names and boolean types for states.
 */
export interface FFMachineInfo {
    /** Indicates if auto-shutdown is enabled. */
    AutoShutdown: boolean;
    /** Configured time for auto-shutdown in minutes. */
    AutoShutdownTime: number;

    /** URL for the printer's camera stream. */
    CameraStreamUrl: string;

    /** Current speed of the chamber fan. */
    ChamberFanSpeed: number;
    /** Current speed of the part cooling fan. */
    CoolingFanSpeed: number;

    /** Total filament extruded over the printer's lifetime (unit depends on source, e.g., mm or m). */
    CumulativeFilament: number;
    /** Total print time accumulated over the printer's lifetime (often in minutes). */
    CumulativePrintTime: number;

    /** Current printing speed (interpretation depends on source, could be percentage or absolute). */
    CurrentPrintSpeed: number;

    /** Free disk space on the printer's internal storage, formatted as a string (e.g., "123.45MB"). */
    FreeDiskSpace: string;

    /** Indicates if the printer's door is open. */
    DoorOpen: boolean;
    /** Current error code, if any. */
    ErrorCode: string;

    /** Estimated filament length used for the current print job so far (typically in meters). */
    EstLength: number;
    /** Estimated filament weight used for the current print job so far (typically in grams). */
    EstWeight: number;
    /** Estimated time remaining for the current print job (often in seconds). */
    EstimatedTime: number;

    /** Indicates if the external fan is on. */
    ExternalFanOn: boolean;
    /** Indicates if the internal fan is on. */
    InternalFanOn: boolean;
    /** Indicates if the printer's LED lights are on. */
    LightsOn: boolean;

    /** IP address of the printer. */
    IpAddress: string;
    /** MAC address of the printer. */
    MacAddress: string;

    /** Fill amount or density for the current print job. */
    FillAmount: number;
    /** Firmware version of the printer. */
    FirmwareVersion: string;
    /** User-configured name of the printer. */
    Name: string;
    /** Indicates if the printer model is a "Pro" version. */
    IsPro: boolean;
    /** Nozzle size (e.g., "0.4mm"). */
    NozzleSize: string;

    /** Current and target temperatures for the print bed. See {@link Temperature}. */
    PrintBed: Temperature;
    /** Current and target temperatures for the extruder. See {@link Temperature}. */
    Extruder: Temperature;

    /** Duration of the current print job so far (often in seconds). */
    PrintDuration: number;
    /** Name of the file currently being printed. */
    PrintFileName: string;
    /** URL for the thumbnail of the file currently being printed. */
    PrintFileThumbUrl: string;
    /** Current layer number being printed. */
    CurrentPrintLayer: number;
    /** Progress of the current print job (0.0 to 1.0). */
    PrintProgress: number;
    /** Integer representation of print progress (0 to 100). */
    PrintProgressInt: number;
    /** Print speed adjustment factor (often a percentage). */
    PrintSpeedAdjust: number;
    /** Type of filament currently loaded/printing (e.g., "PLA"). */
    FilamentType: string;

    /** Current state of the machine. See {@link MachineState}. */
    MachineState: MachineState;
    /** Raw status string from the printer. */
    Status: string;
    /** Total number of layers for the current print job. */
    TotalPrintLayers: number;
    /** TVOC (Total Volatile Organic Compounds) level, if available. */
    Tvoc: number;
    /** Current Z-axis compensation value. */
    ZAxisCompensation: number;

    /** Registration code for FlashCloud services. */
    FlashCloudRegisterCode: string;
    /** Registration code for Polar Cloud services. */
    PolarCloudRegisterCode: string;

    /** Estimated time of arrival for the current print, formatted as a string (e.g., "HH:MM"). */
    PrintEta: string;
    /** Calculated completion time of the current print as a Date object. */
    CompletionTime: Date;
    /** Formatted string of the current print job's duration (e.g., "HH:MM"). */
    FormattedRunTime: string;
    /** Formatted string of the printer's total accumulated run time (e.g., "Xh:Ym"). */
    FormattedTotalRunTime: string;
}

/**
 * Represents a pair of current and target temperatures for a component like an extruder or print bed.
 */
export interface Temperature {
    /** The current temperature in Celsius. */
    current: number;
    /** The target (set) temperature in Celsius. */
    set: number;
}

/**
 * Enumerates the possible operational states of the FlashForge 3D printer.
 */
export enum MachineState {
    /** Printer is ready for a new command or job. */
    Ready,
    /** Printer is busy with an operation (general busy state). */
    Busy,
    /** Printer is currently performing a calibration routine. */
    Calibrating,
    /** Printer has encountered an error. Check `ErrorCode` in `FFMachineInfo`. */
    Error,
    /** Printer is heating a component (extruder or bed). */
    Heating,
    /** Printer is actively printing. */
    Printing,
    /** Printer is in the process of pausing a print job. */
    Pausing,
    /** Printer's print job is currently paused. */
    Paused,
    /** Printer's print job has been cancelled. */
    Cancelled,
    /** Printer has successfully completed a print job. */
    Completed,
    /** Printer state is unknown or cannot be determined. */
    Unknown
}