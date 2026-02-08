/**
 * @fileoverview Public API entry point exporting all library modules for FlashForge printer control.
 */
// src/index.ts
// Main client
export { FiveMClient, Product } from './FiveMClient';

// API Controls
export { Control, FiltrationArgs, GenericResponse } from './api/controls/Control';
export { JobControl } from './api/controls/JobControl';
export { Info, DetailResponse } from './api/controls/Info';
export { Files } from './api/controls/Files';
export { TempControl } from './api/controls/TempControl';

// Models
export {
    FFPrinterDetail,
    FFMachineInfo,
    Temperature as TemperatureInterface,
    MachineState,
    FFGcodeFileEntry,
    FFGcodeToolData,
    AD5XMaterialMapping,
    AD5XLocalJobParams,
    AD5XSingleColorJobParams,
    AD5XUploadParams,
    MatlStationInfo,
    SlotInfo
} from './models/ff-models';

// Filament
export { Filament } from './api/filament/Filament';

// Network Utilities
export { FNetCode } from './api/network/FNetCode';
export { NetworkUtils } from './api/network/NetworkUtils';

// Server constants
export { Commands } from './api/server/Commands';
export { Endpoints } from './api/server/Endpoints';

// TCP API
export { FlashForgeClient } from './tcpapi/FlashForgeClient';
export { FlashForgeTcpClient } from './tcpapi/FlashForgeTcpClient';
export { GCodeController } from './tcpapi/client/GCodeController';
export { GCodes } from './tcpapi/client/GCodes';

// Replays
export {
    EndstopStatus,
    Status,
    Endstop,
    MachineStatus,
    MoveMode
} from './tcpapi/replays/EndstopStatus';
export { LocationInfo } from './tcpapi/replays/LocationInfo';
export { PrinterInfo } from './tcpapi/replays/PrinterInfo';
export { PrintStatus } from './tcpapi/replays/PrintStatus';
export { TempInfo, TempData } from './tcpapi/replays/TempInfo';
export { ThumbnailInfo } from './tcpapi/replays/ThumbnailInfo';

// Misc
export { formatScientificNotation } from './api/misc/ScientificNotationFloatConverter';

export { FlashForgePrinter, FlashForgePrinterDiscovery } from './api/PrinterDiscovery';