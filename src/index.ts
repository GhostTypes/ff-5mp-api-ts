/**
 * @fileoverview Public API entry point exporting all library modules for FlashForge printer control.
 */
// src/index.ts
// Main client

// API Controls
export { Control, FiltrationArgs, GenericResponse } from './api/controls/Control';
export { Files } from './api/controls/Files';
export { DetailResponse, Info } from './api/controls/Info';
export { JobControl } from './api/controls/JobControl';
export { TempControl } from './api/controls/TempControl';
// Filament
export { Filament } from './api/filament/Filament';
// Misc
export { formatScientificNotation } from './api/misc/ScientificNotationFloatConverter';
// Network Utilities
export { FNetCode } from './api/network/FNetCode';
export { NetworkUtils } from './api/network/NetworkUtils';

// Printer Discovery
export { PrinterDiscovery } from './api/PrinterDiscovery';
export {
    PrinterModel,
    DiscoveryProtocol,
    PrinterStatus,
    type DiscoveredPrinter,
    type DiscoveryOptions,
} from './models/PrinterDiscovery';

// Server constants
export { Commands } from './api/server/Commands';
export { Endpoints } from './api/server/Endpoints';
export { FiveMClient, type FiveMClientConnectionOptions, Product } from './FiveMClient';
// Models
export {
  AD5XLocalJobParams,
  AD5XMaterialMapping,
  AD5XSingleColorJobParams,
  AD5XUploadParams,
  FFGcodeFileEntry,
  FFGcodeToolData,
  FFMachineInfo,
  FFPrinterDetail,
  MachineState,
  MatlStationInfo,
  SlotInfo,
  Temperature as TemperatureInterface,
} from './models/ff-models';
export { GCodeController } from './tcpapi/client/GCodeController';
export type { GCodeClientCapabilities } from './tcpapi/client/GCodeClientCapabilities';
export { GCodes } from './tcpapi/client/GCodes';
export { A3GCodeController } from './tcpapi/client/A3GCodeController';
// TCP API
export { FlashForgeClient } from './tcpapi/FlashForgeClient';
export { FlashForgeTcpClient, type FlashForgeTcpClientOptions } from './tcpapi/FlashForgeTcpClient';
export {
  FlashForgeA4Client,
  type A4BuildVolume,
  type A4FileEntry,
  type A4PrinterInfo,
  type A4PrinterVariant,
} from './tcpapi/FlashForgeA4Client';
export {
  FlashForgeA3Client,
  type A3BuildVolume,
  type A3FileEntry,
  type A3PrinterInfo,
  type A3Thumbnail,
} from './tcpapi/FlashForgeA3Client';
// Replays
export {
  Endstop,
  EndstopStatus,
  MachineStatus,
  MoveMode,
  Status,
} from './tcpapi/replays/EndstopStatus';
export { LocationInfo } from './tcpapi/replays/LocationInfo';
export { PrinterInfo } from './tcpapi/replays/PrinterInfo';
export { PrintStatus } from './tcpapi/replays/PrintStatus';
export { TempData, TempInfo } from './tcpapi/replays/TempInfo';
export { ThumbnailInfo } from './tcpapi/replays/ThumbnailInfo';
