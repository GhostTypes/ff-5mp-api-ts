// src/models/ff-models.ts
export interface FFPrinterDetail {
    autoShutdown?: string; // Use optional modifier (?) if properties might be missing
    autoShutdownTime?: number;
    cameraStreamUrl?: string;
    chamberFanSpeed?: number;
    chamberTargetTemp?: number;
    chamberTemp?: number;
    coolingFanSpeed?: number;
    cumulativeFilament?: number;
    cumulativePrintTime?: number;
    currentPrintSpeed?: number;
    doorStatus?: string;
    errorCode?: string;
    estimatedLeftLen?: number;
    estimatedLeftWeight?: number;
    estimatedRightLen?: number;
    estimatedRightWeight?: number;
    estimatedTime?: number;
    externalFanStatus?: string;
    fillAmount?: number;
    firmwareVersion?: string;
    flashRegisterCode?: string;
    internalFanStatus?: string;
    ipAddr?: string;
    leftFilamentType?: string;
    leftTargetTemp?: number;
    leftTemp?: number;
    lightStatus?: string;
    location?: string;
    macAddr?: string;
    measure?: string;
    name?: string;
    nozzleCnt?: number;
    nozzleModel?: string;
    nozzleStyle?: number;
    pid?: number;
    platTargetTemp?: number;
    platTemp?: number;
    polarRegisterCode?: string;
    printDuration?: number;
    printFileName?: string;
    printFileThumbUrl?: string;
    printLayer?: number;
    printProgress?: number;
    printSpeedAdjust?: number;
    remainingDiskSpace?: number;
    rightFilamentType?: string;
    rightTargetTemp?: number;
    rightTemp?: number;
    status?: string;
    targetPrintLayer?: number;
    tvoc?: number;
    zAxisCompensation?: number;
}

export interface FFMachineInfo {
    // Auto shutdown settings
    AutoShutdown: boolean;
    AutoShutdownTime: number;

    // Camera
    CameraStreamUrl: string;

    // Fan speeds
    ChamberFanSpeed: number;
    CoolingFanSpeed: number;

    // Cumulative stats
    CumulativeFilament: number;
    CumulativePrintTime: number;

    // Current print speed
    CurrentPrintSpeed: number;

    // Disk space
    FreeDiskSpace: string;

    // Door and error status
    DoorOpen: boolean;
    ErrorCode: string;

    // Current print estimates
    EstLength: number;
    EstWeight: number;
    EstimatedTime: number;

    // Fans & LED Status
    ExternalFanOn: boolean;
    InternalFanOn: boolean;
    LightsOn: boolean;

    // Network
    IpAddress: string;
    MacAddress: string;

    // Print settings
    FillAmount: number;
    FirmwareVersion: string;
    Name: string;
    IsPro: boolean;
    NozzleSize: string;

    // Temperatures
    PrintBed: Temperature;
    Extruder: Temperature;

    // Current print stats
    PrintDuration: number;
    PrintFileName: string;
    PrintFileThumbUrl: string;
    CurrentPrintLayer: number;
    PrintProgress: number;
    PrintProgressInt: number;
    PrintSpeedAdjust: number;
    FilamentType: string;

    // Machine state
    MachineState: MachineState;
    Status: string;
    TotalPrintLayers: number;
    Tvoc: number;
    ZAxisCompensation: number;

    // Cloud codes
    FlashCloudRegisterCode: string;
    PolarCloudRegisterCode: string;

    // Extras
    PrintEta: string;
    CompletionTime: Date;
    FormattedRunTime: string;
    FormattedTotalRunTime: string;
}

// Supporting types
export interface Temperature {
    current: number;
    set: number;
}

export enum MachineState {
    Ready,
    Busy,
    Calibrating,
    Error,
    Heating,
    Printing,
    Pausing,
    Paused,
    Cancelled,
    Completed,
    Unknown
}