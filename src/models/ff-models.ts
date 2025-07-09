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
    /** Current speed of the part cooling fan (right fan for dual setups, or main fan). */
    coolingFanSpeed?: number;
    /** Current speed of the left part cooling fan (for dual setups like AD5X). */
    coolingFanLeftSpeed?: number;
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
    /** Indicates if the printer has a material station (e.g., for AD5X). */
    hasMatlStation?: boolean;
    /** Detailed information about the material station, if present. */
    matlStationInfo?: MatlStationInfo;
    /** Information about independent material loading (e.g., for AD5X single extruder with material station). */
    indepMatlInfo?: IndepMatlInfo;
    /** Indicates if filament is present in the left extruder/path. */
    hasLeftFilament?: boolean;
    /** Indicates if filament is present in the right extruder/path. */
    hasRightFilament?: boolean;
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
 * Information about a single slot in the material station.
 */
export interface SlotInfo {
    /** Indicates if filament is present in this slot. */
    hasFilament: boolean;
    /** Color of the material in this slot (e.g., "#FFFFFF"). */
    materialColor: string;
    /** Name of the material in this slot (e.g., "PLA"). */
    materialName: string;
    /** Identifier for this slot. */
    slotId: number;
}

/**
 * Detailed information about the material station.
 */
export interface MatlStationInfo {
    /** Currently loading slot ID (0 if none). */
    currentLoadSlot: number;
    /** Currently active/printing slot ID (0 if none). */
    currentSlot: number;
    /** Total number of slots in the station. */
    slotCnt: number;
    /** Array of information for each slot. */
    slotInfos: SlotInfo[];
    /** Current action state of the material station. */
    stateAction: number;
    /** Current step within the state action. */
    stateStep: number;
}

/**
 * Information related to independent material loading,
 * often used when a single extruder printer has a material station.
 */
export interface IndepMatlInfo {
    /** Color of the material. */
    materialColor: string;
    /** Name of the material (can be "?" if unknown). */
    materialName: string;
    /** Current action state. */
    stateAction: number;
    /** Current step within the state action. */
    stateStep: number;
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
    /** Current speed of the part cooling fan (right or main). */
    CoolingFanSpeed: number;
    /** Current speed of the left part cooling fan (if applicable). */
    CoolingFanLeftSpeed?: number;

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
    /** Indicates if the printer is an AD5X model. */
    IsAD5X: boolean;
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

    /** Indicates if the printer has a material station. */
    HasMatlStation?: boolean;
    /** Detailed information about the material station, if present. */
    MatlStationInfo?: MatlStationInfo; // Using the raw type directly for now
    /** Information about independent material loading. */
    IndepMatlInfo?: IndepMatlInfo; // Using the raw type directly for now
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

// --- Interfaces for Gcode List Entries (AD5X and similar) ---

/**
 * Represents data for a single tool/material used in a G-code file,
 * typically part of a multi-material print.
 */
export interface FFGcodeToolData {
    /** Calculated filament weight for this tool/material in the print. */
    filamentWeight: number;
    /** Material color hex string (e.g., "#FFFF00"). */
    materialColor: string;
    /** Name of the material (e.g., "PLA"). */
    materialName: string;
    /** Slot ID from the material station, if applicable (0 if not or direct). */
    slotId: number;
    /** Tool ID or extruder number. */
    toolId: number;
}

/**
 * Represents a single G-code file entry as returned by the /gcodeList endpoint,
 * especially for printers like AD5X that provide detailed material info.
 */
export interface FFGcodeFileEntry {
    /** The name of the G-code file (e.g., "FISH_PLA.3mf"). */
    gcodeFileName: string;
    /** Number of tools/materials used in this G-code file. */
    gcodeToolCnt?: number;
    /** Array of detailed information for each tool/material. */
    gcodeToolDatas?: FFGcodeToolData[];
    /** Estimated printing time in seconds. */
    printingTime: number; // Assuming this is seconds, as is common
    /** Total estimated filament weight for the print. */
    totalFilamentWeight?: number;
    /** Indicates if the G-code file is intended for use with a material station. */
    useMatlStation?: boolean;
    // Potentially other fields might exist for non-AD5X printers in a simpler format
    // For now, focusing on AD5X structure.
}