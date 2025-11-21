# Models and Interfaces

This document details the TypeScript interfaces and types used throughout the API. These models represent the state, configuration, and data structures exchanged with the printer.

## Core Data Models

### FFMachineInfo

The primary interface representing the comprehensive state of a printer.

| Property | Type | Description |
|----------|------|-------------|
| `Name` | `string` | The user-defined name of the printer. |
| `IpAddress` | `string` | IP address of the printer. |
| `MacAddress` | `string` | MAC address of the printer. |
| `FirmwareVersion` | `string` | Current firmware version. |
| `IsPro` | `boolean` | Indicates if the printer is a "Pro" model. |
| `IsAD5X` | `boolean` | Indicates if the printer is an AD5X model. |
| `MachineState` | `MachineState` | Enum representing the current operational state. |
| `Status` | `string` | Raw status string (e.g., "ready", "printing"). |
| `Extruder` | `Temperature` | Current and target temperatures for the extruder. |
| `PrintBed` | `Temperature` | Current and target temperatures for the print bed. |
| `PrintProgress` | `number` | Progress of current print (0.0 - 1.0). |
| `PrintEta` | `string` | Estimated time of arrival for print completion (HH:MM). |
| `FormattedRunTime` | `string` | Duration of the current print job. |

### Temperature

Represents temperature readings.

```typescript
interface Temperature {
    current: number; // Current temperature in Celsius
    set: number;     // Target temperature in Celsius
}
```

### MachineState (Enum)

Enumerates possible printer states.

```typescript
enum MachineState {
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
```

## AD5X Specific Models

These models are used specifically for features available on the Adventurer 5X, such as the Intelligent Filament Station (IFS) and multi-material printing.

### AD5XUploadParams

Parameters for uploading files to an AD5X printer.

| Property | Type | Description |
|----------|------|-------------|
| `filePath` | `string` | Local path to the file. |
| `startPrint` | `boolean` | Start printing immediately after upload. |
| `levelingBeforePrint` | `boolean` | Perform bed leveling before printing. |
| `flowCalibration` | `boolean` | Enable flow calibration. |
| `firstLayerInspection` | `boolean` | Enable first layer inspection. |
| `materialMappings` | `AD5XMaterialMapping[]` | Array of material mappings for multi-color prints. |

### AD5XMaterialMapping

Maps a print tool (extruder) to a specific slot in the material station.

```typescript
interface AD5XMaterialMapping {
    toolId: number;            // 0-based tool ID (0-3)
    slotId: number;            // 1-based slot ID (1-4)
    materialName: string;      // e.g., "PLA"
    toolMaterialColor: string; // Hex color for the tool
    slotMaterialColor: string; // Hex color for the slot
}
```

### MatlStationInfo

Information about the material station status.

| Property | Type | Description |
|----------|------|-------------|
| `currentSlot` | `number` | The currently active slot ID. |
| `slotInfos` | `SlotInfo[]` | Array containing details for each slot. |

### SlotInfo

Details for a single material slot.

```typescript
interface SlotInfo {
    hasFilament: boolean;
    materialColor: string;
    materialName: string;
    slotId: number;
}
```

## File Management Models

### FFGcodeFileEntry

Represents a file on the printer.

```typescript
interface FFGcodeFileEntry {
    gcodeFileName: string;
    printingTime: number;        // Estimated print time in seconds
    gcodeToolDatas?: FFGcodeToolData[]; // Detailed tool/material info (AD5X)
    totalFilamentWeight?: number;
}
```

### FFGcodeToolData

Material usage data for a specific tool in a G-code file.

```typescript
interface FFGcodeToolData {
    toolId: number;
    filamentWeight: number;
    materialName: string;
    materialColor: string;
    slotId: number;
}
```
